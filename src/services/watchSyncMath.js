// Shared math for Watch Together; no Firebase/browser imports so it is unit-testable.
const READY_TTL_MS = 50_000;
const MAX_SAMPLE_AGE_MS = 12_000;

export function timestampMs(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') {
    return value.seconds * 1000 + (value.nanoseconds || 0) / 1_000_000;
  }
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function readyMembers(readiness, sessionId, now = Date.now()) {
  if (!sessionId || !readiness || typeof readiness !== 'object') return [];
  return Object.entries(readiness)
    .filter(([uid, entry]) => {
      if (!uid || !entry || entry.ready !== true || entry.sessionId !== sessionId) return false;
      const stamp = timestampMs(entry.seenAt);
      return stamp > 0 && Math.abs(now - stamp) <= READY_TTL_MS;
    })
    .map(([uid]) => uid);
}

export function getCommandDelay(command, now = Date.now()) {
  if (!command) return 0;
  const delayMs = Math.max(0, Number(command.delayMs) || 0);
  const anchor = timestampMs(command.committedAt) || timestampMs(command.sentAt);
  const executeAt = anchor ? anchor + delayMs : Number(command.executeAt) || now;
  // A late Firestore update must not restart the entire countdown.
  return Math.max(0, executeAt - now);
}

export function commandPlaybackPosition(command, now = Date.now()) {
  const position = Math.max(0, Number(command?.currentTime) || 0);
  if (command?.action !== 'play') return position;
  const delayMs = Math.max(0, Number(command.delayMs) || 0);
  const anchor = timestampMs(command.committedAt) || timestampMs(command.sentAt);
  const scheduled = anchor ? anchor + delayMs : Number(command.executeAt) || now;
  // Cap catch-up after a background tab resumes; the heartbeat can refine it.
  return position + Math.min(8, Math.max(0, now - scheduled) / 1000);
}

export function estimatedSharedTime(sync, now = Date.now()) {
  if (!sync || !Number.isFinite(Number(sync.currentTime))) return null;
  const sampleAt = timestampMs(sync.sampledAt) || timestampMs(sync.sentAt);
  if (!sampleAt || Math.abs(now - sampleAt) > MAX_SAMPLE_AGE_MS) return null;
  const position = Math.max(0, Number(sync.currentTime));
  if (!sync.playing || sync.buffering) return position;
  return position + Math.max(0, Math.min(8, now - sampleAt) / 1000);
}

export function driftCorrection(expected, actual, native = true) {
  if (!Number.isFinite(expected) || !Number.isFinite(actual)) return { kind: 'none' };
  const drift = expected - actual;
  const abs = Math.abs(drift);
  if (abs < (native ? 0.3 : 0.7)) return { kind: 'none', drift };
  if (abs > (native ? 1.35 : 1.0) || !native) return { kind: 'seek', drift, position: Math.max(0, expected) };
  // Small, short-lived changes are less jarring than constantly seeking a video.
  const rate = Math.max(0.94, Math.min(1.06, 1 + drift * 0.1));
  return { kind: 'rate', drift, rate };
}
