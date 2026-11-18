// Api::PushSubscriptionsController — GET/POST/DELETE /push_subscriptions,
// GET /push_subscriptions/vapid_public_key (collection route).

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { error, jsonBody, notFound, nowIso, success } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

type PushBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
  expirationTime?: number | string;
};

router.get('/', async (c) => {
  const rows = await c.env.DB.prepare('SELECT id, endpoint FROM push_subscriptions WHERE user_id = ?')
    .bind(c.get('user').id)
    .all<{ id: string; endpoint: string }>();
  return success(c, { data: rows.results });
});

router.post('/', async (c) => {
  const body = await jsonBody<PushBody>(c);
  const user = c.get('user');

  // PushSubscription validations, in definition order (full_messages join).
  const missing: string[] = [];
  if (!body.endpoint) missing.push("Endpoint can't be blank");
  const p256dh = body.keys?.p256dh;
  const auth = body.keys?.auth;
  if (!p256dh) missing.push("P256dh can't be blank");
  if (!auth) missing.push("Auth can't be blank");

  const existing = body.endpoint
    ? await c.env.DB.prepare('SELECT id, user_id FROM push_subscriptions WHERE endpoint = ?')
        .bind(body.endpoint)
        .first<{ id: string; user_id: string }>()
    : null;
  // Uniqueness is global (index_push_subscriptions_on_endpoint): another
  // user's endpoint fails with the Rails message instead of a D1 constraint.
  if (body.endpoint && existing && existing.user_id !== user.id) {
    missing.push('Endpoint has already been taken');
  }
  if (missing.length > 0) return error(c, missing.join(', '), 422);

  const now = nowIso();
  // Time.zone.at(ms.to_i) — second precision.
  const expiresAt = body.expirationTime
    ? new Date(Math.floor(Number(body.expirationTime) / 1000) * 1000).toISOString()
    : null;
  const userAgent = c.req.header('User-Agent') ?? null;

  if (existing) {
    await c.env.DB.prepare(
      'UPDATE push_subscriptions SET p256dh = ?, auth = ?, user_agent = ?, expires_at = ? WHERE id = ?',
    ).bind(p256dh!, auth!, userAgent, expiresAt, existing.id).run();
    return success(c, { id: existing.id }, 'Push subscription registered');
  }
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(id, user.id, body.endpoint!, p256dh!, auth!, userAgent, expiresAt, now).run();
  return success(c, { id }, 'Push subscription registered');
});

router.delete('/:id', async (c) => {
  const user = c.get('user');
  const row = await c.env.DB.prepare('SELECT id FROM push_subscriptions WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id)
    .first<{ id: string }>();
  if (!row) return notFound(c);
  await c.env.DB.prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(row.id).run();
  return success(c, {}, 'Push subscription removed');
});

router.get('/vapid_public_key', (c) => success(c, { public_key: c.env.VAPID_PUBLIC_KEY ?? '' }));

export default router;
