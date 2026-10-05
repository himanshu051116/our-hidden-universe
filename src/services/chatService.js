import {
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { db, firebaseEnabled, storage } from './firebase';
import { decryptMessage, encryptMessage } from './encryption';

export const CHAT_LIMITS = {
  maxMessageLength: 2000,
  maxUploadBytes: 10 * 1024 * 1024,
};

const TYPING_STALE_MS = 2600;
const localSentAt = new Map();

const pathFor = (coupleId, segment) => collection(db, 'couples', coupleId, segment);
const messageRefFor = (coupleId, messageId) => doc(db, 'couples', coupleId, 'messages', messageId);

function withTimeout(promise, milliseconds, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), milliseconds);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function millis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function fingerprintForEncryptedMessage(encrypted = {}) {
  const cipher = encrypted.cipherText || '';
  const iv = encrypted.iv || '';
  const salt = encrypted.salt || '';
  const integrity = encrypted.integrity || '';
  return `${cipher.length}:${iv.length}:${salt.length}:${integrity.length}:${integrity}:${iv}`;
}

async function hydrateMessage(messageDoc, sharedSecret, decryptedCache) {
  const data = messageDoc.data();
  const clientCreatedAt = localSentAt.get(data.clientNonce) || 0;
  if (data.createdAt && data.clientNonce) localSentAt.delete(data.clientNonce);

  const base = {
    id: messageDoc.id,
    ...data,
    _pendingWrite: messageDoc.metadata.hasPendingWrites,
    _clientCreatedAt: clientCreatedAt,
  };

  if (data.type && data.type !== 'text') return base;

  const encrypted = data.encrypted || {};
  const fingerprint = fingerprintForEncryptedMessage(encrypted);
  const cached = decryptedCache.get(messageDoc.id);
  if (cached && cached.fingerprint === fingerprint) {
    return { ...base, text: cached.text };
  }

  try {
    if (!data.encrypted) return { ...base, text: data.text || '' };
    const text = await decryptMessage(data.encrypted, sharedSecret);
    decryptedCache.set(messageDoc.id, { fingerprint, text });
    return { ...base, text };
  } catch {
    return { ...base, text: 'Unable to decrypt message.' };
  }
}

export function subscribeToEncryptedMessages(coupleId, sharedSecret, onMessages, onError) {
  if (!firebaseEnabled || !coupleId) return () => {};

  const decryptedCache = new Map();
  const messageCache = new Map();
  let processing = Promise.resolve();
  let closed = false;

  const q = query(pathFor(coupleId, 'messages'), orderBy('createdAt', 'asc'));
  const unsubscribe = onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      processing = processing
        .then(async () => {
          if (closed) return;

          const changes = snapshot.docChanges({ includeMetadataChanges: true });
          for (const change of changes) {
            const id = change.doc.id;
            if (change.type === 'removed') {
              messageCache.delete(id);
              decryptedCache.delete(id);
              continue;
            }
            const hydrated = await hydrateMessage(change.doc, sharedSecret, decryptedCache);
            messageCache.set(id, hydrated);
          }

          const activeIds = new Set(snapshot.docs.map((item) => item.id));
          for (const id of messageCache.keys()) {
            if (!activeIds.has(id)) {
              messageCache.delete(id);
              decryptedCache.delete(id);
            }
          }

          const ordered = snapshot.docs
            .map((item) => messageCache.get(item.id))
            .filter(Boolean);

          onMessages(ordered, {
            fromCache: snapshot.metadata.fromCache,
            hasPendingWrites: snapshot.metadata.hasPendingWrites,
            receivedAt: Date.now(),
          });
        })
        .catch((error) => onError?.(error));
    },
    (error) => onError?.(error),
  );

  return () => {
    closed = true;
    unsubscribe();
  };
}

export async function sendEncryptedMessage({
  coupleId,
  sharedSecret,
  senderId,
  text,
  selfDestructAt = null,
  clientNonce = crypto.randomUUID(),
}) {
  if (!firebaseEnabled) return null;

  const content = String(text || '').trim();
  if (!content) throw new Error('Message cannot be empty.');
  if (content.length > CHAT_LIMITS.maxMessageLength) {
    throw new Error(`Message is too long. Max ${CHAT_LIMITS.maxMessageLength} characters.`);
  }

  localSentAt.set(clientNonce, Date.now());

  try {
    const payload = {
      encrypted: await encryptMessage(content, sharedSecret),
      clientNonce,
      senderId,
      createdAt: serverTimestamp(),
      seenBy: [senderId],
      seenAtBy: { [senderId]: serverTimestamp() },
      reactions: [],
      type: 'text',
    };

    if (selfDestructAt) payload.selfDestructAt = selfDestructAt;

    const target = messageRefFor(coupleId, clientNonce);
    await setDoc(target, payload);
    return target;
  } catch (error) {
    localSentAt.delete(clientNonce);
    throw error;
  }
}

