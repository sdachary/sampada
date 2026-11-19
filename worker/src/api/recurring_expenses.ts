// Api::RecurringExpensesController — index/show/create/update/destroy +
// calendar (collection + member). Calendar routes declared before /:id.

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { error, jsonBody, notFound, nowIso, success, symbolFor, todayIso, boolFlag } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

type Ctx = Parameters<typeof success>[0];

type RecurringExpenseRow = {
  id: string; name: string; amount: number | null; frequency: string;
  next_due_date: string | null; category: string | null; auto_debit: number | null;
  active: number | null; notes: string | null; created_at: string; currency_code: string;
};

const FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

function monthlyAmount(amount: number, frequency: string): number {
  switch (frequency) {
    case 'weekly': return amount * 4.33;
    case 'monthly':
    case 'daily': return amount;
    case 'quarterly': return amount / 3.0;
    case 'yearly': return amount / 12.0;
  }
  return amount;
}

function expenseJson(e: RecurringExpenseRow) {
  const amount = Number(e.amount ?? 0);
  const nextDueDays = e.next_due_date
    ? Math.round((Date.parse(e.next_due_date) - Date.parse(todayIso())) / 86400000)
    : null;
  const cc = e.currency_code || 'INR';
  return {
    id: e.id, name: e.name, amount, frequency: e.frequency, next_due_date: e.next_due_date,
    next_due_days: nextDueDays, monthly_amount: monthlyAmount(amount, e.frequency),
    category: e.category, auto_debit: boolFlag(e.auto_debit), active: boolFlag(e.active),
    notes: e.notes, created_at: e.created_at, currency_code: cc, currency_symbol: symbolFor(cc),
  };
}

router.get('/', async (c) => {
  const user = c.get('user');
  const rows = await c.env.DB.prepare(
    'SELECT * FROM recurring_expenses WHERE user_id = ? ORDER BY created_at DESC',
  ).bind(user.id).all<RecurringExpenseRow>();
  return success(c, rows.results.map(expenseJson));
});

router.get('/calendar', async (c) => {
  const user = c.get('user');
  const rows = await c.env.DB.prepare(
    'SELECT * FROM recurring_expenses WHERE user_id = ? ORDER BY created_at DESC',
  ).bind(user.id).all<RecurringExpenseRow>();
  return success(c, { expenses: rows.results.map(expenseJson) });
});

