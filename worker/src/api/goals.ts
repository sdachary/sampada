// Api::GoalsController (ScopedCrud) + Goal / GoalForecastService parity.
// Projection math mirrors GoalForecastService exactly: monthly contributions
// are added BEFORE the compounding step, yearly points are emitted every 12th
// month (plus a final point for a partial last year), and risk_comparison runs
// the same loop for all three allocation presets.

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import {
  CURRENCY_CODES, castDecimal, error, jsonBody, nowIso, num, round2, success, symbolFor,
  type AppContext,
} from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

type GoalRow = {
  id: string; name: string; target_amount: number; target_year: number;
  currency_code: string | null; monthly_sip: number | null; top_up_amount: number | null;
  top_up_frequency: string | null; allocation: string;
  equity_growth: number | null; debt_growth: number | null; gold_growth: number | null;
  created_at: string; updated_at: string; user_id: string;
};

const ALLOCATIONS = ['conservative', 'moderate', 'aggressive'] as const;
const TOP_UP_FREQUENCIES = ['none', 'monthly', 'quarterly', 'yearly'];
const PRESETS: Record<string, { equity: number; debt: number; gold: number }> = {
  conservative: { equity: 30, debt: 50, gold: 20 },
  moderate: { equity: 50, debt: 30, gold: 20 },
  aggressive: { equity: 70, debt: 20, gold: 10 },
};

/** Goal#top_up_monthly. */
function topUpMonthly(g: GoalRow): number {
  const amount = num(g.top_up_amount);
  switch (g.top_up_frequency) {
    case 'monthly': return amount;
    case 'quarterly': return amount / 3.0;
    case 'yearly': return amount / 12.0;
    default: return 0;
  }
}

/** GoalForecastService#blended_cagr. */
function blendedCagr(
  preset: { equity: number; debt: number; gold: number },
  equity: number, debt: number, gold: number,
): number {
  return (preset.equity / 100.0 * equity)
    + (preset.debt / 100.0 * debt)
    + (preset.gold / 100.0 * gold);
}

function presetOf(allocation: string) {
  return PRESETS[allocation] ?? PRESETS.moderate;
}

/** GoalForecastService#projection (goal_json consumes projection + final_corpus). */
function projectionOf(g: GoalRow, currentYear: number) {
  const monthly = num(g.monthly_sip);
  const topUp = topUpMonthly(g);
  const target = num(g.target_amount);
  const months = (g.target_year - currentYear) * 12;
  if (months <= 0) {
    return {
      projection: [{ year: currentYear, projected_corpus: 0, goal_target: target }],
      final_corpus: 0,
    };
  }

  const blended = blendedCagr(
    presetOf(g.allocation), num(g.equity_growth), num(g.debt_growth), num(g.gold_growth),
  );
  const monthlyRate = Math.pow(1 + blended / 100.0, 1.0 / 12.0) - 1.0;
  let corpus = 0;
  const points: Array<{ year: number; projected_corpus: number; goal_target: number }> = [];
  for (let m = 1; m <= months; m++) {
    corpus += monthly + topUp;
    corpus *= (1.0 + monthlyRate);
    if (m % 12 === 0) {
      const yearNum = Math.ceil(m / 12.0);
      points.push({ year: currentYear + yearNum, projected_corpus: round2(corpus), goal_target: target });
    }
  }
  const finalTargetYear = currentYear + Math.ceil(months / 12.0);
  if (points[points.length - 1]?.year !== finalTargetYear) {
    points.push({ year: finalTargetYear, projected_corpus: round2(corpus), goal_target: target });
  }
  return { projection: points, final_corpus: round2(corpus) };
}