export async function sendMediaMessage({
  coupleId,
  senderId,
  mediaUrl,
  mediaType = 'image',
  caption = '',
  clientNonce = crypto.randomUUID(),
}) {
  if (!firebaseEnabled) return null;

  localSentAt.set(clientNonce, Date.now());
  try {
    const target = messageRefFor(coupleId, clientNonce);
    await setDoc(target, {
      clientNonce,
      senderId,
      mediaUrl,
      caption: String(caption || '').slice(0, CHAT_LIMITS.maxMessageLength),
      createdAt: serverTimestamp(),
      seenBy: [senderId],
      seenAtBy: { [senderId]: serverTimestamp() },
      reactions: [],
      type: mediaType,
    });
    return target;
  } catch (error) {
    localSentAt.delete(clientNonce);
    throw error;
  }
}

function uploadTaskPromise(task, onProgress) {
  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        if (!onProgress) return;
        const total = Number(snapshot.totalBytes || 0);
        const transferred = Number(snapshot.bytesTransferred || 0);
        onProgress(total ? Math.round((transferred / total) * 100) : 0);
      },
      reject,
      () => resolve(task.snapshot.ref),
    );
  });
}

export async function uploadChatFile(coupleId, senderId, file, options = {}) {
  if (!firebaseEnabled || !storage || !file) return null;
  if (file.size > CHAT_LIMITS.maxUploadBytes) {
    throw new Error(`File is too large. Max upload size is ${Math.floor(CHAT_LIMITS.maxUploadBytes / (1024 * 1024))}MB.`);
  }
  if (!file.type.startsWith('image/') && !file.type.startsWith('audio/')) {
    throw new Error('Unsupported file type. Please upload an image or audio file.');
  }

  const extension = String(file.name || '').split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || (file.type.startsWith('image/') ? 'jpg' : 'webm');
  const key = options.clientNonce || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const objectRef = ref(storage, `couples/${coupleId}/messages/${senderId}/${key}.${extension}`);
  const task = uploadBytesResumable(objectRef, file, { contentType: file.type });

  try {
    await withTimeout(
      uploadTaskPromise(task, options.onProgress),
      45000,
      'Upload is taking too long. Check your connection and try again.',
    );
  } catch (error) {
    task.cancel?.();
    throw error;
  }

  return withTimeout(getDownloadURL(objectRef), 10000, 'Unable to finish the upload.');
}

export async function setTyping(coupleId, userId, isTyping) {
  if (!firebaseEnabled || !coupleId || !userId) return;
  await setDoc(
    doc(db, 'couples', coupleId, 'members', userId),
    { isTyping, lastActiveAt: serverTimestamp() },
    { merge: true },
  );
}

export async function markMessagesSeen(coupleId, messages, userId) {
  if (!firebaseEnabled || !coupleId || !userId || !Array.isArray(messages)) return;

  const unseen = messages.filter((message) =>
    message?.id
    && message.senderId !== userId
    && !(message.seenBy || []).includes(userId),
  );

  for (let index = 0; index < unseen.length; index += 200) {
    const batch = writeBatch(db);
    unseen.slice(index, index + 200).forEach((message) => {
      batch.update(messageRefFor(coupleId, message.id), {
        seenBy: arrayUnion(userId),
        [`seenAtBy.${userId}`]: serverTimestamp(),
      });
    });
    await batch.commit();
  }
}

export async function markSeen(coupleId, messageId, userId, seenBy = []) {
  if (!messageId) return;
  if (seenBy.includes(userId)) return;
  await markMessagesSeen(coupleId, [{ id: messageId, senderId: '', seenBy }], userId);
}

export function subscribeToTypingState(coupleId, onTyping) {
  if (!firebaseEnabled || !coupleId) return () => {};

  let timer = 0;
  let members = [];

  function emit() {
    window.clearTimeout(timer);
    const now = Date.now();
    const typingMap = {};
    let nextExpiry = Infinity;

    members.forEach(({ id, data }) => {
      const lastActive = millis(data.lastActiveAt);
      const age = lastActive ? now - lastActive : Infinity;
      const active = Boolean(data.isTyping) && age < TYPING_STALE_MS;
      typingMap[id] = active;
      if (active) nextExpiry = Math.min(nextExpiry, TYPING_STALE_MS - age + 30);
    });

    onTyping(typingMap);
    if (Number.isFinite(nextExpiry)) timer = window.setTimeout(emit, Math.max(60, nextExpiry));
  }

  const unsubscribe = onSnapshot(
    pathFor(coupleId, 'members'),
    (snapshot) => {
      members = snapshot.docs.map((entry) => ({ id: entry.id, data: entry.data() }));
      emit();
    },
    () => onTyping({}),
  );

  return () => {
    window.clearTimeout(timer);
    unsubscribe();
  };
}

export async function addReaction(coupleId, messageId, reaction) {
  if (!firebaseEnabled) return;
  await updateDoc(messageRefFor(coupleId, messageId), {
    reactions: arrayUnion(reaction),
  });
}
