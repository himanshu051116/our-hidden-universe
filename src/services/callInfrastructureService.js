import { auth, firebaseEnabled } from './firebase.js';

export async function fetchCallInfrastructureHealth() {
  if (!firebaseEnabled || !auth?.currentUser) {
    return {
      ok: false,
      firebaseAdmin: false,
      turnConfigured: false,
      cronSecretConfigured: false,
      error: 'Not signed in.',
    };
  }

  try {
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch('/api/call-health', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      cache: 'no-store',
      credentials: 'same-origin',
    });

    const payload = await response.json();

    return {
      ok: response.ok,
      ...payload,
    };
  } catch {
    return {
      ok: false,
      firebaseAdmin: false,
      turnConfigured: false,
      cronSecretConfigured: false,
      error: 'Health endpoint is unavailable.',
    };
  }
}
