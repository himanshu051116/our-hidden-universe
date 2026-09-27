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
      const roomRef = doc(db, 'couples', roomCode);
      const memberRef = doc(db, 'couples', roomCode, 'members', credential.user.uid);

      try {
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

          transaction.set(memberRef, {
            joinedAt: serverTimestamp(),
            role: 'creator',
            lastActiveAt: serverTimestamp(),
            displayName: credential.user.displayName || credential.user.email || 'You',
          });
        });
      } catch (error) {
        if (created) await deleteUser(credential.user);
        await signOut(auth);
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
    const roomRef = doc(db, 'couples', roomCode);
    const memberRef = doc(db, 'couples', roomCode, 'members', credential.user.uid);

    try {
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
          // One-time migration for legacy rooms.
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
          transaction.set(memberRef, {
            joinedAt: serverTimestamp(),
            role: room.createdBy === credential.user.uid ? 'creator' : 'partner',
            lastActiveAt: serverTimestamp(),
            displayName: credential.user.displayName || credential.user.email || 'You',
          });
        }
      });
    } catch (error) {
      if (created) await deleteUser(credential.user);
      await signOut(auth);
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
