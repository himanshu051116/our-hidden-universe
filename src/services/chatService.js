import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, firebaseEnabled, storage } from './firebase';
import { decryptMessage, encryptMessage } from './encryption';

export const CHAT_LIMITS = {
  maxMessageLength: 2000,
  maxUploadBytes: 10 * 1024 * 1024,
};

const pathFor = (coupleId, segment) => collection(db, 'couples', coupleId, segment);

function withTimeout(promise, milliseconds, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), milliseconds);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function fingerprintForEncryptedMessage(encrypted = {}) {
  const cipher = encrypted.cipherText || '';
  const iv = encrypted.iv || '';
  const salt = encrypted.salt || '';
  const integrity = encrypted.integrity || '';
  return `${cipher.length}:${iv.length}:${salt.length}:${integrity.length}:${integrity}:${iv}`;
}

export function subscribeToEncryptedMessages(coupleId, sharedSecret, onMessages, onError) {
  if (!firebaseEnabled || !coupleId) return () => {};
  const decryptedCache = new Map();

  const q = query(pathFor(coupleId, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    async (snapshot) => {
      const activeIds = new Set(snapshot.docs.map((item) => item.id));
      for (const key of decryptedCache.keys()) {
        if (!activeIds.has(key)) decryptedCache.delete(key);
      }

      const messages = await Promise.all(
        snapshot.docs.map(async (messageDoc) => {
          const data = messageDoc.data();
          if (data.type && data.type !== 'text') {
            return { id: messageDoc.id, ...data };
          }

          const encrypted = data.encrypted || {};
          const fingerprint = fingerprintForEncryptedMessage(encrypted);
          const cached = decryptedCache.get(messageDoc.id);
          if (cached && cached.fingerprint === fingerprint) {
            return { id: messageDoc.id, ...data, text: cached.text };
          }

          try {
            if (!data.encrypted) return { id: messageDoc.id, ...data, text: data.text || '' };
            const text = await decryptMessage(data.encrypted, sharedSecret);
            decryptedCache.set(messageDoc.id, { fingerprint, text });
            return {
              id: messageDoc.id,
              ...data,
              text,
            };
          } catch {
            return { id: messageDoc.id, ...data, text: 'Unable to decrypt message.' };
          }
        }),
      );
      onMessages(messages);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function sendEncryptedMessage({ coupleId, sharedSecret, senderId, text, selfDestructAt = null }) {
  if (!firebaseEnabled) return null;
  const content = String(text || '').trim();
  if (!content) throw new Error('Message cannot be empty.');
  if (content.length > CHAT_LIMITS.maxMessageLength) {
    throw new Error(`Message is too long. Max ${CHAT_LIMITS.maxMessageLength} characters.`);
  }

  const payload = {
    encrypted: await encryptMessage(content, sharedSecret),
    clientNonce: crypto.randomUUID(),
    senderId,
    createdAt: serverTimestamp(),
    seenBy: [senderId],
    seenAtBy: { [senderId]: serverTimestamp() },
    reactions: [],
    type: 'text',
  };

  if (selfDestructAt) {
    payload.selfDestructAt = selfDestructAt;
  }

  return addDoc(pathFor(coupleId, 'messages'), payload);
}

export async function sendMediaMessage({ coupleId, senderId, mediaUrl, mediaType = 'image', caption = '' }) {
  if (!firebaseEnabled) return null;
  return addDoc(pathFor(coupleId, 'messages'), {
    clientNonce: crypto.randomUUID(),
    senderId,
    mediaUrl,
    caption: String(caption || '').slice(0, CHAT_LIMITS.maxMessageLength),
    createdAt: serverTimestamp(),
    seenBy: [senderId],
    seenAtBy: { [senderId]: serverTimestamp() },
    reactions: [],
    type: mediaType,
  });
}

export async function uploadChatFile(coupleId, senderId, file) {
  if (!firebaseEnabled || !storage || !file) return null;
  if (file.size > CHAT_LIMITS.maxUploadBytes) {
    throw new Error(`File is too large. Max upload size is ${Math.floor(CHAT_LIMITS.maxUploadBytes / (1024 * 1024))}MB.`);
  }
  if (!file.type.startsWith('image/') && !file.type.startsWith('audio/')) {
    throw new Error('Unsupported file type. Please upload an image or audio file.');
  }

  const extension = file.name.split('.').pop();
  const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const objectRef = ref(storage, `couples/${coupleId}/messages/${senderId}/${key}.${extension}`);
  await withTimeout(
    uploadBytes(objectRef, file, { contentType: file.type }),
    30000,
    'Upload is taking too long. Firebase Storage may not be enabled for this project.',
  );
  return withTimeout(getDownloadURL(objectRef), 10000, 'Unable to get the uploaded file URL.');
}

export async function setTyping(coupleId, userId, isTyping) {
  if (!firebaseEnabled || !coupleId || !userId) return;
  await setDoc(doc(db, 'couples', coupleId, 'members', userId), { isTyping, lastActiveAt: serverTimestamp() }, { merge: true });
}

export async function markSeen(coupleId, messageId, userId, seenBy = [], seenAtBy = {}) {
  if (!firebaseEnabled) return;
  const updates = {};
  if (!seenBy.includes(userId)) {
    updates.seenBy = [...seenBy, userId];
  }
  if (!seenAtBy[userId]) {
    updates[`seenAtBy.${userId}`] = serverTimestamp();
  }
  if (!Object.keys(updates).length) return;
  await updateDoc(doc(db, 'couples', coupleId, 'messages', messageId), updates);
}

export function subscribeToTypingState(coupleId, onTyping) {
  if (!firebaseEnabled || !coupleId) return () => {};
  return onSnapshot(pathFor(coupleId, 'members'), (snapshot) => {
    const typingMap = {};
    snapshot.forEach((entry) => {
      typingMap[entry.id] = entry.data().isTyping || false;
    });
    onTyping(typingMap);
  });
}

export async function addReaction(coupleId, messageId, reaction) {
  if (!firebaseEnabled) return;
  await updateDoc(doc(db, 'couples', coupleId, 'messages', messageId), {
    reactions: arrayUnion(reaction),
  });
}
