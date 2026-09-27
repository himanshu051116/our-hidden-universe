const required = [
  'OHS_TEST_BASE_URL',
  'VITE_FIREBASE_API_KEY',
  'OHS_TEST_USER_A_EMAIL',
  'OHS_TEST_USER_A_PASSWORD',
  'OHS_TEST_COUPLE_CODE',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing live-probe environment: ${missing.join(', ')}`);
  process.exit(2);
}

const base = process.env.OHS_TEST_BASE_URL.replace(/\/+$/, '');

function mark(kind, message) {
  console.log(`${kind.padEnd(5)} ${message}`);
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    redirect: 'follow',
    ...options,
  });
  return response;
}

async function firebaseSignIn() {
  const endpoint =
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword`
    + `?key=${encodeURIComponent(process.env.VITE_FIREBASE_API_KEY)}`;

  const response = await request(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.OHS_TEST_USER_A_EMAIL,
      password: process.env.OHS_TEST_USER_A_PASSWORD,
      returnSecureToken: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Firebase test-user sign-in failed (${response.status}).`);
  }

  return response.json();
}

let failed = 0;

async function check(label, fn) {
  try {
    await fn();
    mark('PASS', label);
  } catch (error) {
    failed += 1;
    mark('FAIL', `${label}: ${error.message}`);
  }
}

await check('landing page responds', async () => {
  const response = await request(`${base}/`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
});

await check('service worker is published', async () => {
  const response = await request(`${base}/sw.js`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.text();
  if (!body.includes('firebase') && !body.includes('messaging')) {
    throw new Error('service worker does not appear to contain messaging code');
  }
});

let session;
await check('Firebase test account authenticates', async () => {
  session = await firebaseSignIn();
  if (!session.idToken) throw new Error('no Firebase ID token returned');
});

if (session?.idToken) {
  await check('call health endpoint is authenticated and healthy', async () => {
    const response = await request(`${base}/api/call-health`, {
      headers: {
        Authorization: `Bearer ${session.idToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const health = await response.json();
    if (!health.firebaseAdmin) throw new Error('Firebase Admin unavailable');
    if (!health.turnConfigured) throw new Error('TURN is not configured');
    if (!health.cronSecretConfigured) throw new Error('CRON_SECRET is not configured');
    if (Number(health.nodeMajor) < 22) throw new Error(`Node ${health.nodeMajor} is too old`);
  });

  await check('TURN endpoint returns relay credentials', async () => {
    const response = await request(`${base}/api/turn-credentials`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.idToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({
        coupleId: process.env.OHS_TEST_COUPLE_CODE,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json();
    const servers = Array.isArray(payload.iceServers) ? payload.iceServers : [];
    const turn = servers.find((entry) =>
      (Array.isArray(entry.urls) ? entry.urls : [entry.urls])
        .filter(Boolean)
        .some((url) => String(url).startsWith('turn:') || String(url).startsWith('turns:')),
    );

    if (!turn) throw new Error('no TURN server returned');
    if (!turn.username || !turn.credential) {
      throw new Error('TURN server lacks temporary username/credential');
    }
  });
}

await check('cleanup endpoint rejects unauthenticated callers', async () => {
  const response = await request(`${base}/api/calls-cleanup`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (response.status !== 401) {
    throw new Error(`expected HTTP 401, received ${response.status}`);
  }
});

console.log('');
if (failed) {
  console.error(`Live call probe failed ${failed} check(s).`);
  process.exit(1);
}

console.log('Live call probe passed.');
