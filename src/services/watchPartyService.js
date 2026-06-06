import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase.js';

const watchPartyKey = 'ohu-watch-party-v1';
const localChangeEvent = 'ohu-watch-party-change';

export const emptyWatchParty = {
  title: '',
  sourceType: 'external',
  sourceUrl: '',
  playback: {
    action: 'pause',
    currentTime: 0,
    commandId: '',
    executeAt: 0,
    updatedBy: '',
    updatedByName: '',
  },
};

function normalizeWatchParty(value = {}) {
  return {
    ...emptyWatchParty,
    ...value,
    playback: {
      ...emptyWatchParty.playback,
      ...(value.playback || {}),
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

export async function saveWatchPartySetup(coupleId, user, setup) {
  const payload = {
    title: setup.title || '',
    sourceType: setup.sourceType || 'external',
    sourceUrl: setup.sourceUrl || '',
    updatedBy: user?.uid || 'local',
    updatedByName: user?.displayName || user?.email || 'You',
  };

  if (!firebaseEnabled || !coupleId || !user?.uid) {
    saveLocalWatchParty({ ...loadLocalWatchParty(), ...payload });
    return;
  }

  await setDoc(
    doc(db, 'couples', coupleId, 'watchParty', 'current'),
    { ...payload, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function sendWatchPartyCommand(coupleId, user, command) {
  const playback = {
    action: command.action || 'pause',
    currentTime: Math.max(0, Number(command.currentTime) || 0),
    commandId: crypto.randomUUID(),
    executeAt: Number(command.executeAt) || Date.now(),
    updatedBy: user?.uid || 'local',
    updatedByName: user?.displayName || user?.email || 'You',
  };

  if (!firebaseEnabled || !coupleId || !user?.uid) {
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
