import { validateIceServers } from '../src/services/iceServerConfig.js';

const ENDPOINT = 'https://rtc.live.cloudflare.com/v1/turn/keys/';
const keyIdPattern = /^[a-zA-Z0-9_-]{8,128}$/;

export function cloudflareTurnConfigured(env = process.env) {
  return Boolean(env.CLOUDFLARE_TURN_KEY_ID && env.CLOUDFLARE_TURN_API_TOKEN);
}

export async function issueCloudflareTurnCredentials({
  keyId,
  apiToken,
  ttlSeconds = 14400,
  fetchImpl = fetch,
} = {}) {
  if (!keyIdPattern.test(String(keyId || '')) || !apiToken) {
    throw new Error('Cloudflare TURN configuration is incomplete.');
  }

  const ttl = Math.max(600, Math.min(86400, Math.floor(Number(ttlSeconds) || 14400)));
  const response = await fetchImpl(
    `${ENDPOINT}${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ttl }),
      signal: AbortSignal.timeout(5500),
    },
  );
  if (!response.ok) throw new Error(`Cloudflare TURN returned HTTP ${response.status}`);
  const payload = await response.json();
  // Port 53 is blocked by many WebRTC browsers. Cloudflare offers several alternatives.
  const withoutBlockedPort = (payload?.iceServers || []).map((server) => ({
    ...server,
    urls: (Array.isArray(server.urls) ? server.urls : [server.urls])
      .filter((url) => typeof url === 'string' && !/:53(?:\?|$)/.test(url)),
  }));
  const iceServers = validateIceServers(withoutBlockedPort);
  if (!iceServers.some((server) => server.urls.some((url) => /^turns?:/i.test(url)))) {
    throw new Error('Cloudflare response lacked authenticated TURN relays.');
  }
  return {
    iceServers,
    ttlSeconds: ttl,
    expiresAt: Date.now() + ttl * 1000,
    provider: 'cloudflare',
  };
}
