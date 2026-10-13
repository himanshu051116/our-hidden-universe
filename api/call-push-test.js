import { getAdminServices } from './_firebaseAdmin.js';
import { createPushTestMessage } from './_callPushPayload.js';

// Authenticated self-test: never permits an arbitrary target or another member's devices.
export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const token = (request.headers.authorization || '').replace(/^Bearer /, '');
  const coupleId = String(request.body?.coupleId || '')
    .replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!token || coupleId.length < 6 || coupleId.length > 64) {
    response.status(400).json({ error: 'Authentication and a valid universe are required.' });
    return;
  }
  try {
    const { auth, db, messaging } = getAdminServices();
    const session = await auth.verifyIdToken(token);
    const member = db.doc(`couples/${coupleId}/members/${session.uid}`);
    if (!(await member.get()).exists) {
      response.status(403).json({ error: 'Not a member of this universe.' });
      return;
    }
    // Limit test volume; the requester can test only their own registered devices.
    const registration = await member.collection('devices').where('enabled', '==', true).limit(20).get();
    const devices = registration.docs.map((entry) => entry.data())
      .filter((device) => (device.platform === 'web' || device.platform === 'android')
        && (device.targetType === 'fid' || device.targetType === 'token')
        && typeof device.targetId === 'string' && device.targetId.length > 10);
    if (!devices.length) {
      response.status(200).json({ delivered: 0, failed: 0, reason: 'no-registered-devices' });
      return;
    }
    const result = await messaging.sendEach(devices.map(createPushTestMessage));
    response.status(200).json({
      delivered: result.successCount,
      failed: result.failureCount,
      reason: result.successCount ? '' : 'all-deliveries-failed',
    });
  } catch (error) {
    if (String(error?.code || '').startsWith('auth/')) {
      response.status(401).json({ error: 'Invalid or expired Firebase session.' });
      return;
    }
    console.error('Call push self-test failed:', error?.message || error);
    response.status(503).json({ error: 'Push service is not configured or reachable.' });
  }
}
