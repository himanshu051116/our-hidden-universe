import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebaseCore.js';

export function normalizeRoomCode(value) {
  return String(value || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

// Never trust a room ID from localStorage or from an account pointer until
// Firestore has verified membership for the *current* Firebase Auth UID.
export async function hasRoomMembership(uid, code) {
  const normalized = normalizeRoomCode(code);
  if (!uid || !normalized) return false;
  const member = await getDoc(doc(db, 'couples', normalized, 'members', uid));
  return member.exists();
}

export async function recoverVerifiedRoomCode(uid, cachedCode = '') {
  if (!uid) return '';
  const cached = normalizeRoomCode(cachedCode);
  let initialError = null;

  if (cached) {
    try {
      if (await hasRoomMembership(uid, cached)) return cached;
    } catch (error) {
      initialError = error;
    }
  }

  try {
    const pointer = await getDoc(doc(db, 'accountRooms', uid));
    const saved = pointer.exists() ? normalizeRoomCode(pointer.data()?.roomCode) : '';
    if (saved && await hasRoomMembership(uid, saved)) return saved;
  } catch (error) {
    // In a network outage, do not treat an unverified code as a valid room.
    // Surface an error instead of silently losing a possibly legitimate code.
    throw initialError || error;
  }
  if (initialError) throw initialError;
  return '';
}

export async function rememberVerifiedRoomCode(uid, code) {
  const normalized = normalizeRoomCode(code);
  if (!uid || !normalized) return;
  await setDoc(doc(db, 'accountRooms', uid), {
    roomCode: normalized,
    updatedAt: serverTimestamp(),
  });
}
