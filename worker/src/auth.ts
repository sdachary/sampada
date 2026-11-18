// Passkeys-first auth: WebAuthn registration/login, D1 sessions and challenges.
// Replaces the previous shared auth service (and its Redis store) entirely.

import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import type { AppContext } from './api/util';
import { error, featureFlagEnabled, notFound, num, nowIso, success } from './api/util';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import {
  SESSION_TTL_SECONDS,
  clearSessionCookieHeader,
  randomToken,
  readSessionToken,
  sessionCookieHeader,
  sha256Hex,
  type SafeUser,
} from './session';
import type { AppEnv } from './index';

// ---------------------------------------------------------------------------
// Middleware: origin guard + rate limit (house patterns from darpan)
// ---------------------------------------------------------------------------

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/** Origin host must be allow-listed or localhost; no Origin (curl/API) passes. */
export const originGuard = async (c: Context<AppEnv>, next: Next) => {
  if (SAFE_METHODS.includes(c.req.method)) return await next();
  const origin = c.req.header('Origin');
  if (!origin) return await next();
  const allowed = (c.env?.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  let host: string | null = null;
  try {
    host = new URL(origin).hostname;
  } catch {
    host = null;
  }
  if (allowed.includes(origin) || host === 'localhost' || host?.endsWith('.localhost')) {
    return await next();
  }
  return c.json({ error: 'cross-origin request rejected' }, 403);
};

// ponytail: per-isolate in-memory fixed window (darpan's house approach); good
// enough while single-tenant. Swap to Durable Objects / CF WAF rules on abuse.
const attempts = new Map<string, { count: number; resetAt: number }>();

function allowAttempt(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

const RATE_LIMITED_PATHS = [
  '/register/begin',
  '/register/finish',
  '/login/begin',
  '/login/finish',
];

export const rateLimit = async (c: Context<AppEnv>, next: Next) => {
  const ip = c.req.raw.headers.get('cf-connecting-ip') ?? 'unknown';
  if (!allowAttempt(`auth:${ip}:${c.req.path}`, 10, 60_000)) {
    return c.json({ error: 'too many requests' }, 429);
  }
  return await next();
};

// ---------------------------------------------------------------------------
// Sessions (D1) — only the SHA-256 hex of the token is stored
// ---------------------------------------------------------------------------

export async function issueSession(c: Context<AppEnv>, userId: string): Promise<string> {
  const token = randomToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
  await c.env.DB.prepare(
    `INSERT INTO sessions (id, token, user_id, created_at, updated_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(crypto.randomUUID(), await sha256Hex(token), userId, now.toISOString(), now.toISOString(), expiresAt.toISOString())
    .run();
  return token;
}

type UserRow = {
  id: string; email: string; first_name: string | null; last_name: string | null;
  avatar_url: string | null; onboarded: number | null; theme: string | null;
  currency: string | null; timezone: string | null;
};

export function mapUserRow(row: UserRow): SafeUser {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_url,
    onboarded: row.onboarded === null ? null : row.onboarded === 1,
    theme: row.theme,
    currency: row.currency,
    timezone: row.timezone,
  };
}

const USER_COLUMNS = 'id, email, first_name, last_name, avatar_url, onboarded, theme, currency, timezone';

/** Resolve the SafeUser behind the session cookie, or null (missing/revoked/expired). */
export async function loadSessionUser(c: Context<AppEnv>): Promise<SafeUser | null> {
  const token = readSessionToken(c.req.header('Cookie'));
  if (!token) return null;

  const row = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.onboarded,
            u.theme, u.currency, u.timezone, s.expires_at, s.revoked_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`,
  )
    .bind(await sha256Hex(token))
    .first<UserRow & { expires_at: string; revoked_at: string | null }>();

  if (!row || row.revoked_at || new Date(row.expires_at).getTime() <= Date.now()) return null;
  return mapUserRow(row);
}

/** Hono middleware: 401 unless a live session sets `user` on the context. */
export const requireAuth = async (c: Context<AppEnv>, next: Next) => {
  const user = await loadSessionUser(c);
  if (!user) return c.json({ error: 'unauthorized' }, 401);
  c.set('user', user);
  return await next();
};

// ---------------------------------------------------------------------------
// Challenges (D1, was Redis) — 5 min TTL, single-use
// ---------------------------------------------------------------------------

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

type Challenge = { id: string; challenge: string };

export async function createChallenge(
  c: Context<AppEnv>,
  purpose: string,
  userId: string | null,
  challenge: string,
): Promise<void> {
  const id = crypto.randomUUID();
  const now = new Date();
  await c.env.DB.prepare(
    `INSERT INTO webauthn_challenges (id, challenge, user_id, purpose, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, challenge, userId, purpose, now.toISOString(), new Date(now.getTime() + CHALLENGE_TTL_MS).toISOString())
    .run();
}

/** Consume the newest live challenge for a purpose (user-scoped, or unscoped
 *  when userId is null — Rails keys auth challenges by email hash only).
 *  Single-use: the row is deleted on read (live or not) — a stale row never
 *  blocks a retry. Expired or unknown = null. */
export async function consumeChallenge(
  c: Context<AppEnv>,
  purpose: string,
  userId: string | null,
): Promise<Challenge | null> {
  const now = new Date().toISOString();
  const row = userId === null
    ? await c.env.DB.prepare(
        `SELECT id, challenge FROM webauthn_challenges
         WHERE purpose = ? AND user_id IS NULL AND expires_at > ?
         ORDER BY created_at DESC LIMIT 1`,
      )
        .bind(purpose, now)
        .first<{ id: string; challenge: string }>()
    : await c.env.DB.prepare(
        `SELECT id, challenge FROM webauthn_challenges
         WHERE purpose = ? AND user_id = ? AND expires_at > ?
         ORDER BY created_at DESC LIMIT 1`,
      )
        .bind(purpose, userId, now)
        .first<{ id: string; challenge: string }>();
  if (!row) return null;
  await c.env.DB.prepare('DELETE FROM webauthn_challenges WHERE id = ?').bind(row.id).run();
  return { id: row.id, challenge: row.challenge };
}

// ---------------------------------------------------------------------------
// byte helpers (webauthn_credentials.public_key is TEXT)
// ---------------------------------------------------------------------------

function u8ToB64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64ToU8(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function b64urlToUtf8(b64url: string): string {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  return new TextDecoder().decode(b64ToU8(padded));
}

/** WebAuthn ceremonies happen on the origin the browser actually used. */
function expectedOrigin(c: Context<AppEnv>): string {
  const origin = c.req.header('Origin');
  if (origin) return origin;
  const firstAllowed = (c.env.ALLOWED_ORIGINS ?? '').split(',')[0]?.trim();
  return firstAllowed || `https://${c.env.RP_ID}`;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

type RegBeginBody = { email?: string; firstName?: string; lastName?: string; adultAttested?: boolean };
type RegFinishBody = { credential?: RegistrationResponseJSON; email?: string };
type LoginBeginBody = { email?: string };
type LoginFinishBody = { credential?: AuthenticationResponseJSON; email?: string };

const LOOKUP_EMAIL = 'SELECT id FROM users WHERE LOWER(email) = ?';

export const auth = new Hono<AppEnv>();

auth.use('*', originGuard);
for (const limitedPath of RATE_LIMITED_PATHS) auth.use(limitedPath, rateLimit);

auth.post('/register/begin', async (c) => {
  const body = await c.req.json<RegBeginBody>().catch(() => ({}) as RegBeginBody);
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes('@')) return c.json({ error: 'valid email required' }, 400);

  // DPDP: attestation must exist before any account data is written or read.
  if (!body.adultAttested) return c.json({ error: '18+ attestation required' }, 400);

  const existing = await c.env.DB.prepare(LOOKUP_EMAIL).bind(email).first<{ id: string }>();
  const userId = existing?.id ?? crypto.randomUUID();
  if (!existing) {
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO users (id, email, first_name, last_name, adult_attested_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(userId, email, body.firstName?.trim() || null, body.lastName?.trim() || null, now, now, now)
      .run();
  }

  const exclude = await c.env.DB.prepare('SELECT webauthn_id FROM webauthn_credentials WHERE user_id = ?')
    .bind(userId)
    .all<{ webauthn_id: string }>();
  const options = await generateRegistrationOptions({
    rpName: c.env.RP_NAME,
    rpID: c.env.RP_ID,
    userID: new TextEncoder().encode(userId),
    userName: email,
    excludeCredentials: exclude.results.map((r) => ({ id: r.webauthn_id })),
  });
  await createChallenge(c, 'register', userId, options.challenge);
  return c.json(options);
});

auth.post('/register/finish', async (c) => {
  const body = await c.req.json<RegFinishBody>().catch(() => ({}) as RegFinishBody);
  const email = body.email?.trim().toLowerCase();
  if (!email || !body.credential) return c.json({ error: 'email and credential required' }, 400);

  const userRow = await c.env.DB.prepare(LOOKUP_EMAIL).bind(email).first<{ id: string }>();
  if (!userRow) return c.json({ error: 'registration not started for this email' }, 400);

  const challenge = await consumeChallenge(c, 'register', userRow.id);
  if (!challenge) return c.json({ error: 'challenge expired, start registration again' }, 400);

  let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
  try {
    verification = await verifyRegistrationResponse({
      response: body.credential,
      expectedChallenge: challenge.challenge,
      expectedOrigin: expectedOrigin(c),
      expectedRPID: c.env.RP_ID,
    });
  } catch {
    return c.json({ error: 'registration verification failed' }, 400);
  }
  if (!verification.verified || !verification.registrationInfo) {
    return c.json({ error: 'registration verification failed' }, 400);
  }

  const { credential } = verification.registrationInfo;
  const now = new Date().toISOString();
  const dup = await c.env.DB.prepare('SELECT id FROM webauthn_credentials WHERE webauthn_id = ? AND user_id = ?')
    .bind(credential.id, userRow.id)
    .first<{ id: string }>();
  if (!dup) {
    await c.env.DB.prepare(
      `INSERT INTO webauthn_credentials (id, user_id, webauthn_id, public_key, label, sign_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'This device', ?, ?, ?)`,
    )
      .bind(crypto.randomUUID(), userRow.id, credential.id, u8ToB64(credential.publicKey), credential.counter, now, now)
      .run();
  }

  const token = await issueSession(c, userRow.id);
  c.header('Set-Cookie', sessionCookieHeader(token, c.req.header('Origin')));
  const user = await c.env.DB.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`)
    .bind(userRow.id)
    .first<UserRow>();
  return c.json({ user: user ? mapUserRow(user) : null }, 201);
});

auth.post('/login/begin', async (c) => {
  const body = await c.req.json<LoginBeginBody>().catch(() => ({}) as LoginBeginBody);
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes('@')) return c.json({ error: 'valid email required' }, 400);

  const userRow = await c.env.DB.prepare(LOOKUP_EMAIL).bind(email).first<{ id: string }>();
  if (!userRow) {
    // Unknown email: identical response shape, no challenge stored, no existence leak.
    return c.json(await generateAuthenticationOptions({ rpID: c.env.RP_ID }));
  }

  const creds = await c.env.DB.prepare('SELECT webauthn_id FROM webauthn_credentials WHERE user_id = ?')
    .bind(userRow.id)
    .all<{ webauthn_id: string }>();
  const options = await generateAuthenticationOptions({
    rpID: c.env.RP_ID,
    allowCredentials: creds.results.map((r) => ({ id: r.webauthn_id })),
  });
  await createChallenge(c, 'login', userRow.id, options.challenge);
  return c.json(options);
});

auth.post('/login/finish', async (c) => {
  const body = await c.req.json<LoginFinishBody>().catch(() => ({}) as LoginFinishBody);
  if (!body.credential) return c.json({ error: 'credential required' }, 400);

  let userRow: { id: string } | null = null;
  const email = body.email?.trim().toLowerCase();
  if (email) {
    userRow = await c.env.DB.prepare(LOOKUP_EMAIL).bind(email).first<{ id: string }>();
  } else if (body.credential.response?.userHandle) {
    // userHandle is the utf8 bytes of users.id (set at registration).
    const userId = b64urlToUtf8(body.credential.response.userHandle);
    userRow = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first<{ id: string }>();
  }
  if (!userRow) return c.json({ error: 'invalid credentials' }, 401);

  const credRow = await c.env.DB.prepare(
    'SELECT webauthn_id, public_key, sign_count FROM webauthn_credentials WHERE user_id = ? AND webauthn_id = ?',
  )
    .bind(userRow.id, body.credential.id)
    .first<{ webauthn_id: string; public_key: string; sign_count: number }>();
  if (!credRow) return c.json({ error: 'invalid credentials' }, 401);

  const challenge = await consumeChallenge(c, 'login', userRow.id);
  if (!challenge) return c.json({ error: 'challenge expired, start login again' }, 400);

  let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.credential,
      expectedChallenge: challenge.challenge,
      expectedOrigin: expectedOrigin(c),
      expectedRPID: c.env.RP_ID,
      credential: {
        id: credRow.webauthn_id,
        publicKey: b64ToU8(credRow.public_key),
        counter: credRow.sign_count,
      },
    });
  } catch {
    return c.json({ error: 'invalid credentials' }, 401);
  }
  if (!verification.verified) return c.json({ error: 'invalid credentials' }, 401);

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE webauthn_credentials SET sign_count = ?, last_used_at = ?, updated_at = ? WHERE webauthn_id = ? AND user_id = ?',
  )
    .bind(verification.authenticationInfo.newCounter, now, now, credRow.webauthn_id, userRow.id)
    .run();

  const token = await issueSession(c, userRow.id);
  c.header('Set-Cookie', sessionCookieHeader(token, c.req.header('Origin')));
  const user = await c.env.DB.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`)
    .bind(userRow.id)
    .first<UserRow>();
  return c.json({ user: user ? mapUserRow(user) : null });
});

auth.get('/me', requireAuth, (c) => c.json({ user: c.get('user') }));

auth.post('/logout', async (c) => {
  const token = readSessionToken(c.req.header('Cookie'));
  if (token) {
    const now = new Date().toISOString();
    await c.env.DB.prepare('UPDATE sessions SET revoked_at = ?, updated_at = ? WHERE token = ? AND revoked_at IS NULL')
      .bind(now, now, await sha256Hex(token))
      .run();
  }
  c.header('Set-Cookie', clearSessionCookieHeader());
  return c.body(null, 204);
});

// ---------------------------------------------------------------------------
// A6 chunk 1 — profile update + passkey list/destroy + full passkey ceremonies
// (Api::AuthController, Api::V1::Auth::PasskeysController). Same origin guard
// as the routes above; mutations behind requireAuth. Every passkeys route is
// behind the `passkeys` feature flag (Rails require_feature_flag!, 501).
// ---------------------------------------------------------------------------

type ProfileBody = { first_name?: string; last_name?: string; currency?: string };

auth.patch('/profile', requireAuth, async (c) => {
  const body = await c.req.json<ProfileBody>().catch(() => ({}) as ProfileBody);
  const user = c.get('user');
  // Rails params.permit(:first_name, :last_name, :currency): keys absent from
  // the body never reach update! — overwriting them with NULL destroys data.
  const sets: string[] = [];
  const values: (string | null)[] = [];
  for (const key of ['first_name', 'last_name', 'currency'] as const) {
    if (body[key] !== undefined) {
      sets.push(`${key} = ?`);
      values.push(body[key] ?? null);
    }
  }
  if (sets.length > 0) {
    sets.push('updated_at = ?');
    values.push(nowIso());
    await c.env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values, user.id)
      .run();
  }
  const row = await c.env.DB.prepare(
    'SELECT id, email, first_name, last_name, currency, onboarded FROM users WHERE id = ?',
  )
    .bind(user.id)
    .first<{ id: string; email: string; first_name: string | null; last_name: string | null; currency: string | null; onboarded: number | null }>();
  // AuthController#user_response shape (snake_case, onboarded as boolean).
  return c.json({
    user: {
      id: row?.id ?? user.id,
      email: row?.email ?? user.email,
      first_name: row?.first_name ?? null,
      last_name: row?.last_name ?? null,
      currency: row?.currency ?? null,
      onboarded: row ? row.onboarded === 1 : false,
    },
  });
});

/** require_feature_flag! — 501 unless the user's passkeys flag is on. */
async function passkeyFlag(c: AppContext, userId: string): Promise<boolean> {
  return featureFlagEnabled(c, 'passkeys', userId);
}

/** serialize_credential — worker stores transport as 0/1 but the SPA compares
 *  `transport === 'platform'`, so emit the enum strings it consumes. */
function serializeCredential(r: { id: string; label: string | null; transport: number | null; last_used_at: string | null }) {
  return {
    id: r.id,
    label: r.label,
    transport: r.transport === 1 ? 'cross_platform' : 'platform',
    last_used_at: r.last_used_at,
  };
}

auth.get('/passkeys', requireAuth, async (c) => {
  const user = c.get('user');
  if (!(await passkeyFlag(c, user.id))) return error(c, 'Passkeys feature is disabled', 501);
  // PG `ORDER BY last_used_at DESC` puts NULLs first; SQLite puts them last —
  // the IS NULL key restores Rails ordering (never-used passkeys on top).
  const rows = await c.env.DB.prepare(
    'SELECT id, label, transport, last_used_at FROM webauthn_credentials WHERE user_id = ? ORDER BY last_used_at IS NULL DESC, last_used_at DESC',
  )
    .bind(user.id)
    .all<{ id: string; label: string; transport: number | null; last_used_at: string | null }>();
  return success(c, { credentials: rows.results.map(serializeCredential) });
});

auth.delete('/passkeys/:id', requireAuth, async (c) => {
  const user = c.get('user');
  if (!(await passkeyFlag(c, user.id))) return error(c, 'Passkeys feature is disabled', 501);
  const count = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM webauthn_credentials WHERE user_id = ?')
    .bind(user.id)
    .first<{ n: number | null }>();
  if (num(count?.n) <= 1) {
    return error(c, 'Cannot delete your last passkey. Add another passkey first, or keep this one for passwordless sign-in.', 422);
  }
  const row = await c.env.DB.prepare('SELECT id FROM webauthn_credentials WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id)
    .first<{ id: string }>();
  if (!row) return notFound(c);
  await c.env.DB.prepare('DELETE FROM webauthn_credentials WHERE id = ?').bind(row.id).run();
  return success(c, {}, 'Passkey removed');
});

type PasskeyRegisterBody = { credential?: RegistrationResponseJSON; label?: string };
type PasskeyAuthBody = { email?: string; credential?: AuthenticationResponseJSON };

auth.get('/passkeys/register/options', requireAuth, async (c) => {
  const user = c.get('user');
  if (!(await passkeyFlag(c, user.id))) return error(c, 'Passkeys feature is disabled', 501);
  const exclude = await c.env.DB.prepare('SELECT webauthn_id FROM webauthn_credentials WHERE user_id = ?')
    .bind(user.id)
    .all<{ webauthn_id: string }>();
  const options = await generateRegistrationOptions({
    rpName: c.env.RP_NAME,
    rpID: c.env.RP_ID,
    userID: new TextEncoder().encode(user.id),
    userName: user.email,
    userDisplayName: user.firstName || user.email,
    excludeCredentials: exclude.results.map((r) => ({ id: r.webauthn_id })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
  });
  // Rails caches the challenge under a global "reg" key; keying by user is the
  // same flow without cross-user cache collisions.
  await createChallenge(c, 'reg', user.id, options.challenge);
  // SPA destructures `{ options }` (jsonToCredentialOptions feeds navigator).
  return success(c, { options });
});

auth.post('/passkeys/register', requireAuth, async (c) => {
  const user = c.get('user');
  if (!(await passkeyFlag(c, user.id))) return error(c, 'Passkeys feature is disabled', 501);
  const body = await c.req.json<PasskeyRegisterBody>().catch(() => ({}) as PasskeyRegisterBody);
  const label = body.label || 'This device';
  const challenge = await consumeChallenge(c, 'reg', user.id);
  if (!challenge) return error(c, 'Registration session expired or invalid', 422);

  let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
  try {
    verification = await verifyRegistrationResponse({
      response: body.credential!,
      expectedChallenge: challenge.challenge,
      expectedOrigin: expectedOrigin(c),
      expectedRPID: c.env.RP_ID,
    });
  } catch (e) {
    return error(c, `Registration failed: ${(e as Error).message}`, 422);
  }
  if (!verification.verified || !verification.registrationInfo) {
    return error(c, 'Registration failed: verification did not succeed', 422);
  }

  const { credential } = verification.registrationInfo;
  // extract_transport: only 'cross-platform' maps to 1, everything else to 0.
  const transports = (body.credential?.response?.transports ?? []) as string[];
  const transport = transports.includes('cross-platform') ? 1 : 0;
  const now = nowIso();
  await c.env.DB.prepare(
    `INSERT INTO webauthn_credentials (id, user_id, webauthn_id, public_key, label, sign_count, transport, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(crypto.randomUUID(), user.id, credential.id, u8ToB64(credential.publicKey), label, credential.counter, transport, now, now)
    .run();

  const row = await c.env.DB.prepare(
    'SELECT id, label, transport, last_used_at FROM webauthn_credentials WHERE webauthn_id = ? AND user_id = ?',
  )
    .bind(credential.id, user.id)
    .first<{ id: string; label: string; transport: number | null; last_used_at: string | null }>();
  return success(
    c,
    { credential: row ? serializeCredential(row) : null },
    'Passkey registered successfully',
  );
});

auth.get('/passkeys/auth/options', requireAuth, async (c) => {
  const user = c.get('user');
  if (!(await passkeyFlag(c, user.id))) return error(c, 'Passkeys feature is disabled', 501);
  const email = c.req.query('email');
  if (!email) return error(c, 'Email required', 400);

  const normalized = email.trim().toLowerCase();
  const userRow = await c.env.DB.prepare(LOOKUP_EMAIL).bind(normalized).first<{ id: string }>();
  if (!userRow) {
    // Unknown email: Rails renders a bare empty allowlist — no challenge, no
    // existence leak. Browser treats the missing challenge as an error, same
    // as it does against Rails today.
    return success(c, { allowCredentials: [] });
  }

  const creds = await c.env.DB.prepare('SELECT webauthn_id FROM webauthn_credentials WHERE user_id = ?')
    .bind(userRow.id)
    .all<{ webauthn_id: string }>();
  const options = await generateAuthenticationOptions({
    rpID: c.env.RP_ID,
    allowCredentials: creds.results.map((r) => ({ id: r.webauthn_id })),
  });
  await createChallenge(c, `auth:${await sha256Hex(normalized)}`, null, options.challenge);
  return success(c, { options });
});

auth.post('/passkeys/auth/verify', requireAuth, async (c) => {
  const user = c.get('user');
  if (!(await passkeyFlag(c, user.id))) return error(c, 'Passkeys feature is disabled', 501);
  const body = await c.req.json<PasskeyAuthBody>().catch(() => ({}) as PasskeyAuthBody);
  if (!body.email?.trim() || !body.credential) return error(c, 'Email and credential required', 400);

  const email = body.email.trim().toLowerCase();
  const userRow = await c.env.DB.prepare(LOOKUP_EMAIL).bind(email).first<{ id: string }>();
  if (!userRow) return error(c, 'Invalid credentials', 401);

  const challenge = await consumeChallenge(c, `auth:${await sha256Hex(email)}`, null);
  if (!challenge) return error(c, 'Authentication session expired or invalid', 422);

  const credRow = await c.env.DB.prepare(
    'SELECT webauthn_id, public_key, sign_count FROM webauthn_credentials WHERE user_id = ? AND webauthn_id = ?',
  )
    .bind(userRow.id, body.credential.id)
    .first<{ webauthn_id: string; public_key: string; sign_count: number }>();
  // Rails rescue ActiveRecord::RecordNotFound → 401 'Credential not found'.
  if (!credRow) return error(c, 'Credential not found', 401);

  let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.credential,
      expectedChallenge: challenge.challenge,
      expectedOrigin: expectedOrigin(c),
      expectedRPID: c.env.RP_ID,
      credential: {
        id: credRow.webauthn_id,
        publicKey: b64ToU8(credRow.public_key),
        counter: credRow.sign_count,
      },
    });
  } catch (e) {
    return error(c, `Authentication failed: ${(e as Error).message}`, 401);
  }
  if (!verification.verified) return error(c, 'Authentication failed: signature verification failed', 401);

  const now = nowIso();
  await c.env.DB.prepare(
    'UPDATE webauthn_credentials SET sign_count = ?, last_used_at = ?, updated_at = ? WHERE webauthn_id = ? AND user_id = ?',
  )
    .bind(verification.authenticationInfo.newCounter, now, now, credRow.webauthn_id, userRow.id)
    .run();

  // Rails renders success and expects the SPA to "establish a session" — the
  // worker makes that true by issuing the session cookie here (Login.jsx
  // navigates to /dashboard immediately after).
  const token = await issueSession(c, userRow.id);
  c.header('Set-Cookie', sessionCookieHeader(token, c.req.header('Origin')));
  const row = await c.env.DB.prepare(
    'SELECT id, email, first_name, last_name, currency, onboarded FROM users WHERE id = ?',
  )
    .bind(userRow.id)
    .first<{ id: string; email: string; first_name: string | null; last_name: string | null; currency: string | null; onboarded: number | null }>();
  return success(
    c,
    {
      user: {
        id: row?.id ?? userRow.id,
        email: row?.email ?? '',
        first_name: row?.first_name ?? null,
        last_name: row?.last_name ?? null,
        currency: row?.currency ?? null,
        onboarded: row ? row.onboarded === 1 : false,
      },
    },
    'Passkey verified. Redirecting to establish session...',
  );
});

// Parity shim for the old session-verify contract (frontend reads this pre-A5).
auth.get('/verify', async (c) => {
  const user = await loadSessionUser(c);
  if (!user) return c.json({ valid: false }, 401);
  return c.json({ valid: true, user });
});