/** GoalForecastService#risk_comparison (insertion order: conservative → aggressive). */
function riskComparisonOf(g: GoalRow, currentYear: number): Record<string, unknown> {
  const monthly = num(g.monthly_sip);
  const topUp = topUpMonthly(g);
  const months = (g.target_year - currentYear) * 12;
  const equity = num(g.equity_growth);
  const debt = num(g.debt_growth);
  const gold = num(g.gold_growth);
  const results: Record<string, unknown> = {};

  for (const name of ALLOCATIONS) {
    const preset = presetOf(name);
    const blended = blendedCagr(preset, equity, debt, gold);
    if (months <= 0) {
      results[name] = {
        points: [{ year: currentYear, projected_corpus: 0 }],
        final_corpus: 0,
        blended_cagr: round2(blended),
        equity_pct: preset.equity, debt_pct: preset.debt, gold_pct: preset.gold,
      };
      continue;
    }
    const monthlyRate = Math.pow(1 + blended / 100.0, 1.0 / 12.0) - 1.0;
    let corpus = 0;
    const points: Array<{ year: number; projected_corpus: number }> = [];
    for (let m = 1; m <= months; m++) {
      corpus += monthly + topUp;
      corpus *= (1.0 + monthlyRate);
      if (m % 12 === 0) {
        points.push({ year: currentYear + Math.ceil(m / 12.0), projected_corpus: round2(corpus) });
      }
    }
    results[name] = {
      points,
      final_corpus: round2(corpus),
      blended_cagr: round2(blended),
      equity_pct: preset.equity, debt_pct: preset.debt, gold_pct: preset.gold,
    };
  }
  return results;
}

function goalJson(g: GoalRow) {
  // Rails uses Date.current (app TZ); the worker has no TZ binding, so UTC
  // matches the rest of the data routers (reports.ts).
  const currentYear = new Date().getUTCFullYear();
  const proj = projectionOf(g, currentYear);
  return {
    id: g.id, name: g.name,
    target_amount: num(g.target_amount),
    target_year: g.target_year,
    currency_code: g.currency_code,
    currency_symbol: symbolFor(g.currency_code),
    monthly_sip: num(g.monthly_sip),
    top_up_amount: num(g.top_up_amount),
    top_up_frequency: g.top_up_frequency,
    allocation: g.allocation,
    equity_growth: num(g.equity_growth),
    debt_growth: num(g.debt_growth),
    gold_growth: num(g.gold_growth),
    years_remaining: Math.max(g.target_year - currentYear, 1),
    projection: proj.projection,
    final_corpus: proj.final_corpus,
    risk_comparison: riskComparisonOf(g, currentYear),
    created_at: g.created_at, updated_at: g.updated_at,
  };
}

type Candidate = {
  name: string | null; target_amount: number | null; target_year: number | null;
  monthly_sip: number | null; allocation: string | null;
  top_up_frequency: string | null; currency_code: string | null;
};

/** Goal model validations, in definition order. */
function validateGoal(v: Candidate): string[] {
  const errs: string[] = [];
  if (v.name === null || v.name.trim() === '') errs.push("Name can't be blank");
  if (v.target_amount === null) errs.push("Target amount can't be blank");
  else if (v.target_amount <= 0) errs.push('Target amount must be greater than 0');
  if (v.target_year === null) errs.push("Target year can't be blank");
  else {
    if (v.target_year <= 2020) errs.push('Target year must be greater than 2020');
    if (v.target_year >= 2080) errs.push('Target year must be less than 2080');
  }
  if (v.monthly_sip === null) errs.push('Monthly sip is not a number');
  else if (v.monthly_sip < 0) errs.push('Monthly sip must be greater than or equal to 0');
  if (v.allocation === null || !(ALLOCATIONS as readonly string[]).includes(v.allocation)) {
    errs.push('Allocation is not included in the list');
  }
  if (v.top_up_frequency === null || !TOP_UP_FREQUENCIES.includes(v.top_up_frequency)) {
    errs.push('Top up frequency is not included in the list');
  }
  if (v.currency_code !== null && !CURRENCY_CODES.includes(v.currency_code)) {
    errs.push('Currency code is not included in the list');
  }
  return errs;
}

function integerOf(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const x = Number(v);
  return Number.isFinite(x) ? Math.trunc(x) : null;
}

function sourceOf(body: Record<string, unknown>): Record<string, unknown> {
  return (body.goal as Record<string, unknown> | undefined) ?? body;
}

router.get('/', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC',
  ).bind(c.get('user').id).all<GoalRow>();
  return success(c, rows.results.map(goalJson));
});

router.get('/:id', async (c) => {
  const g = await c.env.DB.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), c.get('user').id).first<GoalRow>();
  if (!g) return error(c, 'Record not found', 404);
  return success(c, goalJson(g));
});

