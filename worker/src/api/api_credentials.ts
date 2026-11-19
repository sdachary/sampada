// Api::ApiCredentialsController — index/create/update/destroy.
// api_credentials has NO show route (resource, not resources).

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { error, jsonBody, notFound, nowIso, success } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

type Ctx = Parameters<typeof success>[0];

type CredentialRow = { id: number; provider: string; label: string | null };

function credentialJson(k: CredentialRow) {
  return { id: k.id, provider: k.provider, label: k.label };
}

router.get('/', async (c) => {
  const user = c.get('user');
  const rows = await c.env.DB.prepare(
    'SELECT id, provider, label FROM api_credentials WHERE user_id = ?',
  ).bind(user.id).all<CredentialRow>();
  return success(c, { credentials: rows.results.map(credentialJson) });
});

router.post('/', async (c) => {
  const user = c.get('user');
  const body = await jsonBody<Record<string, unknown>>(c);
  const source = (body.api_credential as Record<string, unknown> | undefined) ?? body;

  const errs: string[] = [];
  const provider = source.provider ? String(source.provider) : null;
  if (!provider) errs.push("Provider can't be blank");
  const encryptedValue = source.encrypted_value ? String(source.encrypted_value) : null;
  if (!encryptedValue) errs.push("Encrypted value can't be blank");
  if (errs.length) return error(c, 'Validation failed', 422, errs);

  const dup = await c.env.DB.prepare(
    'SELECT id FROM api_credentials WHERE user_id = ? AND provider = ?',
  ).bind(user.id, provider!).all<{ id: number }>();
  if (dup.results.length > 0) return error(c, 'Validation failed', 422, ['Provider has already been taken']);

  const now = nowIso();
  const info = await c.env.DB.prepare(
    `INSERT INTO api_credentials (user_id, provider, label, encrypted_value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(user.id, provider, source.label ? String(source.label) : null, encryptedValue, now, now).run();
  const row = await c.env.DB.prepare(
    'SELECT id, provider, label FROM api_credentials WHERE user_id = ? AND provider = ?',
  ).bind(user.id, provider).first<CredentialRow>();
  return c.json({ credential: credentialJson(row!) }, 201);
});

router.put('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await jsonBody<Record<string, unknown>>(c);
  const source = (body.api_credential as Record<string, unknown> | undefined) ?? body;

  const existing = await c.env.DB.prepare(
    'SELECT id, provider, label FROM api_credentials WHERE id = ? AND user_id = ?',
  ).bind(id, user.id).first<CredentialRow>();
  if (!existing) return notFound(c);

  const sets: string[] = [];
  const values: unknown[] = [];
  if (source.provider !== undefined) { sets.push('provider = ?'); values.push(String(source.provider)); }
  if (source.label !== undefined) { sets.push('label = ?'); values.push(source.label ? String(source.label) : null); }
  if (source.encrypted_value !== undefined) { sets.push('encrypted_value = ?'); values.push(String(source.encrypted_value)); }
  if (sets.length > 0) {
    sets.push('updated_at = ?');
    values.push(nowIso());
    await c.env.DB.prepare(`UPDATE api_credentials SET ${sets.join(', ')} WHERE id = ?`).bind(...values, id).run();
  }

  const row = await c.env.DB.prepare(
    'SELECT id, provider, label FROM api_credentials WHERE id = ? AND user_id = ?',
  ).bind(id, user.id).first<CredentialRow>();
  return success(c, { credential: credentialJson(row!) });
});

router.delete('/:id', async (c) => {
  const user = c.get('user');
  const result = await c.env.DB.prepare('DELETE FROM api_credentials WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).run();
  if (result.meta.changes === 0) return notFound(c);
  return c.body(null, 204);
});

export default router;
