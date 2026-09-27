import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase.js';

export const RING_TIMEOUT_MS = 30_000;

const callsPath = (coupleId) => collection(db, 'couples', coupleId, 'calls');
const callRef = (coupleId, callId) => doc(db, 'couples', coupleId, 'calls', callId);

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function createCallRecord({ coupleId, callerId, calleeId, type }) {
  if (!firebaseEnabled) throw new Error('Firebase is required for live calls.');

  const reference = await addDoc(callsPath(coupleId), {
    callerId,
    calleeId,
    type,
    status: 'creating',
    offer: null,
    answer: null,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + RING_TIMEOUT_MS),
    answeredAt: null,
    connectedAt: null,
    endedAt: null,
    endedBy: null,
    endReason: null,
    restartRevision: 0,
    restartRequestedBy: null,
    restartOffer: null,
    restartAnswer: null,
    restartStartedAt: null,
  });

  return reference.id;
}

export function subscribeToCall(coupleId, callId, onChange, onError) {
  if (!firebaseEnabled || !coupleId || !callId) return () => {};
  return onSnapshot(
    callRef(coupleId, callId),
    (snapshot) => onChange(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null),
    onError,
  );
}

export function subscribeToIncomingCalls(coupleId, userId, onIncomingCall, onError) {
  if (!firebaseEnabled || !coupleId || !userId) return () => {};

  const q = query(
    callsPath(coupleId),
    where('calleeId', '==', userId),
    where('status', '==', 'ringing'),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const now = Date.now();
      const calls = snapshot.docs
        .map((entry) => ({ id: entry.id, ...entry.data() }))
        .filter((call) => !call.expiresAt || toMillis(call.expiresAt) > now)
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

      onIncomingCall(calls[0] || null);
    },
    onError,
  );
}

export async function writeOffer(coupleId, callId, offer) {
  await updateDoc(callRef(coupleId, callId), {
    offer,
    status: 'ringing',
  });
}

export async function writeAnswer(coupleId, callId, answer) {
  await updateDoc(callRef(coupleId, callId), {
    answer,
    status: 'connecting',
    answeredAt: serverTimestamp(),
    expiresAt: null,
  });
}

export async function requestIceRestart(coupleId, callId, requesterId) {
  await updateDoc(callRef(coupleId, callId), {
    restartRequestedBy: requesterId,
    status: 'reconnecting',
    restartStartedAt: serverTimestamp(),
  });
}

export async function writeRestartOffer(coupleId, callId, revision, offer) {
  await updateDoc(callRef(coupleId, callId), {
    restartRevision: revision,
    restartRequestedBy: null,
    restartOffer: offer,
    restartAnswer: null,
    restartStartedAt: serverTimestamp(),
    status: 'reconnecting',
  });
}

export async function writeRestartAnswer(coupleId, callId, revision, answer) {
  await updateDoc(callRef(coupleId, callId), {
    restartRevision: revision,
    restartAnswer: answer,
    status: 'connecting',
  });
}

export async function updateCallStatus(coupleId, callId, status, extra = {}) {
  await updateDoc(callRef(coupleId, callId), {
    status,
    ...extra,
  });
}

export async function markCallMissed(coupleId, callId, userId) {
  await updateDoc(callRef(coupleId, callId), {
    status: 'missed',
    endedAt: serverTimestamp(),
    endedBy: userId,
    endReason: 'no-answer',
  });
}

export async function addIceCandidateRecord(coupleId, callId, side, candidate, revision = 0) {
  const name = side === 'caller' ? 'callerCandidates' : 'calleeCandidates';
  await addDoc(collection(db, 'couples', coupleId, 'calls', callId, name), {
    ...candidate,
    revision,
  });
}

export function subscribeToIceCandidates(coupleId, callId, side, onCandidate, onError) {
  const name = side === 'caller' ? 'callerCandidates' : 'calleeCandidates';
  return onSnapshot(
    collection(db, 'couples', coupleId, 'calls', callId, name),
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') onCandidate(change.doc.data());
      });
    },
    onError,
  );
}

export async function fetchCall(coupleId, callId) {
  const snapshot = await getDoc(callRef(coupleId, callId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

async function deleteCollection(reference) {
  const snapshot = await getDocs(reference);
  if (snapshot.empty) return;
  const batch = writeBatch(db);
  snapshot.docs.forEach((entry) => batch.delete(entry.ref));
  await batch.commit();
}

export async function cleanupCallSignaling(coupleId, callId) {
  if (!firebaseEnabled || !coupleId || !callId) return;
  await Promise.all([
    deleteCollection(collection(db, 'couples', coupleId, 'calls', callId, 'callerCandidates')),
    deleteCollection(collection(db, 'couples', coupleId, 'calls', callId, 'calleeCandidates')),
  ]);
}

export async function removeCallRecord(coupleId, callId) {
  await cleanupCallSignaling(coupleId, callId);
  await deleteDoc(callRef(coupleId, callId));
}
