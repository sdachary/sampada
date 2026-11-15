import { describe, it, expect } from 'vitest';
import { encryptString, decryptString, getKeyBytes } from './crypto';
import { app } from './index';

const KEY_HEX = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
const KEY_BYTES = getKeyBytes({ ENCRYPTION_KEY: KEY_HEX });

describe('crypto', () => {
  it('roundtrips plaintext including UTF-8 Devanagari', async () => {
    const plaintext = 'संपदा — portfolio ₹1,23,456.78 🚀';
    const payload = await encryptString(plaintext, KEY_BYTES);
    expect(payload.startsWith('v1:')).toBe(true);
    expect(await decryptString(payload, KEY_BYTES)).toBe(plaintext);
  });

  it('throws on wrong key', async () => {
    const payload = await encryptString('secret', KEY_BYTES);
    const wrong = getKeyBytes({ ENCRYPTION_KEY: 'ff'.repeat(32) });
    await expect(decryptString(payload, wrong)).rejects.toThrow(/wrong key|tampered/i);
  });

  it('throws on tampered payload', async () => {
    const payload = await encryptString('secret', KEY_BYTES);
    const raw = atob(payload.slice(3));
    const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    bytes[bytes.length - 1] ^= 0xff; // flip a bit in the auth tag
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    const tampered = 'v1:' + btoa(bin);
    await expect(decryptString(tampered, KEY_BYTES)).rejects.toThrow(/wrong key|tampered/i);
  });

  it('throws on payload missing the v1: prefix', async () => {
    await expect(decryptString('not-a-payload', KEY_BYTES)).rejects.toThrow(/v1:/);
  });

  it('getKeyBytes rejects unset or bad keys', () => {
    expect(() => getKeyBytes({})).toThrow(/ENCRYPTION_KEY is not set/);
    expect(() => getKeyBytes({ ENCRYPTION_KEY: 'short' })).toThrow(/32 bytes|base64|hex/);
  });
});

describe('routes', () => {
  it('GET /up returns 200', async () => {
    const res = await app.request('/up');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', service: 'sampada-api' });
  });

  it('unknown route returns JSON 404', async () => {
    const res = await app.request('/nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not found' });
  });
});
