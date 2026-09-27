import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase.js';

const historyPath = (coupleId) => collection(db, 'couples', coupleId, 'callHistory');

function timestampValue(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value;
  if (typeof value?.seconds === 'number') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return Timestamp.fromMillis(value);
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? Timestamp.fromMillis(parsed) : null;
}

export async function recordCallHistory({
  coupleId,
  callId,
  callerId,
  calleeId,
  type,
  result,
  startedAt,
  connectedAt,
  durationSeconds,
}) {
  if (!firebaseEnabled || !coupleId || !callId || !callerId || !calleeId) return;

  await setDoc(
    doc(db, 'couples', coupleId, 'callHistory', callId),
    {
      callerId,
      calleeId,
      type: type === 'audio' ? 'audio' : 'video',
      result,
      startedAt: timestampValue(startedAt),
      connectedAt: timestampValue(connectedAt),
      durationSeconds: Math.max(0, Math.floor(Number(durationSeconds) || 0)),
      endedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function subscribeRecentCallHistory(coupleId, onChange, onError) {
  if (!firebaseEnabled || !coupleId) {
    onChange([]);
    return () => {};
  }

  const q = query(historyPath(coupleId), orderBy('endedAt', 'desc'), limit(6));
  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))),
    onError,
  );
}
