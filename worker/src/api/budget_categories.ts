// Api::BudgetCategoriesController — index only. Rails has full CRUD but the
// SPA only reads the list (BudgetFormModal/TransactionFormModal/QuickLogSheet
// fetch; writers go to /api/v1/budgets), so only index is ported.

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { castBoolean } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

type CatRow = {
  id: string; name: string; icon: string | null; color: string | null;
  sort_order: number | null; active: number | null;
};

// Rails rejects rows where `active.to_s == 'false'` (PG boolean false);
// D1 stores the same thing as 0.
router.get('/', async (c) => {
  const user = c.get('user');
  const rows = await c.env.DB.prepare(
    'SELECT id, name, icon, color, sort_order, active FROM budget_categories WHERE user_id = ? ORDER BY sort_order ASC',
  ).bind(user.id).all<CatRow>();
  // Rails boolean → JSON true/false; transaction_count is always 0.
  return c.json(rows.results
    .filter((r) => castBoolean(r.active))
    .map((r) => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      color: r.color,
      sort_order: r.sort_order,
      active: castBoolean(r.active),
      transaction_count: 0,
    })));
});

export default router;
