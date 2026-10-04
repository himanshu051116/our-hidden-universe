import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase.js';

const watchPartyKey = 'ohu-watch-party-v1';
const localChangeEvent = 'ohu-watch-party-change';

function createId() {
  return crypto.randomUUID();
}

export const emptyWatchParty = {
  title: '',
  sourceType: 'external',
  sourceUrl: '',
  sessionId: '',
  playback: {
    action: 'pause',
    currentTime: 0,
    commandId: '',
    sessionId: '',
    executeAt: 0,
    delayMs: 0,
    sentAt: 0,
    updatedBy: '',
    updatedByName: '',
  },
  sync: {
    currentTime: 0,
    playing: false,
    buffering: false,
    sampleId: '',
    sessionId: '',
    sentAt: 0,
    updatedBy: '',
    updatedByName: '',
  },
};

function normalizeWatchParty(value = {}) {
  return {
    ...emptyWatchParty,
    ...value,
    sessionId: value.sessionId || '',
    playback: {
      ...emptyWatchParty.playback,
      ...(value.playback || {}),
    },
    sync: {
      ...emptyWatchParty.sync,
      ...(value.sync || {}),
    },
  };
}

export function loadLocalWatchParty() {
  try {
    return normalizeWatchParty(JSON.parse(localStorage.getItem(watchPartyKey) || '{}'));
  } catch {
    return emptyWatchParty;
  }
}

function saveLocalWatchParty(value) {
  const next = normalizeWatchParty(value);
  localStorage.setItem(watchPartyKey, JSON.stringify(next));
  window.dispatchEvent(new Event(localChangeEvent));
}

function coupleReady(coupleId, user) {
  return Boolean(coupleId && user?.uid);
}

export function subscribeWatchParty(coupleId, onChange, onError) {
  if (!firebaseEnabled || !coupleId) {
    const emit = () => onChange(loadLocalWatchParty());
    emit();
    window.addEventListener(localChangeEvent, emit);
    return () => window.removeEventListener(localChangeEvent, emit);
  }

  return onSnapshot(
    doc(db, 'couples', coupleId, 'watchParty', 'current'),
    (snapshot) => onChange(normalizeWatchParty(snapshot.exists() ? snapshot.data() : {})),
    (error) => onError?.(error),
  );
}

export async function saveWatchPartySetup(coupleId, user, setup, { resetPlayback = false } = {}) {
  const sessionId = setup.sessionId || createId();
  const actor = {
    updatedBy: user?.uid || 'local',
    updatedByName: user?.displayName || user?.email || 'You',
  };
  const payload = {
    title: setup.title || '',
    sourceType: setup.sourceType || 'external',
    sourceUrl: setup.sourceUrl || '',
    sessionId,
    ...actor,
  };

  if (resetPlayback) {
    const sentAt = Date.now();
    payload.playback = {
      action: 'pause',
      currentTime: 0,
      commandId: createId(),
      sessionId,
      executeAt: sentAt,
      delayMs: 0,
      sentAt,
      ...actor,
    };
    payload.sync = {
      currentTime: 0,
      playing: false,
      buffering: false,
      sampleId: createId(),
      sessionId,
      sentAt,
      ...actor,
    };
  }

  if (!firebaseEnabled || !coupleReady(coupleId, user)) {
    saveLocalWatchParty({ ...loadLocalWatchParty(), ...payload });
    return { sessionId };
  }

  await setDoc(
    doc(db, 'couples', coupleId, 'watchParty', 'current'),
    { ...payload, updatedAt: serverTimestamp() },
    { merge: true },
  );
  return { sessionId };
}

export async function sendWatchPartyCommand(coupleId, user, command) {
  const sentAt = Date.now();
  const playback = {
    action: command.action || 'pause',
    currentTime: Math.max(0, Number(command.currentTime) || 0),
    commandId: createId(),
    sessionId: command.sessionId || '',
    executeAt: Number(command.executeAt) || sentAt,
    delayMs: Math.max(0, Number(command.delayMs) || 0),
    sentAt,
    updatedBy: user?.uid || 'local',
    updatedByName: user?.displayName || user?.email || 'You',
  };

  if (!firebaseEnabled || !coupleReady(coupleId, user)) {
    saveLocalWatchParty({ ...loadLocalWatchParty(), playback });
    return playback;
  }

  await setDoc(
    doc(db, 'couples', coupleId, 'watchParty', 'current'),
    { playback, updatedAt: serverTimestamp() },
    { merge: true },
  );
  return playback;
}

export async function sendWatchPartyHeartbeat(coupleId, user, state) {
  const sync = {
    currentTime: Math.max(0, Number(state.currentTime) || 0),
    playing: Boolean(state.playing),
    buffering: Boolean(state.buffering),
    sampleId: createId(),
    sessionId: state.sessionId || '',
    sentAt: Date.now(),
    updatedBy: user?.uid || 'local',
    updatedByName: user?.displayName || user?.email || 'You',
  };

  if (!firebaseEnabled || !coupleReady(coupleId, user)) {
    saveLocalWatchParty({ ...loadLocalWatchParty(), sync });
    return sync;
  }

  await setDoc(
    doc(db, 'couples', coupleId, 'watchParty', 'current'),
    { sync, syncUpdatedAt: serverTimestamp() },
    { merge: true },
  );
  return sync;
}
