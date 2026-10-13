// Shared, unit-testable classification for the compatibility calling collection.
const HOUR_MS = 60 * 60 * 1000;
const CLOSED_STATES = new Set(['declined', 'missed', 'failed', 'ended']);
const UNANSWERED_STATES = new Set(['creating', 'ringing']);
function millis(value) {
  if (value?.toMillis) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (typeof value === 'number') return value;
  return 0;
}

export function classifyCallForCleanup(call, now = Date.now()) {
  if (!call || call._kind !== 'call') return { remove: false, historyResult: null };
  const expiry = millis(call.expiresAt);
  const created = millis(call.createdAt);
  const ended = millis(call.endedAt);
  if (UNANSWERED_STATES.has(call.status)) {
    const due = expiry > 0 ? expiry : created > 0 ? created + HOUR_MS : 0;
    return { remove: due > 0 && due < now, historyResult: call.status === 'ringing' ? 'missed' : 'failed' };
  }
  if (CLOSED_STATES.has(call.status)) {
    const cutoff = ended || created;
    return { remove: cutoff > 0 && cutoff + HOUR_MS < now, historyResult: null };
  }
  // Connected/reconnecting sessions without an explicit end are preserved.
  return { remove: false, historyResult: null };
}
