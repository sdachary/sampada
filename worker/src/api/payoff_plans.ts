// Api::PayoffPlansController — index, show, create, update, destroy.
// Rails parity: calculate_and_save runs on create+update (update_columns
// syncs the in-memory record, so the response carries the computed values),
// debts come through debt_payoff_debts in insertion order, and strategy
// validates presence + inclusion.

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import {
  addMonthsClamped, avalanchePlan, error, jsonBody, notFound, nowIso,
  success, todayIso,
} from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

type Ctx = Parameters<typeof success>[0];

type PlanRow = {
  id: string; name: string | null; strategy: string; extra_payment: number | null;
  months_saved: number | null; debt_free_date: string | null;
  total_interest_paid: number | null; total_interest_saved: number | null;
  schedule: string | null; currency_code: string; created_at: string;
};

type DebtRow = {
  id: string; name: string; amount: number; interest_rate: number | null;
  emi_amount: number | null;
};

async function planDebts(c: Ctx, planId: string): Promise<DebtRow[]> {
  // Through-association order is insertion order → join-table rowid.
  const rows = await c.env.DB.prepare(
    `SELECT d.id, d.name, d.amount, d.interest_rate, d.emi_amount
     FROM debts d JOIN debt_payoff_debts j ON j.debt_id = d.id
     WHERE j.debt_payoff_id = ? ORDER BY j.rowid`,
  ).bind(planId).all<DebtRow>();
  return rows.results;
}

function planJson(p: PlanRow, debts: DebtRow[]) {
  let schedule: unknown = null;
  if (p.schedule) {
    try { schedule = JSON.parse(p.schedule); } catch { schedule = null; }
  }
  return {
    id: p.id,
    name: p.name,
    strategy: p.strategy,
    // &.to_f — full float precision, no rounding.
    extra_payment: p.extra_payment === null ? null : Number(p.extra_payment),
    months_saved: p.months_saved,
    debt_free_date: p.debt_free_date,
    total_interest_paid: p.total_interest_paid === null ? null : Number(p.total_interest_paid),
    total_interest_saved: p.total_interest_saved === null ? null : Number(p.total_interest_saved),
    schedule,
    debts: debts.map((d) => ({
      id: d.id,
      name: d.name,
      amount: Number(d.amount),
      interest_rate: d.interest_rate === null ? null : Number(d.interest_rate),
      emi_amount: d.emi_amount === null ? null : Number(d.emi_amount),
    })),
    currency_code: p.currency_code,
    created_at: p.created_at,
  };
}

// DebtPayoffService#calculate_plan via calculate_and_save — runs for both
// strategies (snowball = smallest-balance-first), plus a same-strategy
// zero-extra baseline for the savings figures.
async function calculateAndSave(c: Ctx, plan: PlanRow, debts: DebtRow[]): Promise<void> {
  const debtsData = debts.map((d) => ({
    id: d.id,
    balance: Number(d.amount),
    interest_rate: Number(d.interest_rate) || 0,
    min_payment: Number(d.emi_amount) || 0,
  }));
  if (debtsData.length === 0) return;

  const strategy = plan.strategy === 'snowball' ? 'snowball' as const : 'avalanche' as const;
  const result = avalanchePlan(debtsData, { extra_payment: Number(plan.extra_payment) || 0, strategy });
  const baseline = avalanchePlan(debtsData, { extra_payment: 0, strategy });

  const monthsSaved = Math.max(baseline.months - result.months, 0);
  const debtFreeDate = addMonthsClamped(todayIso(), result.months);
  const interestPaid = result.total_interest;
  const interestSaved = Math.max(baseline.total_interest - result.total_interest, 0);

  await c.env.DB.prepare(
    `UPDATE debt_payoffs SET months_saved = ?, debt_free_date = ?, total_interest_paid = ?,
     total_interest_saved = ?, schedule = ? WHERE id = ?`,
  ).bind(monthsSaved, debtFreeDate, interestPaid, interestSaved, JSON.stringify(result.schedule), plan.id).run();

  // update_columns syncs the in-memory record in Rails.
  plan.months_saved = monthsSaved;
  plan.debt_free_date = debtFreeDate;
  plan.total_interest_paid = interestPaid;
  plan.total_interest_saved = interestSaved;
  plan.schedule = JSON.stringify(result.schedule);
}

// has_many debt_ids= writer: unknown ids are silently dropped. Rails' setter
// is unscoped (any existing debt id links — a leak); we scope to the user.
async function replaceDebtIds(c: Ctx, planId: string, userId: string, debtIds: unknown): Promise<void> {
  if (!Array.isArray(debtIds)) return;
  const ids = debtIds.filter((v): v is string => typeof v === 'string');
  if (ids.length === 0) {
    await c.env.DB.prepare('DELETE FROM debt_payoff_debts WHERE debt_payoff_id = ?').bind(planId).run();
    return;
  }
  const owned = await c.env.DB.prepare(
    `SELECT id FROM debts WHERE user_id = ? AND id IN (${ids.map(() => '?').join(',')})`,
  ).bind(userId, ...ids).all<{ id: string }>();
  const ownedSet = new Set(owned.results.map((r) => r.id));

  const existing = await c.env.DB.prepare(
    'SELECT debt_id FROM debt_payoff_debts WHERE debt_payoff_id = ?',
  ).bind(planId).all<{ debt_id: string }>();
  const existingSet = new Set(existing.results.map((r) => r.debt_id));

  for (const id of existingSet) {
    if (!ownedSet.has(id)) {
      await c.env.DB.prepare('DELETE FROM debt_payoff_debts WHERE debt_payoff_id = ? AND debt_id = ?')
        .bind(planId, id).run();
    }
  }
  for (const id of ids) {
    if (ownedSet.has(id) && !existingSet.has(id)) {
      await c.env.DB.prepare(
        'INSERT INTO debt_payoff_debts (id, debt_id, debt_payoff_id) VALUES (?, ?, ?)',
      ).bind(crypto.randomUUID(), id, planId).run();
    }
  }
}

