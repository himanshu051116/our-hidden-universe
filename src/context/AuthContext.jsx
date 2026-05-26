import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, firebaseEnabled } from '../services/firebase';

const AuthContext = createContext(null);
const demoUser = { uid: 'demo-lover', email: 'demo@ourhiddenuniverse.app', displayName: 'You' };

function normalizeSecretCode(value) {
  const raw = String(value ?? '').trim();
  const dequoted = raw.replace(/^["'](.*)["']$/, '$1').trim();
  return dequoted.toLowerCase();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (localStorage.getItem('ohu-demo-session') ? demoUser : null));
  const [loading, setLoading] = useState(firebaseEnabled);

  useEffect(() => {
    if (!firebaseEnabled) return undefined;
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  async function login(email, password, accessCode, mode = 'login') {
    const expectedCode = import.meta.env.VITE_COUPLE_ACCESS_CODE || 'forever-us';
    const provided = normalizeSecretCode(accessCode);
    const expected = normalizeSecretCode(expectedCode);

    if (!provided || provided !== expected) {
      throw new Error('The couple secret code is incorrect. Please check spelling and spaces.');
    }

    if (!firebaseEnabled) {
      localStorage.setItem('ohu-demo-session', 'true');
      setUser(demoUser);
      return demoUser;
    }

    const credential =
      mode === 'signup'
        ? await createUserWithEmailAndPassword(auth, email, password)
        : await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  }

  async function logout() {
    localStorage.removeItem('ohu-demo-session');
    if (firebaseEnabled) await signOut(auth);
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      coupleId: 'hidden-universe',
      sharedSecret: import.meta.env.VITE_COUPLE_ACCESS_CODE || 'forever-us',
      hasCustomAccessCode: Boolean(import.meta.env.VITE_COUPLE_ACCESS_CODE),
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
