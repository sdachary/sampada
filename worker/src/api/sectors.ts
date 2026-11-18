// Api::SectorsController — GET /sectors. Rails renders the bare array
// (render_success passes non-Hash payloads through untouched) — no wrapper.

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

router.get('/', async (c) => {
  const rows = await c.env.DB.prepare('SELECT id, name, color FROM sectors ORDER BY name ASC')
    .all<{ id: string; name: string; color: string }>();
  return c.json(rows.results);
});

export default router;
