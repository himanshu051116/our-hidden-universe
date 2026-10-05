import { getAdminServices } from './_firebaseAdmin.js';

function publicHealthFlags() {
  return {
    turnConfigured: Boolean(process.env.TURN_URLS && process.env.TURN_SHARED_SECRET),
    cronSecretConfigured: Boolean(process.env.CRON_SECRET),
    vapidConfigured: Boolean(process.env.VITE_FIREBASE_VAPID_KEY),
    nodeMajor: Number(process.versions.node.split('.')[0]),
  };
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const authHeader = request.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { auth, db } = getAdminServices();
    const decoded = await auth.verifyIdToken(idToken);

    await db.doc(`users/${decoded.uid}`).get();

    response.status(200).json({
      firebaseAdmin: true,
      pushServerConfigured: true,
      ...publicHealthFlags(),
      checkedAt: new Date().toISOString(),
    });
  } catch {
    response.status(500).json({
      firebaseAdmin: false,
      pushServerConfigured: false,
      ...publicHealthFlags(),
      error: 'Call infrastructure health check failed.',
    });
  }
}
