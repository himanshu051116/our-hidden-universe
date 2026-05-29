import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase.js';

const profileKey = 'ohu-couple-profile-v1';
const readTogetherKey = 'ohu-read-together-v1';

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

export function subscribeCoupleMembers(coupleId, onChange) {
  if (!firebaseEnabled || !coupleId) return undefined;
  return onSnapshot(collection(db, 'couples', coupleId, 'members'), (snapshot) => {
    onChange(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
  });
}

export async function touchMemberPresence(coupleId, user) {
  if (!firebaseEnabled || !coupleId || !user?.uid) return;
  await setDoc(
    doc(db, 'couples', coupleId, 'members', user.uid),
    {
      displayName: user.displayName || user.email || 'You',
      lastActiveAt: serverTimestamp(),
    },
    { merge: true },
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
