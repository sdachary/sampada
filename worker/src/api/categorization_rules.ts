// User-owned categorisation rules: "description contains X -> category Y".
import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { error, success } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

router.get('/', async (c) => {
  const user = c.get('user');
  const rows = await c.env.DB.prepare(
    `SELECT r.id, r.match_text, r.category_id, bc.name AS category_name
     FROM categorization_rules r
     LEFT JOIN budget_categories bc ON bc.id = r.category_id
     WHERE r.user_id = ? ORDER BY r.created_at ASC`,
  ).bind(user.id).all<{ id: string; match_text: string; category_id: string; category_name: string | null }>();
  return success(c, rows.results);
});

router.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ match_text?: string; category_id?: string }>()
    .catch(() => ({} as { match_text?: string; category_id?: string }));
  const matchText = body.match_text?.trim().toLowerCase();
  const categoryId = body.category_id?.trim();
  if (!matchText || !categoryId) return error(c, 'match text and category required', 400);
  const category = await c.env.DB.prepare('SELECT id FROM budget_categories WHERE id = ? AND user_id = ?')
    .bind(categoryId, user.id).first<{ id: string }>();
  if (!category) return error(c, 'category not found', 404);
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO categorization_rules (id, user_id, match_text, category_id, created_at) VALUES (?, ?, ?, ?, ?)',
  ).bind(id, user.id, matchText, categoryId, new Date().toISOString()).run();
  return c.json({ id, match_text: matchText, category_id: categoryId }, 201);
});

router.delete('/:id', async (c) => {
  const user = c.get('user');
  await c.env.DB.prepare('DELETE FROM categorization_rules WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).run();
  return success(c, { ok: true });
});

export default router;
