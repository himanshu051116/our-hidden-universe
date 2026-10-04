import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, firebaseEnabled, storage } from './firebase.js';

const LOCAL_KEY = 'ohu-memories-v1';
export const MEMORY_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function localItems() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadDeviceMemories() {
  return localItems().map((item) => ({ ...item, origin: 'device' }));
}

export function removeDeviceMemory(memoryId) {
  const next = localItems().filter((item) => item.id !== memoryId);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  return next;
}

export function subscribeSharedMemories(coupleId, onChange, onError) {
  if (!firebaseEnabled || !coupleId) {
    onChange([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, 'couples', coupleId, 'memories'),
    (snapshot) => {
      const memories = snapshot.docs
        .map((entry) => ({ id: entry.id, ...entry.data(), origin: 'shared' }))
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
      onChange(memories);
    },
    (error) => onError?.(error),
  );
}

function mediaTypeFromMime(mime = '', fallback = 'image') {
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'voice';
  if (mime.startsWith('image/')) return 'image';
  return fallback;
}

function safeExtension(name = '', mime = '') {
  const fromName = String(name).split('.').pop();
  if (fromName && fromName !== name && fromName.length <= 8) return fromName.toLowerCase();
  const fromMime = String(mime).split('/').pop();
  return fromMime || 'bin';
}

async function uploadMemoryBlob({ coupleId, userId, blob, fileName = '', mediaType = 'image' }) {
  if (!storage) throw new Error('Shared media storage is not available on this deployment.');
  if (!blob) return { mediaUrl: '', storagePath: '', mediaType };
  if (blob.size > MEMORY_MAX_UPLOAD_BYTES) {
    throw new Error('Memory file is too large. Keep uploads under 25 MB.');
  }
  const mime = blob.type || '';
  if (!mime.startsWith('image/') && !mime.startsWith('audio/') && !mime.startsWith('video/')) {
    throw new Error('Upload an image, video, or audio memory.');
  }

  const resolvedType = mediaTypeFromMime(mime, mediaType);
  const extension = safeExtension(fileName, mime);
  const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const storagePath = `couples/${coupleId}/memories/${userId}/${key}.${extension}`;
  const objectRef = ref(storage, storagePath);
  await uploadBytes(objectRef, blob, { contentType: mime });
  const mediaUrl = await getDownloadURL(objectRef);
  return { mediaUrl, storagePath, mediaType: resolvedType };
}

export async function saveSharedMemory({ coupleId, user, memory, file }) {
  if (!coupleId || !user?.uid) throw new Error('Open your shared universe before adding a memory.');
  if (!firebaseEnabled) throw new Error('Shared memories need the live room connection.');

  let mediaUrl = String(memory.mediaUrl || '').trim();
  let storagePath = '';
  let mediaType = memory.mediaType || 'note';
  let mediaFileName = memory.mediaFileName || '';

  if (file) {
    const uploaded = await uploadMemoryBlob({
      coupleId,
      userId: user.uid,
      blob: file,
      fileName: file.name,
      mediaType,
    });
    mediaUrl = uploaded.mediaUrl;
    storagePath = uploaded.storagePath;
    mediaType = uploaded.mediaType;
    mediaFileName = file.name;
  }

  const memoryId = crypto.randomUUID();
  await setDoc(doc(db, 'couples', coupleId, 'memories', memoryId), {
    date: memory.date,
    title: String(memory.title || '').trim(),
    note: String(memory.note || '').trim(),
    mediaType,
    mediaUrl,
    mediaFileName,
    storagePath,
    createdBy: user.uid,
    createdByName: user.displayName || user.email || 'You',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return memoryId;
}

function dataUrlToBlob(dataUrl) {
  return fetch(dataUrl).then((response) => response.blob());
}

export async function moveDeviceMemoryToShared({ coupleId, user, memory }) {
  if (!coupleId || !user?.uid || !firebaseEnabled) {
    throw new Error('Shared memories need the live room connection.');
  }

  const safeId = String(memory.id || crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, '-');
  const memoryId = `device-${safeId}`;
  let mediaUrl = String(memory.mediaUrl || '').trim();
  let storagePath = '';
  let mediaType = memory.mediaType || 'note';

  if (mediaUrl.startsWith('data:')) {
    const blob = await dataUrlToBlob(mediaUrl);
    const uploaded = await uploadMemoryBlob({
      coupleId,
      userId: user.uid,
      blob,
      fileName: memory.mediaFileName || `memory.${safeExtension('', blob.type)}`,
      mediaType,
    });
    mediaUrl = uploaded.mediaUrl;
    storagePath = uploaded.storagePath;
    mediaType = uploaded.mediaType;
  }

  await setDoc(
    doc(db, 'couples', coupleId, 'memories', memoryId),
    {
      date: memory.date || new Date().toISOString().slice(0, 10),
      title: String(memory.title || 'Memory').trim(),
      note: String(memory.note || '').trim(),
      mediaType,
      mediaUrl,
      mediaFileName: memory.mediaFileName || '',
      storagePath,
      createdBy: user.uid,
      createdByName: user.displayName || user.email || 'You',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      migratedFromDevice: true,
    },
    { merge: true },
  );

  removeDeviceMemory(memory.id);
  return memoryId;
}

export async function deleteSharedMemory(coupleId, memory) {
  if (!firebaseEnabled || !coupleId || !memory?.id) return;
  await deleteDoc(doc(db, 'couples', coupleId, 'memories', memory.id));
  if (memory.storagePath && storage) {
    try {
      await deleteObject(ref(storage, memory.storagePath));
    } catch {
      // The database record is authoritative; a missing object should not block deletion.
    }
  }
}
