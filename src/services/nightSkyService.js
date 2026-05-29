import {
  addDoc,
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, firebaseEnabled, storage } from './firebase.js';

const skyKey = 'ohu-night-sky-v1';
const nowPhotosKey = 'ohu-now-photos-v1';
const maxPhotoBytes = 10 * 1024 * 1024;

function readLocal(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '');
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function localSky() {
  return readLocal(skyKey, {
    stars: [],
    signals: [],
    lanterns: {},
    sleep: {},
    stats: { missYou: 0, thoughts: 0, heartbeats: 0, sleepRituals: 0 },
    touches: {},
  });
}

function saveLocalSky(next) {
  writeLocal(skyKey, next);
  window.dispatchEvent(new Event('ohu-night-sky-local-change'));
}

function pathFor(coupleId, segment) {
  return collection(db, 'couples', coupleId, segment);
}

function withId(snapshot) {
  return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
}

export function subscribeNightSky(coupleId, onChange) {
  if (!firebaseEnabled || !coupleId) {
    const emit = () => onChange({ ...localSky(), photos: readLocal(nowPhotosKey, []) });
    emit();
    window.addEventListener('ohu-night-sky-local-change', emit);
    return () => window.removeEventListener('ohu-night-sky-local-change', emit);
  }

  const state = { stars: [], signals: [], lanterns: {}, sleep: {}, photos: [], stats: {}, touches: {} };
  const emit = () => onChange({ ...state });
  const unsubscribers = [
    onSnapshot(query(pathFor(coupleId, 'skyStars'), orderBy('createdAt', 'asc')), (snapshot) => {
      state.stars = withId(snapshot);
      emit();
    }),
    onSnapshot(query(pathFor(coupleId, 'skySignals'), orderBy('createdAt', 'desc'), limit(18)), (snapshot) => {
      state.signals = withId(snapshot);
      emit();
    }),
    onSnapshot(pathFor(coupleId, 'moodLanterns'), (snapshot) => {
      state.lanterns = Object.fromEntries(snapshot.docs.map((entry) => [entry.id, { id: entry.id, ...entry.data() }]));
      emit();
    }),
    onSnapshot(pathFor(coupleId, 'sleepStates'), (snapshot) => {
      state.sleep = Object.fromEntries(snapshot.docs.map((entry) => [entry.id, { id: entry.id, ...entry.data() }]));
      emit();
    }),
    onSnapshot(doc(db, 'couples', coupleId, 'skyStats', 'shared'), (snapshot) => {
      state.stats = snapshot.exists() ? snapshot.data() : {};
      emit();
    }),
    onSnapshot(pathFor(coupleId, 'starTouches'), (snapshot) => {
      state.touches = Object.fromEntries(snapshot.docs.map((entry) => [entry.id, entry.data()]));
      emit();
    }),
    onSnapshot(query(pathFor(coupleId, 'rightNowPhotos'), orderBy('createdAt', 'desc'), limit(20)), (snapshot) => {
      state.photos = withId(snapshot);
      emit();
    }),
  ];

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export async function createSkyStar(coupleId, user, payload) {
  const star = {
    ...payload,
    x: Number(payload.x ?? Math.random() * 76 + 12),
    y: Number(payload.y ?? Math.random() * 70 + 12),
    senderId: user?.uid || 'local',
    senderName: user?.displayName || user?.email || 'You',
    createdAt: new Date().toISOString(),
  };

  if (!firebaseEnabled || !coupleId) {
    const sky = localSky();
    saveLocalSky({ ...sky, stars: [...sky.stars, { ...star, id: crypto.randomUUID() }] });
    return;
  }

  await addDoc(pathFor(coupleId, 'skyStars'), { ...star, createdAt: serverTimestamp() });
}

export async function sendSkySignal(coupleId, user, type) {
  const signal = {
    type,
    senderId: user?.uid || 'local',
    senderName: user?.displayName || user?.email || 'You',
    createdAt: new Date().toISOString(),
  };
  const statField = type === 'thinking' ? 'thoughts' : type === 'heartbeat' ? 'heartbeats' : 'missYou';

  if (!firebaseEnabled || !coupleId) {
    const sky = localSky();
    saveLocalSky({
      ...sky,
      signals: [{ ...signal, id: crypto.randomUUID() }, ...sky.signals].slice(0, 18),
      stats: { ...sky.stats, [statField]: (sky.stats?.[statField] || 0) + 1 },
    });
    return;
  }

  await addDoc(pathFor(coupleId, 'skySignals'), { ...signal, createdAt: serverTimestamp() });
  await setDoc(doc(db, 'couples', coupleId, 'skyStats', 'shared'), { [statField]: increment(1), updatedAt: serverTimestamp() }, { merge: true });
}

export async function setMoodLantern(coupleId, user, mood) {
  const lantern = {
    mood,
    userId: user?.uid || 'local',
    displayName: user?.displayName || user?.email || 'You',
    updatedAt: new Date().toISOString(),
  };

  if (!firebaseEnabled || !coupleId) {
    const sky = localSky();
    saveLocalSky({ ...sky, lanterns: { ...sky.lanterns, [lantern.userId]: lantern } });
    return;
  }

  await setDoc(doc(db, 'couples', coupleId, 'moodLanterns', user.uid), { ...lantern, updatedAt: serverTimestamp() }, { merge: true });
}

export async function setSleepState(coupleId, user, asleep) {
  const state = {
    asleep,
    userId: user?.uid || 'local',
    displayName: user?.displayName || user?.email || 'You',
    updatedAt: new Date().toISOString(),
  };

  if (!firebaseEnabled || !coupleId) {
    const sky = localSky();
    saveLocalSky({
      ...sky,
      sleep: { ...sky.sleep, [state.userId]: state },
      stats: { ...sky.stats, sleepRituals: (sky.stats?.sleepRituals || 0) + 1 },
    });
    return;
  }

  await setDoc(doc(db, 'couples', coupleId, 'sleepStates', user.uid), { ...state, updatedAt: serverTimestamp() }, { merge: true });
  await setDoc(doc(db, 'couples', coupleId, 'skyStats', 'shared'), { sleepRituals: increment(1), updatedAt: serverTimestamp() }, { merge: true });
}

export async function touchSkyStar(coupleId, user, star) {
  const userId = user?.uid || 'local';
  const touchedAt = new Date().toISOString();

  if (!firebaseEnabled || !coupleId) {
    const sky = localSky();
    const previous = sky.touches?.[star.id] || {};
    saveLocalSky({ ...sky, touches: { ...sky.touches, [star.id]: { ...previous, [userId]: touchedAt } } });
    return;
  }

  await setDoc(
    doc(db, 'couples', coupleId, 'starTouches', star.id),
    { [user.uid]: touchedAt, starTitle: star.title || star.kind || 'Star', updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function uploadRightNowPhoto(coupleId, user, file, caption) {
  if (!file) return;
  if (file.size > maxPhotoBytes) throw new Error('Photo is too large. Max 10MB.');
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image.');

  const photo = {
    caption: String(caption || '').slice(0, 240),
    senderId: user?.uid || 'local',
    senderName: user?.displayName || user?.email || 'You',
    createdAt: new Date().toISOString(),
  };

  if (!firebaseEnabled || !coupleId || !storage) {
    const url = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result?.toString() || '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const photos = readLocal(nowPhotosKey, []);
    writeLocal(nowPhotosKey, [{ ...photo, id: crypto.randomUUID(), photoUrl: url }, ...photos].slice(0, 20));
    window.dispatchEvent(new Event('ohu-night-sky-local-change'));
    return;
  }

  const extension = file.name.split('.').pop() || 'jpg';
  const objectRef = ref(storage, `couples/${coupleId}/right-now/${user.uid}/${Date.now()}-${crypto.randomUUID()}.${extension}`);
  await uploadBytes(objectRef, file, { contentType: file.type });
  const photoUrl = await getDownloadURL(objectRef);
  await addDoc(pathFor(coupleId, 'rightNowPhotos'), { ...photo, photoUrl, createdAt: serverTimestamp() });
}
