import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, firebaseEnabled } from '../services/firebase';

const AuthContext = createContext(null);
const demoUser = { uid: 'demo-lover', email: 'demo@ourhiddenuniverse.app', displayName: 'You' };
const roomStorageKey = 'ohu-couple-room';

function normalizeCoupleCode(value) {
  return String(value ?? '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .trim();
}

function formatCoupleCode(code) {
  const normalized = normalizeCoupleCode(code);
  return normalized.match(/.{1,4}/g)?.join('-') || normalized;
}

function generateCoupleCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const raw = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  return formatCoupleCode(raw);
}

function isMissingAccountError(error) {
  return error?.code === 'auth/user-not-found' || error?.code === 'auth/invalid-credential';
}

function isPermissionDenied(error) {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return (
    code === 'permission-denied'
    || code === 'firestore/permission-denied'
    || message.includes('missing or insufficient permissions')
  );
}

async function signInOrCreateUser(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return { credential, created: false };
  } catch (error) {
    if (!isMissingAccountError(error)) throw error;

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      return { credential, created: true };
    } catch (createError) {
      if (createError?.code === 'auth/email-already-in-use') {
        throw new Error('That email already has an account. Check the password, then try again.');
      }
      throw createError;
    }
  }
}

function normalizeMemberIds(roomData) {
  if (Array.isArray(roomData?.memberIds) && roomData.memberIds.length) {
    return [...new Set(roomData.memberIds.filter(Boolean))];
  }
  return roomData?.createdBy ? [roomData.createdBy] : [];
}

function memberPayload(user, role) {
  return {
    joinedAt: serverTimestamp(),
    role,
    lastActiveAt: serverTimestamp(),
    displayName: user.displayName || user.email || 'You',
  };
}

async function createRoomV5(credential, roomCode) {
  const roomRef = doc(db, 'couples', roomCode);
  const memberRef = doc(db, 'couples', roomCode, 'members', credential.user.uid);

  await runTransaction(db, async (transaction) => {
    const roomSnapshot = await transaction.get(roomRef);
    if (roomSnapshot.exists()) {
      throw new Error('That couple code is already taken. Please create a different one.');
    }

    transaction.set(roomRef, {
      code: roomCode,
      displayCode: formatCoupleCode(roomCode),
      createdBy: credential.user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      memberIds: [credential.user.uid],
      memberCount: 1,
    });

    transaction.set(memberRef, memberPayload(credential.user, 'creator'));
  });
}

