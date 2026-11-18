// Api::OnboardingController — GET /snapshot, POST /complete.

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { num, nowIso, success, symbolFor } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

router.get('/snapshot', async (c) => {
  const user = c.get('user');
  const [income, expenses, debtSum, debts, portfolios, insurance, budgets] = await Promise.all([
    c.env.DB.prepare(
      "SELECT SUM(amount) AS t FROM transactions WHERE user_id = ? AND transaction_type = 'income'",
    ).bind(user.id).first<{ t: number | null }>(),
    c.env.DB.prepare(
      "SELECT SUM(amount) AS t FROM transactions WHERE user_id = ? AND transaction_type = 'expense'",
    ).bind(user.id).first<{ t: number | null }>(),
    c.env.DB.prepare(
      "SELECT SUM(amount - paid_amount) AS t FROM debts WHERE user_id = ? AND status = 'active'",
    ).bind(user.id).first<{ t: number | null }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM debts WHERE user_id = ?').bind(user.id).first<{ n: number | null }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM portfolios WHERE user_id = ?').bind(user.id).first<{ n: number | null }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM insurance_policies WHERE user_id = ?').bind(user.id).first<{ n: number | null }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM budgets WHERE user_id = ?').bind(user.id).first<{ n: number | null }>(),
  ]);
  return success(c, {
    money_in: num(income?.t),
    money_out: num(expenses?.t),
    total_owed: num(debtSum?.t),
    checklist: {
      loans: num(debts?.n) > 0,
      investments: num(portfolios?.n) > 0,
      insurance: num(insurance?.n) > 0,
      budget: num(budgets?.n) > 0,
    },
    onboarded: user.onboarded === true,
    currency_symbol: symbolFor(user.currency),
  });
});

router.post('/complete', async (c) => {
  await c.env.DB.prepare('UPDATE users SET onboarded = 1, updated_at = ? WHERE id = ?')
    .bind(nowIso(), c.get('user').id)
    .run();
  return success(c, { onboarded: true });
});

export default router;