router.get('/:id', async (c) => {
  const user = c.get('user');
  const e = await c.env.DB.prepare('SELECT * FROM recurring_expenses WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).first<RecurringExpenseRow>();
  if (!e) return notFound(c);
  return success(c, expenseJson(e));
});

router.get('/:id/calendar', async (c) => {
  const user = c.get('user');
  const e = await c.env.DB.prepare('SELECT * FROM recurring_expenses WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).first<RecurringExpenseRow>();
  if (!e) return notFound(c);
  return success(c, { expenses: [expenseJson(e)] });
});

router.post('/', async (c) => {
  const user = c.get('user');
  const body = await jsonBody<Record<string, unknown>>(c);
  const source = (body.recurring_expense as Record<string, unknown> | undefined) ?? body;

  const errs: string[] = [];
  const name = source.name ? String(source.name) : null;
  const amount = source.amount === null || source.amount === undefined ? null : Number(source.amount);
  const frequency = source.frequency ? String(source.frequency) : null;
  if (!name || name.trim() === '') errs.push("Name can't be blank");
  if (amount === null) errs.push("Amount can't be blank");
  if (!frequency || !FREQUENCIES.includes(frequency)) {
    if (!frequency) errs.push("Frequency can't be blank");
    else errs.push('Frequency is not included in the list');
  }
  if (amount !== null && amount <= 0) errs.push('Amount must be greater than 0');
  if (errs.length) return error(c, 'Validation failed', 422, errs);

  const now = nowIso();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO recurring_expenses (id, user_id, name, amount, frequency, next_due_date, category, auto_debit, active, notes, currency_code, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, user.id,
    source.name ? String(source.name) : null, amount, frequency,
    source.next_due_date ? String(source.next_due_date) : null,
    source.category ? String(source.category) : null,
    source.auto_debit ? 1 : 0, source.active === undefined ? 1 : (source.active ? 1 : 0),
    source.notes ? String(source.notes) : null,
    source.currency_code ? String(source.currency_code) : 'INR',
    now, now,
  ).run();

  const e = await c.env.DB.prepare('SELECT * FROM recurring_expenses WHERE id = ?').bind(id).first<RecurringExpenseRow>();
  return c.json(expenseJson(e!), 201);
});

router.put('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const e = await c.env.DB.prepare('SELECT * FROM recurring_expenses WHERE id = ? AND user_id = ?')
    .bind(id, user.id).first<RecurringExpenseRow>();
  if (!e) return notFound(c);

  const body = await jsonBody<Record<string, unknown>>(c);
  const source = (body.recurring_expense as Record<string, unknown> | undefined) ?? body;
  const has = (k: string) => source[k] !== undefined;

  const candidate = {
    name: has('name') ? (source.name ? String(source.name) : null) : e.name,
    amount: has('amount') ? (source.amount === null || source.amount === undefined ? null : Number(source.amount)) : Number(e.amount ?? 0),
    frequency: has('frequency') ? (source.frequency ? String(source.frequency) : null) : e.frequency,
    next_due_date: has('next_due_date') ? (source.next_due_date ? String(source.next_due_date) : null) : e.next_due_date,
    category: has('category') ? (source.category ? String(source.category) : null) : e.category,
    auto_debit: has('auto_debit') ? (source.auto_debit ? 1 : 0) : (e.auto_debit ?? 0),
    active: has('active') ? (source.active ? 1 : 0) : (e.active ?? 0),
    notes: has('notes') ? (source.notes ? String(source.notes) : null) : e.notes,
    currency_code: has('currency_code') ? (source.currency_code ? String(source.currency_code) : 'INR') : (e.currency_code || 'INR'),
  };

  const errs: string[] = [];
  const name = candidate.name;
  const amount = candidate.amount;
  const frequency = candidate.frequency;
  if (!name || name.trim() === '') errs.push("Name can't be blank");
  if (amount === null) errs.push("Amount can't be blank");
  if (!frequency || !FREQUENCIES.includes(frequency)) {
    if (!frequency) errs.push("Frequency can't be blank");
    else errs.push('Frequency is not included in the list');
  }
  if (amount !== null && amount <= 0) errs.push('Amount must be greater than 0');
  if (errs.length) return error(c, 'Validation failed', 422, errs);

  const sets: string[] = [];
  const values: unknown[] = [];
  if (has('name')) { sets.push('name = ?'); values.push(candidate.name); }
  if (has('amount')) { sets.push('amount = ?'); values.push(candidate.amount); }
  if (has('frequency')) { sets.push('frequency = ?'); values.push(candidate.frequency); }
  if (has('next_due_date')) { sets.push('next_due_date = ?'); values.push(candidate.next_due_date); }
  if (has('category')) { sets.push('category = ?'); values.push(candidate.category); }
  if (has('auto_debit')) { sets.push('auto_debit = ?'); values.push(candidate.auto_debit); }
  if (has('active')) { sets.push('active = ?'); values.push(candidate.active); }
  if (has('notes')) { sets.push('notes = ?'); values.push(candidate.notes); }
  if (has('currency_code')) { sets.push('currency_code = ?'); values.push(candidate.currency_code); }
  if (sets.length > 0) {
    sets.push('updated_at = ?');
    values.push(nowIso());
    await c.env.DB.prepare(`UPDATE recurring_expenses SET ${sets.join(', ')} WHERE id = ?`).bind(...values, id).run();
  }

  const fresh = await c.env.DB.prepare('SELECT * FROM recurring_expenses WHERE id = ?').bind(id).first<RecurringExpenseRow>();
  return success(c, expenseJson(fresh!));
});

router.delete('/:id', async (c) => {
  const user = c.get('user');
  const result = await c.env.DB.prepare('DELETE FROM recurring_expenses WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).run();
  if (result.meta.changes === 0) return notFound(c);
  return c.body(null, 204);
});

export default router;
