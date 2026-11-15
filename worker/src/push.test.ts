import { describe, expect, it } from 'vitest';
import {
  b64urlToBytes,
  buildVapidJwt,
  bytesToB64url,
  deriveCombinedSecret,
  deriveRecordKeys,
  encryptPushPayload,
  vapidJwk,
} from './push';

// RFC 8291 Appendix A — the complete worked example. If the HKDF salt/IKM
// order or the info strings are wrong anywhere in push.ts, this breaks.
const UA_PUBLIC = 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4';
const AS_PUBLIC = 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8';
const AS_PRIVATE = 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw';
const AUTH_SECRET = 'BTBZMqHH6r4Tts7J_aSIgg';
const SALT = 'DGv6ra1nlYgDCS1FRnbzlw';
const ECDH_SECRET = 'kyrL1jIIOHEzg3sM2ZWRHDRB62YACZhhSlknJ672kSs';
const IKM = 'S4lYMb_L0FxCeq0WhDx813KgSYqU26kOyzWUdsXYyrg';
const CEK = 'oIhVW04MRdy2XN9CiKLxTg';
const NONCE = '4h_95klXJ5E_qnoN';
const PLAINTEXT = 'V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24'; // "When I grow up, I want to be a watermelon"
const CIPHERTEXT = '8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ';

describe('RFC 8291 Appendix A', () => {
  it('reproduces the ECDH shared secret from as_private × ua_public', async () => {
    const priv = await crypto.subtle.importKey(
      'jwk',
      vapidJwk(AS_PUBLIC, AS_PRIVATE),
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveBits'],
    );
    const uaKey = await crypto.subtle.importKey('raw', b64urlToBytes(UA_PUBLIC), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const secret = new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: 'ECDH', public: uaKey } as SubtleCryptoDeriveKeyAlgorithm,
        priv,
        256,
      ),
    );
    expect(bytesToB64url(secret)).toBe(ECDH_SECRET);
  });

  it('reproduces IKM (salt=auth_secret, IKM=ecdh_secret)', async () => {
    const ikm = await deriveCombinedSecret(b64urlToBytes(AUTH_SECRET), b64urlToBytes(ECDH_SECRET), b64urlToBytes(UA_PUBLIC), b64urlToBytes(AS_PUBLIC));
    expect(bytesToB64url(ikm)).toBe(IKM);
  });

  it('reproduces CEK and NONCE from the record salt', async () => {
    const { cek, nonce } = await deriveRecordKeys(b64urlToBytes(SALT), b64urlToBytes(IKM));
    expect(bytesToB64url(cek)).toBe(CEK);
    expect(bytesToB64url(nonce)).toBe(NONCE);
  });

  it('reproduces the RFC ciphertext (plaintext ‖ 0x02, AES-GCM)', async () => {
    const key = await crypto.subtle.importKey('raw', b64urlToBytes(CEK), 'AES-GCM', false, ['encrypt']);
    const padded = new Uint8Array([...b64urlToBytes(PLAINTEXT), 0x02]);
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: b64urlToBytes(NONCE) }, key, padded));
    expect(bytesToB64url(ciphertext)).toBe(CIPHERTEXT);
  });
});

describe('encryptPushPayload', () => {
  it('emits the 86-octet aes128gcm header (salt‖rs‖idlen‖key) plus GCM overhead', async () => {
    const payload = await encryptPushPayload(new TextEncoder().encode('hello'), UA_PUBLIC, AUTH_SECRET);
    // 86 header + plaintext(5) + 0x02 pad(1) + 16 GCM tag
    expect(payload.length).toBe(86 + 5 + 1 + 16);
    const view = new DataView(payload.buffer);
    expect(view.getUint32(16)).toBe(4096); // record size
    expect(payload[20]).toBe(65); // keyid length
    expect(bytesToB64url(payload.slice(21, 86)).length).toBeGreaterThan(0);
  });

  it('rejects malformed subscription keys', async () => {
    // 64 bytes ≠ 65 — decodes cleanly, fails the shape check
    await expect(encryptPushPayload(new TextEncoder().encode('x'), 'A'.repeat(86), AUTH_SECRET)).rejects.toThrow(/p256dh/);
  });
});

describe('vapidJwk', () => {
  it('splits the 65-byte point into x/y and keeps the scalar', () => {
    const jwk = vapidJwk(AS_PUBLIC, AS_PRIVATE);
    expect(jwk.kty).toBe('EC');
    expect(jwk.crv).toBe('P-256');
    expect(b64urlToBytes(jwk.x as string).length).toBe(32);
    expect(b64urlToBytes(jwk.y as string).length).toBe(32);
    expect(b64urlToBytes(jwk.d as string)).toEqual(b64urlToBytes(AS_PRIVATE));
  });

  it('rejects wrong key shapes', () => {
    // 'A'.repeat(86) decodes to 64 bytes; 'A'.repeat(42) to 31 bytes
    expect(() => vapidJwk('A'.repeat(86), AS_PRIVATE)).toThrow(/65-byte/);
    expect(() => vapidJwk(AS_PUBLIC, 'A'.repeat(42))).toThrow(/32-byte/);
  });
});

describe('buildVapidJwt', () => {
  it('signs a decodable ES256 token whose signature verifies', async () => {
    const jwt = await buildVapidJwt(AS_PUBLIC, AS_PRIVATE, 'https://fcm.googleapis.com', 'mailto:test@sampada.app', new Date(0));
    const [header, claims, signature] = jwt.split('.');
    const decode = (s: string): Record<string, unknown> =>
      JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));
    expect(decode(header)).toEqual({ typ: 'JWT', alg: 'ES256' });
    const payload = decode(claims) as { aud: string; exp: number; sub: string };
    expect(payload.aud).toBe('https://fcm.googleapis.com');
    expect(payload.exp).toBe(12 * 3600);
    expect(payload.sub).toBe('mailto:test@sampada.app');

    const jwk = vapidJwk(AS_PUBLIC, AS_PRIVATE);
    const pub = await crypto.subtle.importKey(
      'jwk',
      { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, ext: true },
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pub,
      b64urlToBytes(signature),
      new TextEncoder().encode(`${header}.${claims}`),
    );
    expect(ok).toBe(true);
  });
});
