// Api::DividendSipsController — index/show/create/update/destroy + member
// suggest. All routes in scope for chunk 2 (suggest included; calendar etc.
// stay chunk 3).

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { error, jsonBody, notFound, nowIso, round2, success, todayIso } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

type Ctx = Parameters<typeof success>[0];

type SipRow = {
  id: string; portfolio_id: string; name: string | null; amount: number | null;
  frequency: string; status: string | null; target_income: number | null;
  next_execution: string | null; created_at: string; currency_code: string | null;
};

function sipJson(s: SipRow) {
  const amount = Number(s.amount ?? 0);
  const monthlyInvestment = s.amount === null ? 0 : amount;
  const monthlyContribution = s.frequency === 'quarterly' ? amount / 3.0 : s.frequency === 'yearly' ? amount / 12.0 : amount;
  const projected = monthlyContribution * 12 * 0.04;
  const cc = s.currency_code || 'INR';
  return {
    id: s.id, portfolio_id: s.portfolio_id, name: s.name, amount,
    monthly_investment: monthlyInvestment, frequency: s.frequency, status: s.status,
    target_income: s.target_income === null ? null : Number(s.target_income),
    monthly_contribution: monthlyContribution,
    projected_annual_income: projected,
    next_execution: s.next_execution, created_at: s.created_at,
    currency_code: cc, currency_symbol: cc,
  };
}

router.get('/', async (c) => {
  const user = c.get('user');
  const rows = await c.env.DB.prepare(
    `SELECT s.* FROM dividend_sips s JOIN portfolios p ON p.id = s.portfolio_id
     WHERE p.user_id = ? ORDER BY s.created_at DESC`,
  ).bind(user.id).all<SipRow>();
  return success(c, rows.results.map(sipJson));
});

router.get('/:id', async (c) => {
  const user = c.get('user');
  const s = await c.env.DB.prepare(
    `SELECT s.* FROM dividend_sips s JOIN portfolios p ON p.id = s.portfolio_id
     WHERE s.id = ? AND p.user_id = ?`,
  ).bind(c.req.param('id'), user.id).first<SipRow>();
  if (!s) return notFound(c);
  return success(c, sipJson(s));
});

