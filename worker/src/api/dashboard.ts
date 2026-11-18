// Dashboard aggregation — ports app/controllers/api/dashboard_controller.rb.
// Pure SUM/COUNT over D1; no exchange-rate conversion (Rails didn't either).

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { requireAuth } from '../auth';
import { num, round2, success, symbolFor } from './util';

export const dashboard = new Hono<AppEnv>();

dashboard.use('*', requireAuth);

// Rails: CASE frequency WHEN 'weekly' THEN amount * 4.33 ... (daily falls to ELSE amount)
const MONTHLY_EXPENSES_SQL = `
  SUM(CASE frequency
        WHEN 'weekly' THEN amount * 4.33
        WHEN 'monthly' THEN amount
        WHEN 'quarterly' THEN amount / 3.0
        WHEN 'yearly' THEN amount / 12.0
        ELSE amount END)`;

dashboard.get('/', async (c) => {
  const userId = c.get('user').id;

  const [debts, investments, expenses, portfolios, sips, unread, journey] = await Promise.all([
    c.env.DB.prepare(
      "SELECT COALESCE(SUM(amount - paid_amount), 0) AS total, COUNT(*) AS n FROM debts WHERE user_id = ? AND status = 'active'",
    ).bind(userId).first<{ total: number | null; n: number | null }>(),
    c.env.DB.prepare(
      `SELECT COALESCE(SUM(COALESCE(i.shares, 0) * COALESCE(i.current_price, 0)), 0) AS total
       FROM investments i JOIN portfolios p ON p.id = i.portfolio_id WHERE p.user_id = ?`,
    ).bind(userId).first<{ total: number | null }>(),
    c.env.DB.prepare(
      `SELECT ${MONTHLY_EXPENSES_SQL} AS total FROM recurring_expenses WHERE user_id = ? AND active = 1`,
    ).bind(userId).first<{ total: number | null }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM portfolios WHERE user_id = ?').bind(userId)
      .first<{ n: number | null }>(),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS n FROM dividend_sips ds
       JOIN portfolios p ON p.id = ds.portfolio_id
       JOIN users u ON u.id = p.user_id
       WHERE u.id = ? AND ds.status = 'active'`,
    ).bind(userId).first<{ n: number | null }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0')
      .bind(userId).first<{ n: number | null }>(),
    c.env.DB.prepare(
      'SELECT zero_day_target, wealth_score FROM journeys WHERE user_id = ? ORDER BY created_at ASC LIMIT 1',
    ).bind(userId).first<{ zero_day_target: string | null; wealth_score: number | null }>(),
  ]);

  const totalDebt = num(debts?.total);
  const totalInvestments = num(investments?.total);

  const snapshots = await c.env.DB.prepare(
    'SELECT snapshot_date, net_worth, total_assets, total_liabilities, currency_code FROM net_worth_snapshots WHERE user_id = ? ORDER BY snapshot_date DESC LIMIT 12',
  )
    .bind(userId)
    .all<{ snapshot_date: string; net_worth: number | null; total_assets: number | null; total_liabilities: number | null; currency_code: string | null }>();

  return success(c, {
    total_debt: totalDebt,
    total_investments: totalInvestments,
    monthly_expenses: round2(num(expenses?.total)),
    net_worth: totalInvestments - totalDebt,
    debt_free_date: journey?.zero_day_target ?? null,
    wealth_score: journey?.wealth_score == null ? null : num(journey.wealth_score),
    portfolio_count: num(portfolios?.n),
    debt_count: num(debts?.n),
    sip_count: num(sips?.n),
    unread_notifications: num(unread?.n),
    base_currency: c.get('user').currency,
    currency_symbol: symbolFor(c.get('user').currency),
    recent_snapshots: snapshots.results.map((s) => ({
      date: s.snapshot_date,
      net_worth: num(s.net_worth),
      total_assets: num(s.total_assets),
      total_liabilities: num(s.total_liabilities),
      currency_code: s.currency_code,
    })),
  });
});

dashboard.get('/projection', async (c) => {
  const userId = c.get('user').id;

  const [journey, debts] = await Promise.all([
    c.env.DB.prepare('SELECT monthly_sip_goal FROM journeys WHERE user_id = ? ORDER BY created_at ASC LIMIT 1')
      .bind(userId).first<{ monthly_sip_goal: number | null }>(),
    c.env.DB.prepare(
      "SELECT COALESCE(SUM(amount - paid_amount), 0) AS debt, COALESCE(SUM(emi_amount), 0) AS emi FROM debts WHERE user_id = ? AND status = 'active'",
    ).bind(userId).first<{ debt: number | null; emi: number | null }>(),
  ]);

  const monthlySip = journey?.monthly_sip_goal == null ? 0 : num(journey.monthly_sip_goal);
  const totalDebt = num(debts?.debt);
  const monthlyEmi = num(debts?.emi);

  // Rails: (1..60).map — remaining debt floored at 0, linear SIP accumulation.
  const projection = Array.from({ length: 60 }, (_, i) => {
    const month = i + 1;
    const remainingDebt = Math.max(totalDebt - monthlyEmi * month, 0);
    const invested = monthlySip * month;
    return {
      month,
      debt: round2(remainingDebt),
      investments: round2(invested),
      net_worth: round2(invested - remainingDebt),
    };
  });

  return success(c, { projection });
});
