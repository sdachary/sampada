// Api::BudgetsController — CRUD + overview. ScopedCrud base class
// with custom budget_detail that adds spent/remaining/usage_pct/on_track.

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { error, num, nowIso, round1, success, type AppContext } from './util';
import { todayIso, addMonthsClamped } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

type BudgetCtx = Context<AppEnv, '/api/v1/budgets/:id'>;

type BudgetRow = {
  id: string; budget_category_id: string; monthly_limit: number | null;
  currency_code: string | null; period: string | null; start_date: string | null;
  end_date: string | null; notes: string | null; household_id: string | null;
  created_at: string; updated_at: string; user_id: string;
};

// Rails: weekly /4, monthly ×1, quarterly ×3, yearly ×12
function periodLimit(period: string | null, monthlyLimit: number): number | null {
  switch (period) {
    case 'weekly': return monthlyLimit / 4;
    case 'monthly': return monthlyLimit;
    case 'quarterly': return monthlyLimit * 3;
    case 'yearly': return monthlyLimit * 12;
    default: return null;
  }
}

// Rails: current_period_range start = beginning_of_{week,month,quarter,year}
function periodStart(today: string, period: string | null): string {
  const [y, m, d] = today.split('-').map(Number);
  switch (period) {
    case 'weekly': {
      // beginning_of_week = Monday
      const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
      let ny = y, nm = m, nd = d - dow;
      if (nd < 1) {
        nm -= 1;
        if (nm < 1) { ny -= 1; nm = 12; }
        nd = new Date(Date.UTC(ny, nm, 0)).getUTCDate() + nd;
      }
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${ny}-${pad(nm)}-${pad(nd)}`;
    }
    case 'monthly': return `${y}-${String(m).padStart(2, '0')}-01`;
    case 'quarterly': {
      const qm = Math.floor((m - 1) / 3) * 3 + 1;
      return `${y}-${String(qm).padStart(2, '0')}-01`;
    }
    case 'yearly': return `${y}-01-01`;
    default: return today;
  }
}

// spent_this_period = raw sum of category transactions in period start..today
async function spentThisPeriod(env: AppEnv['Bindings'], userId: string, catId: string, period: string | null, today: string): Promise<number> {
  const start = periodStart(today, period);
  const row = await env.DB.prepare(
    'SELECT SUM(amount) AS t FROM transactions WHERE user_id = ? AND budget_category_id = ? AND transaction_date >= ? AND transaction_date <= ?',
  ).bind(userId, catId, start, today).first<{ t: number | null }>();
  return num(row?.t);
}

function budgetJson(b: BudgetRow) {
  return {
    id: b.id, budget_category_id: b.budget_category_id,
    category_name: b.budget_category_id, monthly_limit: num(b.monthly_limit),
    currency_code: b.currency_code || 'INR',
    period: b.period, start_date: b.start_date, end_date: b.end_date,
    created_at: b.created_at,
  };
}

async function budgetDetail(c: AppContext, b: BudgetRow) {
  const today = todayIso();
  const limit = periodLimit(b.period, num(b.monthly_limit));
  const spent = await spentThisPeriod(c.env, c.get('user').id, b.budget_category_id, b.period, today);
  const remaining = (limit ?? 0) - spent;
  const usagePct = limit && limit > 0 ? Math.min(round1((spent / limit) * 100), 100) : 0;
  const onTrack = onTrackCheck(b.period, limit, spent, today, usagePct);
  return { ...budgetJson(b), spent, remaining, usage_pct: usagePct, on_track: onTrack };
}

// Rails on_track? — expected_pct varies by period; true when usage ≤ expected*1.2
function onTrackCheck(period: string | null, limit: number | null, spent: number, today: string, usagePct: number): boolean {
  if (!limit || limit <= 0) return true;
  const [y, m, d] = today.split('-').map(Number);
  let expectedPct = 0;
  switch (period) {
    case 'weekly': expectedPct = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() / 7) * 100; break;
    case 'monthly': {
      const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
      expectedPct = (d / daysInMonth) * 100;
      break;
    }
    case 'quarterly': {
      const qm = Math.floor((m - 1) / 3) * 3 + 1;
      const qStart = new Date(Date.UTC(y, qm - 1, 1));
      const qEnd = new Date(Date.UTC(y, qm + 2, 0)); // last day of quarter end month
      const daysIn = Math.round((qEnd.getTime() - qStart.getTime()) / 86400000) + 1;
      const daysPassed = Math.round((Date.UTC(y, m - 1, d) - qStart.getTime()) / 86400000);
      expectedPct = (daysPassed / daysIn) * 100;
      break;
    }
    case 'yearly': {
      const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
      const dayOfYear = Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
      expectedPct = (dayOfYear / (isLeap ? 366 : 365)) * 100;
      break;
    }
    default: expectedPct = 100;
  }
  return usagePct <= expectedPct * 1.2;
}

async function findBudget(c: BudgetCtx, id: string): Promise<BudgetRow | null> {
  return c.env.DB.prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?')
    .bind(id, c.get('user').id).first<BudgetRow>();
}

router.get('/', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM budgets WHERE user_id = ? ORDER BY created_at DESC')
    .bind(c.get('user').id).all<BudgetRow>();
  return success(c, rows.results.map(budgetJson));
});

router.get('/overview', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM budgets WHERE user_id = ? ORDER BY created_at DESC')
    .bind(c.get('user').id).all<BudgetRow>();
  const details = [];
  for (const b of rows.results) details.push(await budgetDetail(c, b));
  return success(c, details);
});

router.get('/:id', async (c) => {
  const b = await findBudget(c, c.req.param('id'));
  if (!b) return error(c, 'Record not found', 404);
  return success(c, budgetJson(b));
});

const PERMITTED = ['budget_category_id', 'monthly_limit', 'currency_code', 'period', 'start_date', 'end_date', 'notes', 'household_id'];

router.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  if (body.monthly_limit === undefined || Number(body.monthly_limit) <= 0) {
    return error(c, 'Validation failed', 422, ['Monthly limit must be greater than 0']);
  }
  if (!['weekly', 'monthly', 'quarterly', 'yearly'].includes(body.period)) {
    return error(c, 'Validation failed', 422, ['Period is not included in the list']);
  }
  const now = nowIso();
  const id = crypto.randomUUID();
  const sets: string[] = [];
  const values: unknown[] = [id, user.id, now, now];
  for (const key of PERMITTED) {
    if (body[key] === undefined) continue;
    sets.push(`${key} = ?`);
    values.push(body[key] === null ? null : (key === 'monthly_limit' ? Number(body[key]) : body[key]));
  }
  await c.env.DB.prepare(`INSERT INTO budgets (id, user_id, created_at, updated_at, ${sets.join(', ')}) VALUES (?, ?, ?, ?, ${sets.map(() => '?').join(', ')})`)
    .bind(...values).run();
  const b = await c.env.DB.prepare('SELECT * FROM budgets WHERE id = ?').bind(id).first<BudgetRow>();
  return c.json(budgetJson(b!), 201);
});

async function updateBudget(c: BudgetCtx) {
  const b = await findBudget(c, c.req.param('id'));
  if (!b) return error(c, 'Record not found', 404);
  const body = await c.req.json().catch(() => ({}));
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const key of PERMITTED) {
    if (body[key] === undefined) continue;
    sets.push(`${key} = ?`);
    values.push(body[key] === null ? null : (key === 'monthly_limit' ? Number(body[key]) : body[key]));
  }
  if (sets.length > 0) {
    sets.push('updated_at = ?');
    values.push(nowIso());
    await c.env.DB.prepare(`UPDATE budgets SET ${sets.join(', ')} WHERE id = ?`).bind(...values, b.id).run();
  }
  const row = await findBudget(c, b.id);
  return success(c, budgetJson(row!));
}
router.put('/:id', updateBudget);
router.patch('/:id', updateBudget);

router.delete('/:id', async (c) => {
  const b = await findBudget(c, c.req.param('id'));
  if (!b) return error(c, 'Record not found', 404);
  await c.env.DB.prepare('DELETE FROM budgets WHERE id = ?').bind(b.id).run();
  return c.body(null, 204);
});

export default router;
