import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase.js';

const compatibilityPath = (coupleId) => collection(db, 'couples', coupleId, 'watchParty');

function timestampValue(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value;
  if (typeof value?.seconds === 'number') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return Timestamp.fromMillis(value);
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? Timestamp.fromMillis(parsed) : null;
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
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
    doc(db, 'couples', coupleId, 'watchParty', `call-history-${callId}`),
    {
      _kind: 'callHistory',
      callId,
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

  const q = query(compatibilityPath(coupleId), where('_kind', '==', 'callHistory'));
  return onSnapshot(
    q,
    (snapshot) => {
      const history = snapshot.docs
        .map((entry) => ({ id: entry.data()?.callId || entry.id, ...entry.data() }))
        .sort((a, b) => toMillis(b.endedAt) - toMillis(a.endedAt))
        .slice(0, 6);
      onChange(history);
    },
    onError,
  );
}
