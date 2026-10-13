import test from 'node:test';
import assert from 'node:assert/strict';
import { issueCloudflareTurnCredentials, cloudflareTurnConfigured } from '../api/_cloudflareTurn.js';
import { createCallPushMessage, createPushTestMessage, safeNotificationOrigin } from '../api/_callPushPayload.js';

test('TURN adapter requests short-lived ICE credentials only from the provider endpoint', async () => {
  let called;
  const result = await issueCloudflareTurnCredentials({
    keyId: 'abcdef0123456789',
    apiToken: 'mock-secret-not-real',
    ttlSeconds: 14400,
    fetchImpl: async (url, options) => {
      called = { url, options };
      return { ok: true, json: async () => ({ iceServers: [
        { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'] },
        { urls: [
          'turn:turn.cloudflare.com:3478?transport=udp',
          'turn:turn.cloudflare.com:53?transport=udp',
          'turns:turn.cloudflare.com:443?transport=tcp',
        ], username: 'short-lived-user', credential: 'short-lived-credential' },
      ] }) };
    },
  });
  assert.equal(called.url, 'https://rtc.live.cloudflare.com/v1/turn/keys/abcdef0123456789/credentials/generate-ice-servers');
  assert.equal(called.options.headers.Authorization, 'Bearer mock-secret-not-real');
  assert.equal(JSON.parse(called.options.body).ttl, 14400);
  assert.equal(result.provider, 'cloudflare');
  assert.equal(result.iceServers.length, 2);
  assert.ok(result.iceServers.every((x) => x.urls.every((url) => !url.includes(':53'))));
  assert.equal(JSON.stringify(result).includes('mock-secret-not-real'), false);
});

test('TURN adapter rejects unauthorized provider replies and empty relays', async () => {
  await assert.rejects(issueCloudflareTurnCredentials({
    keyId: 'abcdef0123456789', apiToken: 'test',
    fetchImpl: async () => ({ ok: false, status: 401 }),
  }), /HTTP 401/);
  await assert.rejects(issueCloudflareTurnCredentials({
    keyId: 'abcdef0123456789', apiToken: 'test',
    fetchImpl: async () => ({ ok: true, json: async () => ({ iceServers: [{ urls: 'stun:example.test:3478' }] }) }),
  }), /lacked authenticated TURN/);
  assert.equal(cloudflareTurnConfigured({ CLOUDFLARE_TURN_KEY_ID: 'key', CLOUDFLARE_TURN_API_TOKEN: 'token' }), true);
});

const call = { id: 'call-123', coupleId: 'COUPLECODE', type: 'video' };

test('web push uses FID data-only payload for custom service-worker notification', () => {
  const payload = createCallPushMessage(
    { platform: 'web', targetType: 'fid', targetId: 'registered-installation-id' },
    call, 'Partner', 'https://ohs.vercel.app',
  );
  assert.deepEqual(payload.fid, 'registered-installation-id');
  assert.equal(payload.notification, undefined);
  assert.equal(payload.data.type, 'incoming_call');
  assert.equal(payload.webpush.headers.TTL, '30');
  assert.ok(payload.webpush.fcmOptions.link.endsWith('/universe/chat?callId=call-123'));
});

test('Android uses a high-priority notification and the expected channel', () => {
  const payload = createCallPushMessage(
    { platform: 'android', targetType: 'token', targetId: 'native-fcm-token' },
    { ...call, type: 'audio' }, 'Partner', 'https://ohs.vercel.app',
  );
  assert.equal(payload.notification.title, 'Incoming audio call');
  assert.equal(payload.android.notification.channelId, 'calls');
  assert.equal(payload.token, 'native-fcm-token');
  assert.equal(payload.webpush, undefined);
});

test('untrusted origins cannot become notification deep-link domains', () => {
  assert.equal(safeNotificationOrigin('http://attacker.example'), 'https://ohs.vercel.app');
  assert.equal(safeNotificationOrigin('https://user:pass@attacker.example'), 'https://ohs.vercel.app');
  assert.equal(safeNotificationOrigin('https://himanshusibani.app/abc'), 'https://himanshusibani.app');
});

test('Firebase self-test message cannot masquerade as a real incoming call', () => {
  const result = createPushTestMessage({ platform: 'web', targetType: 'fid', targetId: 'registered-fid' });
  assert.equal(result.fid, 'registered-fid');
  assert.equal(result.data.type, 'push_test');
  assert.equal(result.notification, undefined);
  assert.equal(result.webpush.headers.TTL, '60');
});
