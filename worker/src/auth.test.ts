import { describe, expect, it } from 'vitest';
import { app } from './index';
import { clearSessionCookieHeader, randomToken, readSessionToken, sessionCookieFlags, sha256Hex } from './session';

describe('session primitives', () => {
  it('hashes deterministically and never equals the raw token', async () => {
    expect(await sha256Hex('sampada')).toBe(await sha256Hex('sampada'));
    expect(await sha256Hex('sampada')).not.toBe('sampada');
  });

  it('issues 43-char base64url tokens', () => {
    expect(randomToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('marks cookies Secure on https and plain on http+localhost', () => {
    expect(sessionCookieFlags('https://sampada.vayalabs.in')).toContain('Secure');
    expect(sessionCookieFlags('http://localhost:8787')).not.toContain('Secure');
    expect(sessionCookieFlags('https://sampada.vayalabs.in')).toContain('HttpOnly');
  });

  it('parses the session cookie and builds the clearing header', () => {
    expect(readSessionToken('foo=bar; sampada_session=tok123')).toBe('tok123');
    expect(readSessionToken('foo=bar')).toBeNull();
    expect(readSessionToken(null)).toBeNull();
    expect(clearSessionCookieHeader()).toContain('Max-Age=0');
  });
});

describe('auth routes', () => {
  it('GET /api/v1/auth/verify returns 401 {valid:false} without a cookie (no DB needed)', async () => {
    const res = await app.request('/api/v1/auth/verify');
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ valid: false });
  });

  it('rejects cross-origin POSTs with a 403 (origin guard)', async () => {
    const res = await app.request('/api/v1/auth/login/begin', {
      method: 'POST',
      headers: { Origin: 'https://evil.example.com', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'x@y.com' }),
    });
    expect(res.status).toBe(403);
  });

  it('GET /up still answers 200', async () => {
    const res = await app.request('/up');
    expect(res.status).toBe(200);
  });
});

describe('DPDP 18+ attestation gate', () => {
  it('rejects register/begin without adultAttested before any DB access', async () => {
    const res = await app.request('/api/v1/auth/register/begin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com' }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: '18+ attestation required' });
  });

  it('origin guard still runs before the attestation gate', async () => {
    const res = await app.request('/api/v1/auth/register/begin', {
      method: 'POST',
      headers: { Origin: 'https://evil.example.com', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', adultAttested: true }),
    });
    expect(res.status).toBe(403);
  });
});

describe('legal pages', () => {
  it('serves the privacy policy at /privacy', async () => {
    const res = await app.request('/privacy');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('Sampada');
    expect(html).toContain('grievance@acharylab.app');
  });

  it('serves the terms at /terms', async () => {
    const res = await app.request('/terms');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('Terms of Service');
  });
});

describe('A8 magic-link guards', () => {
  it('fails closed in production when Turnstile is not configured', async () => {
    const req = new Request('http://localhost/api/v1/auth/magic-link/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com' }),
    });
    const res = await app.fetch(req, { ENVIRONMENT: 'production' } as never);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'bot check failed' });
  });

  it('rejects a verify call with no token before touching D1', async () => {
    const res = await app.request('/api/v1/auth/magic-link/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'token required' });
  });

  it('origin guard covers the new request route', async () => {
    const res = await app.request('/api/v1/auth/magic-link/request', {
      method: 'POST',
      headers: { Origin: 'https://evil.example.com', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com' }),
    });
    expect(res.status).toBe(403);
  });
});

describe('A8 D1 latency probe', () => {
  it('rejects unauthenticated probes without touching D1', async () => {
    const res = await app.request('/api/v1/probe/d1');
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });

  it('rejects a wrong bearer token', async () => {
    const res = await app.request('/api/v1/probe/d1', {
      headers: { Authorization: 'Bearer wrong' },
    }, { D1_PROBE_TOKEN: 'expected' } as never);
    expect(res.status).toBe(401);
  });
});
