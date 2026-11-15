const KEY_LEN = 32; // AES-256
const IV_LEN = 12; // GCM nonce
const PAYLOAD_PREFIX = 'v1:';

function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64encode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Accepts ENCRYPTION_KEY as base64 or hex; must decode to exactly 32 bytes. */
export function getKeyBytes(env: { ENCRYPTION_KEY?: string }): Uint8Array {
  const raw = env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('ENCRYPTION_KEY is not set. Set it in .dev.vars (local) or wrangler secrets (remote).');
  }
  let key: Uint8Array;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = new Uint8Array(32);
    for (let i = 0; i < 32; i++) key[i] = parseInt(raw.slice(i * 2, i * 2 + 2), 16);
  } else {
    try {
      key = b64decode(raw);
    } catch {
      throw new Error('ENCRYPTION_KEY is neither valid base64 nor 64-char hex.');
    }
  }
  if (key.length !== KEY_LEN) {
    throw new Error(`ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}).`);
  }
  return key;
}

export async function encryptString(plaintext: string, keyBytes: Uint8Array): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const data = new TextEncoder().encode(plaintext);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data));
  const payload = new Uint8Array(IV_LEN + ciphertext.length);
  payload.set(iv, 0);
  payload.set(ciphertext, IV_LEN);
  return PAYLOAD_PREFIX + b64encode(payload);
}

export async function decryptString(payload: string, keyBytes: Uint8Array): Promise<string> {
  if (!payload.startsWith(PAYLOAD_PREFIX)) {
    throw new Error(`Invalid encrypted payload: missing "${PAYLOAD_PREFIX}" prefix.`);
  }
  let bytes: Uint8Array;
  try {
    bytes = b64decode(payload.slice(PAYLOAD_PREFIX.length));
  } catch {
    throw new Error('Invalid encrypted payload: not valid base64.');
  }
  if (bytes.length <= IV_LEN) {
    throw new Error('Invalid encrypted payload: too short.');
  }
  const iv = bytes.slice(0, IV_LEN);
  const ciphertext = bytes.slice(IV_LEN);
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  } catch {
    throw new Error('Decryption failed: wrong key or tampered payload.');
  }
  return new TextDecoder().decode(plaintext);
}
