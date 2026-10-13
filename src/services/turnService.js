import { auth, firebaseEnabled } from './firebase.js';
import { validateIceServers } from './iceServerConfig.js';

export const FALLBACK_ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

export async function resolveIceServers(coupleId) {
  if (!firebaseEnabled || !auth?.currentUser || !coupleId) {
    return {
      iceServers: FALLBACK_ICE_SERVERS,
      relayAvailable: false,
      expiresAt: null,
      warning: 'TURN relay is unavailable in local/demo mode.',
    };
  }

  try {
    const idToken = await auth.currentUser.getIdToken();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    let response;
    try {
      response = await fetch('/api/turn-credentials', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      credentials: 'same-origin',
      body: JSON.stringify({ coupleId }),
      signal: controller.signal,
    });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`TURN endpoint returned ${response.status}`);
    }

    const payload = await response.json();
    const safeServers = validateIceServers(payload.iceServers);
    if (!safeServers.length) throw new Error('TURN endpoint returned no valid ICE servers.');
    if (payload.expiresAt && Number(payload.expiresAt) <= Date.now() + 15_000) {
      throw new Error('TURN credentials are already expiring.');
    }

    const relayAvailable = safeServers.some((entry) =>
      (Array.isArray(entry.urls) ? entry.urls : [entry.urls])
        .some((url) => /^turns?:/i.test(String(url))),
    );
    return {
      iceServers: [...FALLBACK_ICE_SERVERS, ...safeServers],
      relayAvailable,
      expiresAt: payload.expiresAt || null,
      warning: relayAvailable ? '' : 'No usable TURN relay was returned; using STUN only.',
    };
  } catch {
    return {
      iceServers: FALLBACK_ICE_SERVERS,
      relayAvailable: false,
      expiresAt: null,
      warning: 'TURN relay is not configured or reachable. STUN-only calling may fail on restrictive networks.',
    };
  }
}