router.get('/', async (c) => {
  const user = c.get('user');
  const rows = await c.env.DB.prepare(
    'SELECT * FROM debt_payoffs WHERE user_id = ? ORDER BY created_at DESC',
  ).bind(user.id).all<PlanRow>();
  const plans = [];
  for (const p of rows.results) {
    plans.push(planJson(p, await planDebts(c, p.id)));
  }
  return c.json(plans);
});

router.get('/:id', async (c) => {
  const user = c.get('user');
  const p = await c.env.DB.prepare('SELECT * FROM debt_payoffs WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).first<PlanRow>();
  if (!p) return notFound(c);
  return success(c, planJson(p, await planDebts(c, p.id)));
});

// strategy: presence + inclusion → two full_messages when nil.
function validatePlan(source: Record<string, unknown>): string[] {
  const errs: string[] = [];
  const strategy = source.strategy;
  if (strategy === undefined || strategy === null || String(strategy).trim() === '') {
    errs.push("Strategy can't be blank");
  }
  if (strategy === undefined || strategy === null || !['avalanche', 'snowball'].includes(String(strategy))) {
    errs.push('Strategy is not included in the list');
  }
  return errs;
}

router.post('/', async (c) => {
  const user = c.get('user');
  const body = await jsonBody<Record<string, unknown>>(c);
  const source = (body.debt_payoff as Record<string, unknown> | undefined) ?? body;
  const errs = validatePlan(source);
  if (errs.length) return error(c, 'Validation failed', 422, errs);

  const now = nowIso();
  const id = crypto.randomUUID();
  const extra = source.extra_payment;
  const extraNum = extra === undefined || extra === null || extra === '' ? null : Number(extra);
  await c.env.DB.prepare(
    `INSERT INTO debt_payoffs (id, name, strategy, extra_payment, currency_code, created_at, updated_at, user_id)
     VALUES (?, ?, ?, ?, 'INR', ?, ?, ?)`,
  ).bind(
    id,
    source.name == null ? null : String(source.name),
    String(source.strategy),
    extraNum !== null && Number.isFinite(extraNum) ? extraNum : null,
    now, now, user.id,
  ).run();

  if (Array.isArray(source.debt_ids)) {
    await replaceDebtIds(c, id, user.id, source.debt_ids);
  }

  const p = await c.env.DB.prepare('SELECT * FROM debt_payoffs WHERE id = ?').bind(id).first<PlanRow>();
  const debts = await planDebts(c, id);
  await calculateAndSave(c, p!, debts);
  return c.json(planJson(p!, debts), 201);
});

router.put('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const p = await c.env.DB.prepare('SELECT * FROM debt_payoffs WHERE id = ? AND user_id = ?')
    .bind(id, user.id).first<PlanRow>();
  if (!p) return notFound(c);

  const body = await jsonBody<Record<string, unknown>>(c);
  const source = (body.debt_payoff as Record<string, unknown> | undefined) ?? body;
  // Explicit null strategy must fail validation, not fall back to stored.
  const errs = validatePlan({
    ...source,
    strategy: source.strategy === undefined ? p.strategy : source.strategy,
  });
  if (errs.length) return error(c, 'Validation failed', 422, errs);

  const sets: string[] = [];
  const values: unknown[] = [];
  if (source.name !== undefined) { sets.push('name = ?'); values.push(source.name == null ? null : String(source.name)); }
  if (source.strategy !== undefined) { sets.push('strategy = ?'); values.push(String(source.strategy)); }
  if (source.extra_payment !== undefined) {
    const extra = source.extra_payment;
    const n = extra === null || extra === '' ? null : Number(extra);
    sets.push('extra_payment = ?');
    values.push(n !== null && Number.isFinite(n) ? n : null);
  }
  if (sets.length > 0) {
    sets.push('updated_at = ?');
    values.push(nowIso());
    await c.env.DB.prepare(`UPDATE debt_payoffs SET ${sets.join(', ')} WHERE id = ?`).bind(...values, id).run();
  }
  if (Array.isArray(source.debt_ids)) {
    await replaceDebtIds(c, id, user.id, source.debt_ids);
  }

  const fresh = await c.env.DB.prepare('SELECT * FROM debt_payoffs WHERE id = ?').bind(id).first<PlanRow>();
  const debts = await planDebts(c, id);
  await calculateAndSave(c, fresh!, debts);
  return success(c, planJson(fresh!, debts));
});

router.delete('/:id', async (c) => {
  const user = c.get('user');
  const result = await c.env.DB.prepare('DELETE FROM debt_payoffs WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).run();
  if (result.meta.changes === 0) return notFound(c);
  return c.body(null, 204);
});

export default router;
