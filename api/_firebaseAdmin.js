import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing server environment variable: ${name}`);
  }
  return value;
}

function adminApp() {
  if (getApps().length) return getApps()[0];

  const projectId = required('FIREBASE_ADMIN_PROJECT_ID');
  const clientEmail = required('FIREBASE_ADMIN_CLIENT_EMAIL');
  const privateKey = required('FIREBASE_ADMIN_PRIVATE_KEY').replace(/\\n/g, '\n');

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
  });
}

export function getAdminServices() {
  const app = adminApp();
  return {
    auth: getAuth(app),
    db: getFirestore(app),
    messaging: getMessaging(app),
  };
}
