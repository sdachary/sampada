// Api::DebtsController — index/show/create/update/destroy + /simulate.
// Rails parity: debt_json computed per-row (remaining clamped ≥0, progress %
// rounded 1dp, debt_free_date = today + months_remaining months).

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { addMonthsClamped, error, nowIso, num, round1, success, symbolFor, todayIso, type AppContext } from './util';
import { avalanchePlan, type PayoffDebt } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

type DebtRow = {
  id: string; name: string; category: string | null; amount: number | null;
  interest_rate: number | null; emi_amount: number | null; due_date: string | null;
  status: string | null; paid_amount: number | null; started_at: string | null;
  notes: string | null; created_at: string; currency_code: string | null; user_id: string;
};

function debtJson(d: DebtRow) {
  const amount = num(d.amount);
  const paid = num(d.paid_amount);
  const interestRate = d.interest_rate === null || d.interest_rate === undefined ? null : Number(d.interest_rate);
  const emi = d.emi_amount === null || d.emi_amount === undefined ? null : Number(d.emi_amount);
  const remaining = Math.max(0, Math.min(amount - paid, amount));
  const progress = amount > 0 ? Math.min(round1((paid / amount) * 100), 100) : 0;
  const monthsRemaining = emi && emi > 0 ? Math.ceil(remaining / emi) : 0;
  const debtFree = monthsRemaining > 0 ? addMonthsClamped(todayIso(), monthsRemaining) : null;

  return {
    id: d.id, name: d.name, category: d.category, amount,
    interest_rate: interestRate, emi_amount: emi, due_date: d.due_date,
    status: d.status, paid_amount: paid,
    remaining, progress,
    debt_free_date: debtFree, months_remaining: monthsRemaining,
    started_at: d.started_at, notes: d.notes, created_at: d.created_at,
    currency_code: d.currency_code || 'INR',
    currency_symbol: symbolFor(d.currency_code),
  };
}

router.get('/', async (c) => {
  const user = c.get('user');
  const onlyActive = c.req.query('active') === 'true' || c.req.query('active') === '1';
  const where = onlyActive ? 'WHERE user_id = ? AND status = ?' : 'WHERE user_id = ?';
  const params: unknown[] = onlyActive ? [user.id, 'active'] : [user.id];
  const rows = await c.env.DB.prepare(
    `SELECT * FROM debts ${where} ORDER BY created_at DESC`,
  ).bind(...params).all<DebtRow>();
  return success(c, rows.results.map(debtJson));
});

router.get('/:id', async (c) => {
  const user = c.get('user');
  const d = await c.env.DB.prepare('SELECT * FROM debts WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).first<DebtRow>();
  if (!d) return error(c, 'Record not found', 404);
  return success(c, debtJson(d));
});

router.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  if (body.name === undefined || String(body.name).trim() === '') {
    return error(c, 'Validation failed', 422, ['Name can\'t be blank']);
  }
  const now = nowIso();
  const id = crypto.randomUUID();

  const sets: string[] = [];
  const values: unknown[] = [id, user.id, String(body.name), now, now];
  const numericKeys = ['amount', 'interest_rate', 'emi_amount', 'paid_amount'];
  for (const key of ['name', 'category', 'amount', 'interest_rate', 'emi_amount', 'due_date', 'status', 'started_at', 'paid_amount', 'notes', 'currency_code']) {
    if (body[key] === undefined) continue;
    sets.push(`${key} = ?`);
    const v = body[key];
    values.push(numericKeys.includes(key) && v !== null ? Number(v) : (v === null ? null : v));
  }
  const sql = `INSERT INTO debts (id, user_id, name, created_at, updated_at, ${sets.join(', ')}) VALUES (?, ?, ?, ?, ?, ${sets.map(() => '?').join(', ')})`;
  await c.env.DB.prepare(sql).bind(...values).run();

  const d = await c.env.DB.prepare('SELECT * FROM debts WHERE id = ?').bind(id).first<DebtRow>();
  return c.json(debtJson(d!), 201);
});

function makeUpdateHandler() {
  return async (c: AppContext) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const d = await c.env.DB.prepare('SELECT id FROM debts WHERE id = ? AND user_id = ?')
      .bind(id, user.id).first<{ id: string }>();
    if (!d) return error(c, 'Record not found', 404);

    const body = await c.req.json().catch(() => ({}));
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const key of ['name','category','amount','interest_rate','emi_amount','due_date','status','started_at','paid_amount','notes','currency_code']) {
      if (body[key] === undefined) continue;
      sets.push(`${key} = ?`);
      const v = body[key];
      values.push((v === null) ? null : (key === 'amount' || key === 'interest_rate' || key === 'emi_amount' || key === 'paid_amount') ? Number(v) : v);
    }
    sets.push('updated_at = ?');
    values.push(nowIso());
    await c.env.DB.prepare(`UPDATE debts SET ${sets.join(', ')} WHERE id = ?`).bind(...values, id).run();
    const row = await c.env.DB.prepare('SELECT * FROM debts WHERE id = ?').bind(id).first<DebtRow>();
    return success(c, debtJson(row!));
  };
}

router.put('/:id', makeUpdateHandler());
router.patch('/:id', makeUpdateHandler());

router.delete('/:id', async (c) => {
  const user = c.get('user');
  const d = await c.env.DB.prepare('SELECT id FROM debts WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).first<{ id: string }>();
  if (!d) return error(c, 'Record not found', 404);
  await c.env.DB.prepare('DELETE FROM debts WHERE id = ?').bind(d.id).run();
  return success(c, {}, 'Debt deleted');
});

router.post('/:id/simulate', async (c) => {
  const user = c.get('user');
  const d = await c.env.DB.prepare('SELECT * FROM debts WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).first<DebtRow>();
  if (!d) return error(c, 'Record not found', 404);

  const body = await c.req.json().catch(() => ({}));
  const balance = num(d.amount) - num(d.paid_amount);
  const interestRate = d.interest_rate === null || d.interest_rate === undefined ? 0 : Number(d.interest_rate);
  const emi = d.emi_amount === null || d.emi_amount === undefined ? 0 : Number(d.emi_amount);

  const extra = Number(body.extra_monthly_payment) || 0;
  const lumpSum = Number(body.lump_sum_amount) || 0;
  const annualExtra = Number(body.annual_extra) || 0;
  const custom: Record<number, number> = {};
  if (Array.isArray(body.custom_extra_payments)) {
    for (const ce of body.custom_extra_payments) {
      const m = Number(ce?.month);
      if (Number.isFinite(m)) custom[m] = Number(ce?.amount) || 0;
    }
  }

  const debts: PayoffDebt[] = [{ id: d.id, balance, interest_rate: interestRate, min_payment: emi }];
  const result = avalanchePlan(debts, {
    extra_payment: extra,
    lump_sum_amount: lumpSum,
    annual_extra: annualExtra,
    custom_extra_payments: custom,
  });
  return success(c, result);
});

export default router;
