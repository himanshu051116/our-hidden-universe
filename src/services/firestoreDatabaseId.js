// A single database identity for the browser, Vercel functions, and rules tests.
// The existing OHS frontend and firebase.json explicitly target the *named*
// Firestore database "default". Do NOT silently switch to "(default)" here:
// the latter is a different database and may contain different user data.
export const OHS_FIRESTORE_DATABASE_ID = 'default';

export function resolveFirestoreDatabaseId(value) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : OHS_FIRESTORE_DATABASE_ID;
}

export function resolveAdminFirestoreDatabaseId(env = {}) {
  const browserId = resolveFirestoreDatabaseId(env.VITE_FIRESTORE_DATABASE_ID);
  const explicitAdminId = typeof env.FIRESTORE_DATABASE_ID === 'string'
    ? env.FIRESTORE_DATABASE_ID.trim()
    : '';

  if (explicitAdminId && env.VITE_FIRESTORE_DATABASE_ID && explicitAdminId !== browserId) {
    throw new Error('Firestore database IDs disagree between the browser and server.');
  }

  return explicitAdminId || browserId;
}
