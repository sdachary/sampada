// Public, low-cost client error reporting. No PII beyond the route path.
import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard } from '../auth';
import { success } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard);

router.post('/', async (c) => {
  const body = await c.req.json<{ message?: string; stack?: string; path?: string }>()
    .catch(() => ({} as { message?: string; stack?: string; path?: string }));
  const message = typeof body.message === 'string' ? body.message.slice(0, 1000) : '';
  if (!message) return c.json({ ok: false }, 400);
  await c.env.DB.prepare(
    'INSERT INTO client_errors (id, path, message, stack, created_at) VALUES (?, ?, ?, ?, ?)',
  ).bind(
    crypto.randomUUID(),
    typeof body.path === 'string' ? body.path.slice(0, 500) : null,
    message,
    typeof body.stack === 'string' ? body.stack.slice(0, 4000) : null,
    new Date().toISOString(),
  ).run();
  return success(c, { ok: true });
});

export default router;
