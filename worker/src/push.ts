// Web Push: VAPID (RFC 8292) + aes128gcm payload encryption (RFC 8291/8188),
// implemented on raw WebCrypto — the web-push npm package needs node:https,
// which the Workers runtime does not provide under nodejs_compat.
// The RFC 8291 Appendix A worked example is pinned in push.test.ts.

const encoder = new TextEncoder();

export function b64urlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function bytesToB64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8),
  );
}

/** VAPID keys from web-push tooling: public = base64url of the 65-byte
 *  uncompressed P-256 point, private = base64url of the 32-byte scalar. */
export function vapidJwk(publicKeyB64: string, privateKeyB64: string): JsonWebKey {
  const pub = b64urlToBytes(publicKeyB64);
  const priv = b64urlToBytes(privateKeyB64);
  if (pub.length !== 65 || pub[0] !== 0x04) throw new Error('VAPID_PUBLIC_KEY must be a 65-byte uncompressed P-256 point');
  if (priv.length !== 32) throw new Error('VAPID_PRIVATE_KEY must be a 32-byte scalar');
  return {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToB64url(pub.subarray(1, 33)),
    y: bytesToB64url(pub.subarray(33)),
    d: bytesToB64url(priv),
    ext: true,
  };
}

/** RFC 8292: short-lived ES256 JWT with aud = endpoint origin. */
export async function buildVapidJwt(
  publicKeyB64: string,
  privateKeyB64: string,
  audience: string,
  subject: string,
  now: Date = new Date(),
): Promise<string> {
  const header = bytesToB64url(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = bytesToB64url(
    encoder.encode(JSON.stringify({ aud: audience, exp: Math.floor(now.getTime() / 1000) + 12 * 3600, sub: subject })),
  );
  const input = `${header}.${claims}`;
  const key = await crypto.subtle.importKey('jwk', vapidJwk(publicKeyB64, privateKeyB64), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(input)));
  return `${input}.${bytesToB64url(signature)}`;
}

/** RFC 8291 §3.3: PRK_key = HKDF(salt=auth_secret, IKM=ecdh_secret,
 *  info="WebPush: info" || 0x00 || ua_public || as_public). */
export async function deriveCombinedSecret(
  authSecret: Uint8Array,
  ecdhSecret: Uint8Array,
  uaPublic: Uint8Array,
  asPublic: Uint8Array,
): Promise<Uint8Array> {
  return hkdf(
    authSecret,
    ecdhSecret,
    concat(encoder.encode('WebPush: info'), Uint8Array.of(0x00), uaPublic, asPublic),
    32,
  );
}

/** RFC 8188 step: CEK + nonce from the 16-byte record salt. */
export async function deriveRecordKeys(
  salt: Uint8Array,
  combinedSecret: Uint8Array,
): Promise<{ cek: Uint8Array; nonce: Uint8Array }> {
  const cek = await hkdf(salt, combinedSecret, encoder.encode('Content-Encoding: aes128gcm\u0000'), 16);
  const nonce = await hkdf(salt, combinedSecret, encoder.encode('Content-Encoding: nonce\u0000'), 12);
  return { cek, nonce };
}

const RECORD_SIZE = 4096;

/** Encrypt one push payload: 86-octet header (salt‖rs‖idlen‖as_public) +
 *  AES-GCM over (plaintext ‖ 0x02). */
export async function encryptPushPayload(
  plaintext: Uint8Array,
  p256dhB64: string,
  authB64: string,
): Promise<Uint8Array> {
  const uaPublic = b64urlToBytes(p256dhB64);
  const authSecret = b64urlToBytes(authB64);
  if (uaPublic.length !== 65 || uaPublic[0] !== 0x04) throw new Error('push subscription has a malformed p256dh key');

  // workers-types models the ECDH derive param as `$public`; the runtime
  // property is `public` — hence the assertion
  const ephemeral = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair;
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: uaKey } as SubtleCryptoDeriveKeyAlgorithm,
      ephemeral.privateKey,
      256,
    ),
  );
  const asPublic = new Uint8Array((await crypto.subtle.exportKey('raw', ephemeral.publicKey)) as ArrayBuffer);

  const combined = await deriveCombinedSecret(authSecret, ecdhSecret, uaPublic, asPublic);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const { cek, nonce } = await deriveRecordKeys(salt, combined);

  const data = concat(plaintext, Uint8Array.of(0x02)); // single final record
  const header = new Uint8Array(86); // salt(16) + rs(4) + idlen(1) + keyid(65)
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, RECORD_SIZE);
  header[20] = 65;
  header.set(asPublic, 21);

  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, data));
  return concat(header, ciphertext);
}

export type PushResult = 'sent' | 'expired' | 'skipped' | 'error';

export async function sendWebPush(
  env: { VAPID_PUBLIC_KEY?: string; VAPID_PRIVATE_KEY?: string; VAPID_SUBJECT?: string },
  subscription: { endpoint: string; p256dh: string; auth: string },
  payloadJson: string,
): Promise<PushResult> {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log(JSON.stringify({ push: 'skipped (VAPID keys not configured)' }));
    return 'skipped';
  }
  try {
    const body = await encryptPushPayload(encoder.encode(payloadJson), subscription.p256dh, subscription.auth);
    const jwt = await buildVapidJwt(
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY,
      new URL(subscription.endpoint).origin,
      VAPID_SUBJECT || 'mailto:notifications@sampada.app',
    );
    const res = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        TTL: '2419200',
        Urgency: 'normal',
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    // 401/403 = unauthorized; Rails destroyed the subscription on both
    // WebPush::ExpiredSubscription and WebPush::Unauthorized
    if (res.status === 401 || res.status === 403 || res.status === 404 || res.status === 410) return 'expired';
    if (!res.ok) {
      console.error(JSON.stringify({ push: 'failed', status: res.status, endpoint: subscription.endpoint.slice(0, 60) }));
      return 'error';
    }
    return 'sent';
  } catch (error) {
    console.error(JSON.stringify({ push: 'failed', error: String(error) }));
    return 'error';
  }
}