router.post('/', async (c) => {
  const user = c.get('user');
  const body = await jsonBody<Record<string, unknown>>(c);
  const source = (body.dividend_sip as Record<string, unknown> | undefined) ?? body;

  const portfolioId = source.portfolio_id ? String(source.portfolio_id) : null;
  if (!portfolioId) return error(c, 'Portfolio is required', 422);

  const portfolio = await c.env.DB.prepare(
    'SELECT id FROM portfolios WHERE id = ? AND user_id = ?',
  ).bind(portfolioId, user.id).first<{ id: string }>();
  if (!portfolio) return notFound(c);

  const amount = source.amount === null || source.amount === undefined ? null : Number(source.amount);
  const frequency = source.frequency ? String(source.frequency) : null;
  const errs: string[] = [];
  if (amount === null) errs.push("Amount can't be blank");
  if (!frequency || !['monthly', 'quarterly', 'yearly'].includes(frequency)) {
    if (!frequency) errs.push("Frequency can't be blank");
    else errs.push('Frequency is not included in the list');
  }
  if (amount !== null && amount > 0 && amount <= 0) errs.push('Amount must be greater than 0');
  if (errs.length) return error(c, 'Validation failed', 422, errs);

  const now = nowIso();
  const id = crypto.randomUUID();
  const amountFinal = source.monthly_investment ? Number(source.monthly_investment) : amount;
  await c.env.DB.prepare(
    `INSERT INTO dividend_sips (id, portfolio_id, name, amount, frequency, status, target_income, next_execution, currency_code, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, portfolioId,
    source.name ? String(source.name) : null, amountFinal, frequency,
    source.status ? String(source.status) : 'active',
    source.target_income === null || source.target_income === undefined ? null : Number(source.target_income),
    source.next_execution ? String(source.next_execution) : null,
    source.currency_code ? String(source.currency_code) : 'INR',
    now, now,
  ).run();

  const s = await c.env.DB.prepare('SELECT * FROM dividend_sips WHERE id = ?').bind(id).first<SipRow>();
  return c.json(sipJson(s!), 201);
});

router.put('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const s = await c.env.DB.prepare(
    `SELECT s.* FROM dividend_sips s JOIN portfolios p ON p.id = s.portfolio_id
     WHERE s.id = ? AND p.user_id = ?`,
  ).bind(id, user.id).first<SipRow>();
  if (!s) return notFound(c);

  const body = await jsonBody<Record<string, unknown>>(c);
  const source = (body.dividend_sip as Record<string, unknown> | undefined) ?? body;
  const has = (k: string) => source[k] !== undefined;

  const candidate = {
    name: has('name') ? (source.name ? String(source.name) : null) : s.name,
    amount: has('amount') ? (source.amount === null || source.amount === undefined ? null : Number(source.amount)) : Number(s.amount ?? 0),
    frequency: has('frequency') ? (source.frequency ? String(source.frequency) : null) : s.frequency,
    status: has('status') ? (source.status ? String(source.status) : null) : s.status,
    target_income: has('target_income') ? (source.target_income === null || source.target_income === undefined ? null : Number(source.target_income)) : s.target_income,
    next_execution: has('next_execution') ? (source.next_execution ? String(source.next_execution) : null) : s.next_execution,
    monthly_investment: has('monthly_investment') ? (source.monthly_investment ? Number(source.monthly_investment) : null) : Number(s.amount ?? 0),
    currency_code: has('currency_code') ? (source.currency_code ? String(source.currency_code) : 'INR') : (s.currency_code || 'INR'),
  };

  const errs: string[] = [];
  const amount = candidate.amount;
  const frequency = candidate.frequency;
  if (amount === null) errs.push("Amount can't be blank");
  if (!frequency || !['monthly', 'quarterly', 'yearly'].includes(frequency)) {
    if (!frequency) errs.push("Frequency can't be blank");
    else errs.push('Frequency is not included in the list');
  }
  if (errs.length) return error(c, 'Validation failed', 422, errs);

  const sets: string[] = [];
  const values: unknown[] = [];
  if (has('name')) { sets.push('name = ?'); values.push(candidate.name); }
  if (has('amount') || has('monthly_investment')) {
    sets.push('amount = ?');
    values.push(candidate.monthly_investment ?? candidate.amount);
  }
  if (has('frequency')) { sets.push('frequency = ?'); values.push(candidate.frequency); }
  if (has('status')) { sets.push('status = ?'); values.push(candidate.status); }
  if (has('target_income')) { sets.push('target_income = ?'); values.push(candidate.target_income); }
  if (has('next_execution')) { sets.push('next_execution = ?'); values.push(candidate.next_execution); }
  if (has('currency_code')) { sets.push('currency_code = ?'); values.push(candidate.currency_code); }
  if (sets.length > 0) {
    sets.push('updated_at = ?');
    values.push(nowIso());
    await c.env.DB.prepare(`UPDATE dividend_sips SET ${sets.join(', ')} WHERE id = ?`).bind(...values, id).run();
  }

  const fresh = await c.env.DB.prepare('SELECT * FROM dividend_sips WHERE id = ?').bind(id).first<SipRow>();
  return success(c, sipJson(fresh!));
});

router.delete('/:id', async (c) => {
  const user = c.get('user');
  const result = await c.env.DB.prepare(
    'DELETE FROM dividend_sips WHERE id = ? AND portfolio_id IN (SELECT id FROM portfolios WHERE user_id = ?)',
  ).bind(c.req.param('id'), user.id).run();
  if (result.meta.changes === 0) return notFound(c);
  return c.body(null, 204);
});

router.get('/:id/suggest', async (c) => {
  const user = c.get('user');
  const s = await c.env.DB.prepare(
    `SELECT s.* FROM dividend_sips s JOIN portfolios p ON p.id = s.portfolio_id
     WHERE s.id = ? AND p.user_id = ?`,
  ).bind(c.req.param('id'), user.id).first<SipRow>();
  if (!s) return notFound(c);

  const monthlyRaw = c.req.query('monthly_investment');
  const monthly = monthlyRaw ? Number(monthlyRaw) || Number(s.amount ?? 0) : Number(s.amount ?? 0);
  const yearsRaw = c.req.query('years');
  const years = yearsRaw ? Number(yearsRaw) || 10 : 10;
  const target = monthly * 12 * years * 0.04;
  return success(c, {
    stocks: [],
    target_income: round2(target),
    disclaimer: 'Dividend Scrip suggestions are for informational purposes only.',
  });
});

export default router;
