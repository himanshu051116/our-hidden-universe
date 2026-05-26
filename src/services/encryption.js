const encoder = new TextEncoder();
const decoder = new TextDecoder();

const bytesToBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const base64ToBytes = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

async function sha256Base64(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return bytesToBase64(digest);
}

async function deriveKey(secret, salt) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptMessage(plainText, sharedSecret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(sharedSecret, salt);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plainText));
  const cipherBytes = new Uint8Array(encrypted);

  return {
    cipherText: bytesToBase64(cipherBytes),
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
    integrity: await sha256Base64(cipherBytes),
    algorithm: 'AES-GCM/PBKDF2-SHA256',
  };
}

export async function decryptMessage(payload, sharedSecret) {
  const cipherBytes = base64ToBytes(payload.cipherText);
  if (payload.integrity) {
    const computed = await sha256Base64(cipherBytes);
    if (computed !== payload.integrity) {
      throw new Error('Message integrity check failed.');
    }
  }

  const key = await deriveKey(sharedSecret, base64ToBytes(payload.salt));
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(payload.iv) },
    key,
    cipherBytes,
  );
  return decoder.decode(decrypted);
}