async function createRoomLegacy(credential, roomCode) {
  const roomRef = doc(db, 'couples', roomCode);
  const memberRef = doc(db, 'couples', roomCode, 'members', credential.user.uid);

  await runTransaction(db, async (transaction) => {
    const roomSnapshot = await transaction.get(roomRef);
    if (roomSnapshot.exists()) {
      throw new Error('That couple code is already taken. Please create a different one.');
    }

    transaction.set(roomRef, {
      code: roomCode,
      displayCode: formatCoupleCode(roomCode),
      createdBy: credential.user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.set(memberRef, memberPayload(credential.user, 'creator'));
  });
}

async function joinRoomV5(credential, roomCode) {
  const roomRef = doc(db, 'couples', roomCode);
  const memberRef = doc(db, 'couples', roomCode, 'members', credential.user.uid);

  await runTransaction(db, async (transaction) => {
    const roomSnapshot = await transaction.get(roomRef);
    if (!roomSnapshot.exists()) {
      throw new Error('No private room was found for that couple code.');
    }

    const memberSnapshot = await transaction.get(memberRef);
    const room = roomSnapshot.data();
    const memberIds = normalizeMemberIds(room);
    const alreadyMember = memberIds.includes(credential.user.uid);

    if (!alreadyMember) {
      if (memberIds.length >= 2) {
        throw new Error('This private room already has two members.');
      }

      memberIds.push(credential.user.uid);
      transaction.update(roomRef, {
        memberIds,
        memberCount: memberIds.length,
        updatedAt: serverTimestamp(),
      });
    } else if (!Array.isArray(room.memberIds) || room.memberCount !== memberIds.length) {
      transaction.update(roomRef, {
        memberIds,
        memberCount: memberIds.length,
        updatedAt: serverTimestamp(),
      });
    }

    if (memberSnapshot.exists()) {
      transaction.update(memberRef, {
        lastActiveAt: serverTimestamp(),
        displayName: credential.user.displayName || credential.user.email || 'You',
      });
    } else {
      transaction.set(
        memberRef,
        memberPayload(credential.user, room.createdBy === credential.user.uid ? 'creator' : 'partner'),
      );
    }
  });
}

async function joinRoomLegacy(credential, roomCode) {
  const roomRef = doc(db, 'couples', roomCode);
  const roomSnapshot = await getDoc(roomRef);

  if (!roomSnapshot.exists()) {
    throw new Error('No private room was found for that couple code.');
  }

  const room = roomSnapshot.data();
  const memberIds = normalizeMemberIds(room);
  const alreadyMember = memberIds.includes(credential.user.uid);

  if (!alreadyMember && Number(room?.memberCount) >= 2) {
    throw new Error('This private room already has two members.');
  }

  await setDoc(
    doc(db, 'couples', roomCode, 'members', credential.user.uid),
    memberPayload(credential.user, room.createdBy === credential.user.uid ? 'creator' : 'partner'),
    { merge: true },
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (localStorage.getItem('ohu-demo-session') ? demoUser : null));
  const [coupleCode, setCoupleCode] = useState(() => localStorage.getItem(roomStorageKey) || '');
  const [loading, setLoading] = useState(firebaseEnabled);

  useEffect(() => {
    if (!firebaseEnabled) return undefined;
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  // Session restore may refresh presence, but it must never create membership
  // or overwrite creator/partner role.
  useEffect(() => {
    if (!firebaseEnabled || !user?.uid || !coupleCode) return;

    const memberRef = doc(db, 'couples', coupleCode, 'members', user.uid);

    getDoc(memberRef)
      .then((snapshot) => {
        if (!snapshot.exists()) return;
        return updateDoc(memberRef, {
          lastActiveAt: serverTimestamp(),
          displayName: user.displayName || user.email || 'You',
        });
      })
      .catch(() => {});
  }, [user?.uid, user?.displayName, user?.email, coupleCode]);

  async function login(email, password, accessCode, mode = 'login') {
    if (!firebaseEnabled) {
      localStorage.setItem('ohu-demo-session', 'true');
      const localCode = normalizeCoupleCode(accessCode) || normalizeCoupleCode(generateCoupleCode());
      localStorage.setItem(roomStorageKey, localCode);
      setCoupleCode(localCode);
      setUser(demoUser);
      return demoUser;
    }

    const requestedCode = normalizeCoupleCode(accessCode);

    if (mode === 'signup') {
      const { credential, created } = await signInOrCreateUser(email, password);
      const roomCode = requestedCode || normalizeCoupleCode(generateCoupleCode());

      try {
        try {
          await createRoomV5(credential, roomCode);
        } catch (error) {
          if (!isPermissionDenied(error)) throw error;
          await createRoomLegacy(credential, roomCode);
        }
      } catch (error) {
        if (created) await deleteUser(credential.user).catch(() => {});
        await signOut(auth).catch(() => {});
        throw error;
      }

      localStorage.setItem(roomStorageKey, roomCode);
      setCoupleCode(roomCode);
      setUser(credential.user);
      return credential.user;
    }

    const roomCode = requestedCode;
    if (!roomCode) {
      throw new Error('Enter the couple code your partner shared with you.');
    }

    const { credential, created } = await signInOrCreateUser(email, password);

    try {
      try {
        await joinRoomV5(credential, roomCode);
      } catch (error) {
        if (!isPermissionDenied(error)) throw error;
        await joinRoomLegacy(credential, roomCode);
      }
    } catch (error) {
      if (created) await deleteUser(credential.user).catch(() => {});
      await signOut(auth).catch(() => {});
      throw error;
    }

    localStorage.setItem(roomStorageKey, roomCode);
    setCoupleCode(roomCode);
    setUser(credential.user);
    return credential.user;
  }

  async function logout() {
    localStorage.removeItem('ohu-demo-session');
    localStorage.removeItem(roomStorageKey);
    if (firebaseEnabled) await signOut(auth);
    setUser(null);
    setCoupleCode('');
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      coupleId: coupleCode || 'demo-room',
      coupleCode,
      coupleCodeDisplay: coupleCode ? formatCoupleCode(coupleCode) : '',
      sharedSecret: coupleCode || import.meta.env.VITE_COUPLE_ACCESS_CODE || 'forever-us',
    }),
    [user, loading, coupleCode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
