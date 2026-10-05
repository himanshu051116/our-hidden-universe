import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase.js';

const profileKey = 'ohu-couple-profile-v1';
const readTogetherKey = 'ohu-read-together-v1';
const openWhenKey = 'ohu-open-when-v1';

export function loadLocalProfile() {
  try {
    const parsed = JSON.parse(localStorage.getItem(profileKey) || '{}');
    return {
      coupleName: typeof parsed.coupleName === 'string' ? parsed.coupleName : 'Our Hidden Universe',
      relationshipStart: typeof parsed.relationshipStart === 'string' ? parsed.relationshipStart : '',
    };
  } catch {
    return { coupleName: 'Our Hidden Universe', relationshipStart: '' };
  }
}

export function saveLocalProfile(profile) {
  localStorage.setItem(profileKey, JSON.stringify(profile));
}

export function loadLocalReadTogether() {
  try {
    const parsed = JSON.parse(localStorage.getItem(readTogetherKey) || '{}');
    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      link: typeof parsed.link === 'string' ? parsed.link : '',
      selfChapter: typeof parsed.selfChapter === 'string' ? parsed.selfChapter : '',
      selfPage: typeof parsed.selfPage === 'string' ? parsed.selfPage : '',
      partnerChapter: typeof parsed.partnerChapter === 'string' ? parsed.partnerChapter : '',
      partnerPage: typeof parsed.partnerPage === 'string' ? parsed.partnerPage : '',
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return {
      title: '',
      link: '',
      selfChapter: '',
      selfPage: '',
      partnerChapter: '',
      partnerPage: '',
      updatedAt: '',
    };
  }
}

export function saveLocalReadTogether(state) {
  localStorage.setItem(readTogetherKey, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }));
}

export function subscribeCoupleMembers(coupleId, onChange, onError) {
  if (!firebaseEnabled || !coupleId) return undefined;
  return onSnapshot(
    collection(db, 'couples', coupleId, 'members'),
    (snapshot) => onChange(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))),
    (error) => onError?.(error),
  );
}

export async function touchMemberPresence(coupleId, user) {
  if (!firebaseEnabled || !coupleId || !user?.uid) return;
  await updateDoc(
    doc(db, 'couples', coupleId, 'members', user.uid),
    {
      displayName: user.displayName || user.email || 'You',
      lastActiveAt: serverTimestamp(),
    },
  );
}

export function subscribeReadTogether(coupleId, onChange) {
  if (!firebaseEnabled || !coupleId) return undefined;
  return onSnapshot(doc(db, 'couples', coupleId, 'readTogether', 'current'), (snapshot) => {
    onChange(snapshot.exists() ? snapshot.data() : loadLocalReadTogether());
  });
}

