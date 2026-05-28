import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const fallbackFirebaseConfig = {
  apiKey: 'AIzaSyCQMSKneV4KmH3qpyWN7-ag-c0s9_CdFD8',
  authDomain: 'secret-space0.firebaseapp.com',
  projectId: 'secret-space0',
  storageBucket: 'secret-space0.firebasestorage.app',
  messagingSenderId: '1005220151892',
  appId: '1:1005220151892:web:2753295f95cb56caed23c1',
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || fallbackFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || fallbackFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || fallbackFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || fallbackFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fallbackFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || fallbackFirebaseConfig.appId,
};

const firestoreDatabaseId = import.meta.env.VITE_FIRESTORE_DATABASE_ID || 'default';

export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const app = firebaseEnabled ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app, firestoreDatabaseId) : null;
export const storage = app ? getStorage(app) : null;

if (auth) {
  setPersistence(auth, browserLocalPersistence);
}
