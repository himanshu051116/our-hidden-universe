import { auth, firebaseEnabled } from './firebase.js';

export const FALLBACK_ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

export async function resolveIceServers(coupleId) {
  if (!firebaseEnabled || !auth?.currentUser || !coupleId) {
    return {
      iceServers: FALLBACK_ICE_SERVERS,
      relayAvailable: false,
      expiresAt: null,
      warning: 'TURN credentials are unavailable in local/demo mode.',
    };
  }

  try {
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch('/api/turn-credentials', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      credentials: 'same-origin',
      body: JSON.stringify({ coupleId }),
    });

    if (!response.ok) {
      throw new Error(`TURN endpoint returned ${response.status}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload.iceServers) || !payload.iceServers.length) {
      throw new Error('TURN endpoint returned no ICE servers.');
    }

    return {
      iceServers: payload.iceServers,
      relayAvailable: payload.iceServers.some((entry) =>
        (Array.isArray(entry.urls) ? entry.urls : [entry.urls])
          .filter(Boolean)
          .some((url) => String(url).startsWith('turn:') || String(url).startsWith('turns:')),
      ),
      expiresAt: payload.expiresAt || null,
      warning: '',
    };
  } catch {
    return {
      iceServers: FALLBACK_ICE_SERVERS,
      relayAvailable: false,
      expiresAt: null,
      warning: 'TURN unavailable; this call is using STUN-only fallback.',
    };
  }
}