export async function saveReadTogether(coupleId, user, state) {
  if (!firebaseEnabled || !coupleId || !user?.uid) {
    saveLocalReadTogether(state);
    return;
  }

  await setDoc(
    doc(db, 'couples', coupleId, 'readTogether', 'current'),
    {
      title: state.title || '',
      link: state.link || '',
      progressByUser: {
        [user.uid]: {
          chapter: state.selfChapter || '',
          page: state.selfPage || '',
          displayName: user.displayName || user.email || 'You',
          updatedAt: new Date().toISOString(),
        },
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

function bucketSortValue(item) {
  const value = item?.createdAt;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function subscribeBucketList(coupleId, onChange, onError) {
  if (!firebaseEnabled || !coupleId) return undefined;
  return onSnapshot(
    collection(db, 'couples', coupleId, 'bucketList'),
    (snapshot) => {
      const items = snapshot.docs
        .map((entry) => ({ id: entry.id, ...entry.data() }))
        .sort((a, b) => bucketSortValue(a) - bucketSortValue(b));
      onChange(items);
    },
    (error) => onError?.(error),
  );
}

export async function saveBucketItem(coupleId, user, item) {
  if (!firebaseEnabled || !coupleId || !user?.uid || !item?.id) return;
  await setDoc(
    doc(db, 'couples', coupleId, 'bucketList', item.id),
    {
      text: String(item.text || '').trim().slice(0, 240),
      done: Boolean(item.done),
      createdAt: item.createdAt || new Date().toISOString(),
      createdBy: item.createdBy || user.uid,
      updatedBy: user.uid,
      updatedByName: user.displayName || user.email || 'You',
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function removeBucketItem(coupleId, itemId) {
  if (!firebaseEnabled || !coupleId || !itemId) return;
  await deleteDoc(doc(db, 'couples', coupleId, 'bucketList', itemId));
}

export async function migrateLocalBucketList(coupleId, user, items) {
  if (!firebaseEnabled || !coupleId || !user?.uid || !Array.isArray(items) || !items.length) {
    return { migrated: false, reason: 'nothing-to-migrate' };
  }

  const bucketRef = collection(db, 'couples', coupleId, 'bucketList');
  const existing = await getDocs(bucketRef);
  if (!existing.empty) return { migrated: false, reason: 'shared-list-exists' };

  const batch = writeBatch(db);
  items.slice(0, 100).forEach((item, index) => {
    const id = item?.id || crypto.randomUUID();
    batch.set(doc(db, 'couples', coupleId, 'bucketList', id), {
      text: String(item?.text || '').trim().slice(0, 240),
      done: Boolean(item?.done),
      createdAt: item?.createdAt || new Date(Date.now() + index).toISOString(),
      createdBy: user.uid,
      updatedBy: user.uid,
      updatedByName: user.displayName || user.email || 'You',
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
  return { migrated: true, reason: 'migrated' };
}

export function loadLocalOpenWhen() {
  try {
    const parsed = JSON.parse(localStorage.getItem(openWhenKey) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalOpenWhenItem(item) {
  const previous = loadLocalOpenWhen();
  const next = [
    ...previous.filter((entry) => entry.id !== item.id),
    { ...item, updatedAt: new Date().toISOString() },
  ];
  localStorage.setItem(openWhenKey, JSON.stringify(next));
  return next;
}

function deleteLocalOpenWhenItem(itemId) {
  const next = loadLocalOpenWhen().filter((entry) => entry.id !== itemId);
  localStorage.setItem(openWhenKey, JSON.stringify(next));
  return next;
}

export function subscribeOpenWhen(coupleId, onChange, onError) {
  if (!firebaseEnabled || !coupleId) {
    onChange(loadLocalOpenWhen());
    return undefined;
  }

  return onSnapshot(
    collection(db, 'couples', coupleId, 'openWhen'),
    (snapshot) => onChange(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))),
    (error) => onError?.(error),
  );
}

export async function saveOpenWhen(coupleId, user, item) {
  const now = new Date().toISOString();
  const payload = {
    title: String(item.title || '').trim().slice(0, 100),
    message: String(item.message || '').trim().slice(0, 4000),
    musicUrl: String(item.musicUrl || '').trim().slice(0, 1000),
    videoUrl: String(item.videoUrl || '').trim().slice(0, 1000),
    createdAt: item.createdAt || now,
    updatedBy: user?.uid || 'local',
    updatedByName: user?.displayName || user?.email || 'You',
  };

  if (!firebaseEnabled || !coupleId || !user?.uid) {
    saveLocalOpenWhenItem({ id: item.id, ...payload });
    return;
  }

  await touchMemberPresence(coupleId, user);

  await setDoc(
    doc(db, 'couples', coupleId, 'openWhen', item.id),
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function deleteOpenWhen(coupleId, itemId) {
  if (!itemId) return;
  if (!firebaseEnabled || !coupleId) {
    deleteLocalOpenWhenItem(itemId);
    return;
  }
  await deleteDoc(doc(db, 'couples', coupleId, 'openWhen', itemId));
}
