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

// Production still has the pre-V5 Firestore rules, which do not authorize
// /couples/{coupleId}/calls. The watchParty collection is already restricted
// to room members in both legacy and V5 rules, while the watch-party feature
// itself only uses watchParty/current. Call documents therefore live in this
// collection with a private _kind discriminator until the V5 rules are deployed.
const signalingPath = (coupleId) => collection(db, 'couples', coupleId, 'watchParty');
const callRef = (coupleId, callId) => doc(db, 'couples', coupleId, 'watchParty', callId);

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function isCallDocument(value) {
  return value?._kind === 'call';
}

export async function createCallRecord({ coupleId, callerId, calleeId, type }) {
  if (!firebaseEnabled) throw new Error('Firebase is required for live calls.');

  const reference = await addDoc(signalingPath(coupleId), {
    _kind: 'call',
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
    (snapshot) => {
      const value = snapshot.exists() ? snapshot.data() : null;
      onChange(value && isCallDocument(value) ? { id: snapshot.id, ...value } : null);
    },
    onError,
  );
}

export function subscribeToIncomingCalls(coupleId, userId, onIncomingCall, onError) {
  if (!firebaseEnabled || !coupleId || !userId) return () => {};

  // A single-field query works with Firestore's automatic indexes and avoids
  // requiring a new composite index in production.
  const q = query(signalingPath(coupleId), where('_kind', '==', 'call'));

  return onSnapshot(
    q,
    (snapshot) => {
      const now = Date.now();
      const calls = snapshot.docs
        .map((entry) => ({ id: entry.id, ...entry.data() }))
        .filter((call) => (
          call.calleeId === userId
          && call.status === 'ringing'
          && (!call.expiresAt || toMillis(call.expiresAt) > now)
        ))
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
  await addDoc(signalingPath(coupleId), {
    _kind: 'callCandidate',
    callId,
    side: side === 'caller' ? 'caller' : 'callee',
    ...candidate,
    revision,
  });
}

export function subscribeToIceCandidates(coupleId, callId, side, onCandidate, onError) {
  const expectedSide = side === 'caller' ? 'caller' : 'callee';
  const q = query(signalingPath(coupleId), where('_kind', '==', 'callCandidate'));

  return onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type !== 'added') return;
        const value = change.doc.data();
        if (value.callId !== callId || value.side !== expectedSide) return;
        const { _kind, callId: _callId, side: _side, ...candidate } = value;
        onCandidate(candidate);
      });
    },
    onError,
  );
}

export async function fetchCall(coupleId, callId) {
  const snapshot = await getDoc(callRef(coupleId, callId));
  if (!snapshot.exists()) return null;
  const value = snapshot.data();
  return isCallDocument(value) ? { id: snapshot.id, ...value } : null;
}

export async function cleanupCallSignaling(coupleId, callId) {
  if (!firebaseEnabled || !coupleId || !callId) return;

  const snapshot = await getDocs(query(signalingPath(coupleId), where('_kind', '==', 'callCandidate')));
  const candidates = snapshot.docs.filter((entry) => entry.data()?.callId === callId);
  if (!candidates.length) return;

  const batch = writeBatch(db);
  candidates.forEach((entry) => batch.delete(entry.ref));
  await batch.commit();
}

export async function removeCallRecord(coupleId, callId) {
  await cleanupCallSignaling(coupleId, callId);
  await deleteDoc(callRef(coupleId, callId));
}
