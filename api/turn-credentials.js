import { createHmac } from 'node:crypto';
import { getAdminServices } from './_firebaseAdmin.js';

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

function credentialTtlSeconds() {
  const requested = Number(process.env.TURN_CREDENTIAL_TTL_SECONDS || 600);
  if (!Number.isFinite(requested)) return 600;
  return Math.max(120, Math.min(900, Math.floor(requested)));
}

function unauthorized(response, message = 'Unauthorized') {
  response.status(401).json({ error: message });
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const authHeader = request.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
      unauthorized(response);
      return;
    }

    const { coupleId } = parseBody(request.body);
    const normalizedCoupleId = String(coupleId || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!normalizedCoupleId || normalizedCoupleId.length < 6 || normalizedCoupleId.length > 64) {
      response.status(400).json({ error: 'Invalid couple room.' });
      return;
    }

    const turnUrls = parseList(process.env.TURN_URLS);
    const sharedSecret = process.env.TURN_SHARED_SECRET;
    if (!turnUrls.length || !sharedSecret) {
      response.status(503).json({ error: 'TURN is not configured.' });
      return;
    }

    const { auth, db } = getAdminServices();
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const member = await db
      .doc(`couples/${normalizedCoupleId}/members/${uid}`)
      .get();

    if (!member.exists) {
      unauthorized(response, 'You are not a member of this couple room.');
      return;
    }

    const ttl = credentialTtlSeconds();
    const expiresAtSeconds = Math.floor(Date.now() / 1000) + ttl;
    const username = `${expiresAtSeconds}:${uid}`;
    const credential = createHmac('sha1', sharedSecret)
      .update(username)
      .digest('base64');

    const stunUrls = parseList(process.env.TURN_STUN_URLS);
    const iceServers = [];

    if (stunUrls.length) {
      iceServers.push({ urls: stunUrls });
    }

    iceServers.push({
      urls: turnUrls,
      username,
      credential,
    });

    response.status(200).json({
      iceServers,
      expiresAt: expiresAtSeconds * 1000,
      ttlSeconds: ttl,
    });
  } catch (error) {
    const code = error?.code || '';
    if (String(code).startsWith('auth/')) {
      unauthorized(response, 'Invalid or expired Firebase session.');
      return;
    }

    console.error('TURN credential endpoint failed:', error?.message || error);
    response.status(500).json({ error: 'Unable to issue call credentials.' });
  }
}