router.post('/', async (c) => {
  const user = c.get('user');
  const source = sourceOf(await jsonBody<Record<string, unknown>>(c));
  const candidate: Candidate = {
    name: source.name != null ? String(source.name) : null,
    target_amount: castDecimal(source.target_amount),
    target_year: integerOf(source.target_year),
    monthly_sip: source.monthly_sip === undefined ? 0 : castDecimal(source.monthly_sip),
    allocation: source.allocation != null ? String(source.allocation) : 'moderate',
    top_up_frequency: source.top_up_frequency != null ? String(source.top_up_frequency) : 'none',
    // allow_nil on the model, but the D1 column is NOT NULL — keep the DB default.
    currency_code: source.currency_code != null ? String(source.currency_code) : 'INR',
  };
  const errs = validateGoal(candidate);
  if (errs.length) return error(c, 'Validation failed', 422, errs);

  const now = nowIso();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO goals (id, user_id, name, target_amount, target_year, currency_code, monthly_sip,
       top_up_amount, top_up_frequency, allocation, equity_growth, debt_growth, gold_growth,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, user.id, candidate.name!, candidate.target_amount!, candidate.target_year!,
    candidate.currency_code, candidate.monthly_sip!,
    castDecimal(source.top_up_amount) ?? 0, candidate.top_up_frequency, candidate.allocation,
    castDecimal(source.equity_growth) ?? 12, castDecimal(source.debt_growth) ?? 7,
    castDecimal(source.gold_growth) ?? 8,
    now, now,
  ).run();

  const g = await c.env.DB.prepare('SELECT * FROM goals WHERE id = ?').bind(id).first<GoalRow>();
  return c.json(goalJson(g!), 201);
});

async function updateGoal(c: AppContext) {
  const user = c.get('user');
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?')
    .bind(id, user.id).first<GoalRow>();
  if (!existing) return error(c, 'Record not found', 404);

  const source = sourceOf(await jsonBody<Record<string, unknown>>(c));
  const candidate: Candidate = {
    name: source.name !== undefined ? (source.name == null ? null : String(source.name)) : existing.name,
    target_amount: source.target_amount !== undefined ? castDecimal(source.target_amount) : num(existing.target_amount),
    target_year: source.target_year !== undefined ? integerOf(source.target_year) : existing.target_year,
    monthly_sip: source.monthly_sip !== undefined ? castDecimal(source.monthly_sip) : num(existing.monthly_sip),
    allocation: source.allocation !== undefined ? (source.allocation == null ? null : String(source.allocation)) : existing.allocation,
    top_up_frequency: source.top_up_frequency !== undefined
      ? (source.top_up_frequency == null ? null : String(source.top_up_frequency)) : existing.top_up_frequency,
    currency_code: source.currency_code !== undefined
      ? (source.currency_code == null ? null : String(source.currency_code)) : existing.currency_code,
  };
  const errs = validateGoal(candidate);
  if (errs.length) return error(c, 'Validation failed', 422, errs);

  const sets: string[] = [];
  const values: unknown[] = [];
  const put = (key: string, value: unknown) => { sets.push(`${key} = ?`); values.push(value); };
  if (source.name !== undefined) put('name', candidate.name);
  if (source.target_amount !== undefined) put('target_amount', candidate.target_amount);
  if (source.target_year !== undefined) put('target_year', candidate.target_year);
  if (source.monthly_sip !== undefined) put('monthly_sip', candidate.monthly_sip);
  if (source.allocation !== undefined) put('allocation', candidate.allocation);
  if (source.top_up_frequency !== undefined) put('top_up_frequency', candidate.top_up_frequency);
  if (source.currency_code !== undefined) put('currency_code', candidate.currency_code ?? 'INR');
  if (source.top_up_amount !== undefined) put('top_up_amount', castDecimal(source.top_up_amount));
  if (source.equity_growth !== undefined) put('equity_growth', castDecimal(source.equity_growth));
  if (source.debt_growth !== undefined) put('debt_growth', castDecimal(source.debt_growth));
  if (source.gold_growth !== undefined) put('gold_growth', castDecimal(source.gold_growth));
  if (sets.length > 0) {
    sets.push('updated_at = ?');
    values.push(nowIso());
    await c.env.DB.prepare(`UPDATE goals SET ${sets.join(', ')} WHERE id = ?`).bind(...values, id).run();
  }
  const fresh = await c.env.DB.prepare('SELECT * FROM goals WHERE id = ?').bind(id).first<GoalRow>();
  return success(c, goalJson(fresh!));
}

router.put('/:id', updateGoal);
router.patch('/:id', updateGoal);

router.delete('/:id', async (c) => {
  const result = await c.env.DB.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), c.get('user').id).run();
  if (result.meta.changes === 0) return error(c, 'Record not found', 404);
  return c.body(null, 204);
});

export default router;
