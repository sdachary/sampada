// Api::PortfoliosController (ScopedCrud) — index, show, create, update,
// destroy. Rails parity: portfolio_json computes total_value and allocation
// summary from the nested investments (the total_value COLUMN is shadowed by
// the model method), nested json differs from the investments controller's,
// and rebalance_config renders to_engine_config | null.

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { CURRENCY_CODES, castDecimal, error, jsonBody, notFound, nowIso, round2, success } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

type Ctx = Parameters<typeof success>[0];

type PortfolioRow = {
  id: string; name: string; goal: string | null; risk_tolerance: number | null;
  currency_code: string; target_allocation: string | null; current_allocation: string | null;
  created_at: string;
};

type InvRow = {
  id: string; symbol: string | null; name: string | null; investment_type: string | null;
  exchange: string | null; shares: number | null; buy_price: number | null;
  current_price: number | null; dividend_yield: number | null; sector: string | null;
  sector_id: string | null; currency_code: string; instrument_sub_type: string | null;
  rebalance_settings: string | null;
};

type SipRow = {
  id: string; amount: number; frequency: string; status: string | null;
  target_income: number | null; next_execution: string | null;
};

type ConfigRow = {
  contribution: number | null; dividend_ratio: number | null; growth_ratio: number | null;
  dip_threshold: number | null; dip_boost: number | null; trend_down_penalty: number | null;
  momentum_tilt: number | null; max_position_weight: number | null; max_sector_weight: number | null;
  max_add_share: number | null; fee_reserve_pct: number | null; min_order_value: number | null;
  max_orders: number | null; target_mode: string | null;
};

const n = (v: number | null | undefined): number => (v === null || v === undefined ? 0 : Number(v));
const nf = (v: number | null): number | null => (v === null ? null : Number(v));

function toEngineConfig(r: ConfigRow) {
  return {
    contribution: n(r.contribution),
    dividendRatio: n(r.dividend_ratio),
    growthRatio: n(r.growth_ratio),
    dipThreshold: n(r.dip_threshold),
    dipBoost: n(r.dip_boost),
    trendDownPenalty: n(r.trend_down_penalty),
    momentumTilt: n(r.momentum_tilt),
    maxPositionWeight: n(r.max_position_weight),
    maxSectorWeight: n(r.max_sector_weight),
    maxAddShare: n(r.max_add_share),
    feeReservePct: n(r.fee_reserve_pct),
    minOrderValue: n(r.min_order_value),
    maxOrders: r.max_orders,
    targetMode: r.target_mode,
  };
}

function parseRebalanceSettings(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// Controller-local nested investment_json (differs from the investments
// router's). shares stays a NUMBER (Rails: BigDecimal attribute serialized
// raw — string vs number divergence, SPA Number()-coerces either way).
function nestedInvestmentJson(i: InvRow) {
  const shares = n(i.shares);
  const currentPrice = n(i.current_price);
  const buyPrice = n(i.buy_price);
  const currentValue = shares * currentPrice;
  const costBasis = shares * buyPrice;
  const gainLoss = currentValue - costBasis;
  return {
    id: i.id,
    symbol: i.symbol,
    name: i.name,
    investment_type: i.investment_type,
    exchange: i.exchange,
    shares,
    buy_price: buyPrice,
    current_price: currentPrice,
    current_value: round2(currentValue),
    cost_basis: round2(costBasis),
    gain_loss: round2(gainLoss),
    gain_loss_pct: costBasis <= 0 ? 0 : round2((gainLoss / costBasis) * 100),
    dividend_yield: n(i.dividend_yield),
    // Rails groups the belongs_to :sector AR object (no sector_id column in
    // PG — latent bug); the D1 column is a plain string and the SPA reads it
    // as one (Investments.jsx badge).
    sector: i.sector,
    sector_id: i.sector_id,
    currency_code: i.currency_code,
    instrument_sub_type: i.instrument_sub_type,
    rebalance_settings: parseRebalanceSettings(i.rebalance_settings),
  };
}

async function portfolioJson(c: Ctx, p: PortfolioRow) {
  const invs = await c.env.DB.prepare(
    'SELECT * FROM investments WHERE portfolio_id = ? ORDER BY rowid',
  ).bind(p.id).all<InvRow>();
  const sips = await c.env.DB.prepare(
    'SELECT id, amount, frequency, status, target_income, next_execution FROM dividend_sips WHERE portfolio_id = ? ORDER BY rowid',
  ).bind(p.id).all<SipRow>();
  const config = await c.env.DB.prepare(
    'SELECT * FROM rebalance_configs WHERE portfolio_id = ?',
  ).bind(p.id).first<ConfigRow>();

  const totalValue = invs.results.reduce((sum, i) => sum + n(i.shares) * n(i.current_price), 0);

  // Rails allocation_summary groups by the sector association objects (latent
  // AR-object-key bug); we key by the stored sector string (SPA does
  // Object.keys(sectors)).
  const sectors: Record<string, number> = {};
  for (const i of invs.results) {
    const key = i.sector ?? '';
    sectors[key] = (sectors[key] ?? 0) + n(i.shares) * n(i.current_price);
  }

  return {
    id: p.id,
    name: p.name,
    goal: p.goal,
    risk_tolerance: nf(p.risk_tolerance),
    total_value: totalValue,
    allocation_summary: {
      sectors,
      dividend_sips: sips.results.reduce((sum, s) => sum + Number(s.amount), 0),
    },
    investments: invs.results.map(nestedInvestmentJson),
    dividend_sips: sips.results.map((ds) => ({
      id: ds.id,
      amount: Number(ds.amount),
      frequency: ds.frequency,
      status: ds.status,
      target_income: n(ds.target_income),
      next_execution: ds.next_execution,
    })),
    rebalance_config: config ? toEngineConfig(config) : null,
    created_at: p.created_at,
  };
}

// Portfolio model validations, in definition order.
function validatePortfolio(v: {
  name: string | null; risk_tolerance: number | null; goal: string | null; currency_code: string | null;
}): string[] {
  const errs: string[] = [];
  if (v.name === null || v.name.trim() === '') errs.push("Name can't be blank");
  if (v.risk_tolerance !== null) {
    if (v.risk_tolerance <= 0) errs.push('Risk tolerance must be greater than 0');
    if (v.risk_tolerance > 1) errs.push('Risk tolerance must be less than or equal to 1');
  }
  if (v.goal !== null && !['growth', 'income', 'balanced', 'conservative'].includes(v.goal)) {
    errs.push('Goal is not included in the list');
  }
  if (v.currency_code !== null && !CURRENCY_CODES.includes(v.currency_code)) {
    errs.push('Currency code is not included in the list');
  }
  return errs;
}

router.get('/', async (c) => {
  const user = c.get('user');
  const rows = await c.env.DB.prepare(
    'SELECT id, name, goal, risk_tolerance, currency_code, target_allocation, current_allocation, created_at FROM portfolios WHERE user_id = ? ORDER BY created_at DESC',
  ).bind(user.id).all<PortfolioRow>();
  const out = [];
  for (const p of rows.results) out.push(await portfolioJson(c, p));
  return c.json(out);
});

router.get('/:id', async (c) => {
  const user = c.get('user');
  const p = await c.env.DB.prepare(
    'SELECT id, name, goal, risk_tolerance, currency_code, target_allocation, current_allocation, created_at FROM portfolios WHERE id = ? AND user_id = ?',
  ).bind(c.req.param('id'), user.id).first<PortfolioRow>();
  if (!p) return notFound(c);
  return success(c, await portfolioJson(c, p));
});

async function candidateOf(c: Ctx): Promise<{ source: Record<string, unknown>; candidate: {
  name: string | null; risk_tolerance: number | null; goal: string | null; currency_code: string | null;
} }> {
  const body = await jsonBody<Record<string, unknown>>(c);
  const source = (body.portfolio as Record<string, unknown> | undefined) ?? body;
  return {
    source,
    candidate: {
      name: source.name != null ? String(source.name) : null,
      risk_tolerance: castDecimal(source.risk_tolerance),
      goal: source.goal != null ? String(source.goal) : null,
      currency_code: source.currency_code != null ? String(source.currency_code) : 'INR',
    },
  };
}

router.post('/', async (c) => {
  const user = c.get('user');
  const { source, candidate } = await candidateOf(c);
  const errs = validatePortfolio(candidate);
  if (errs.length) return error(c, 'Validation failed', 422, errs);

  const now = nowIso();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO portfolios (id, name, goal, risk_tolerance, currency_code, target_allocation,
      current_allocation, created_at, updated_at, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, candidate.name!, candidate.goal, candidate.risk_tolerance, candidate.currency_code!,
    source.target_allocation != null ? JSON.stringify(source.target_allocation) : null,
    source.current_allocation != null ? JSON.stringify(source.current_allocation) : '{}',
    now, now, user.id,
  ).run();

  const p = await c.env.DB.prepare(
    'SELECT id, name, goal, risk_tolerance, currency_code, target_allocation, current_allocation, created_at FROM portfolios WHERE id = ?',
  ).bind(id).first<PortfolioRow>();
  return c.json(await portfolioJson(c, p!), 201);
});

async function updatePortfolio(c: Ctx) {
  const user = c.get('user');
  const id = c.req.param('id');
  const p = await c.env.DB.prepare(
    'SELECT id, name, goal, risk_tolerance, currency_code, target_allocation, current_allocation, created_at FROM portfolios WHERE id = ? AND user_id = ?',
  ).bind(id, user.id).first<PortfolioRow>();
  if (!p) return notFound(c);

  const body = await jsonBody<Record<string, unknown>>(c);
  const source = (body.portfolio as Record<string, unknown> | undefined) ?? body;
  const candidate = {
    name: source.name !== undefined ? (source.name == null ? null : String(source.name)) : p.name,
    risk_tolerance: source.risk_tolerance !== undefined ? castDecimal(source.risk_tolerance) : nf(p.risk_tolerance),
    goal: source.goal !== undefined ? (source.goal == null ? null : String(source.goal)) : p.goal,
    currency_code: source.currency_code !== undefined
      ? (source.currency_code == null ? null : String(source.currency_code)) : p.currency_code,
  };
  const errs = validatePortfolio(candidate);
  if (errs.length) return error(c, 'Validation failed', 422, errs);

  const sets: string[] = [];
  const values: unknown[] = [];
  if (source.name !== undefined) { sets.push('name = ?'); values.push(candidate.name!); }
  if (source.risk_tolerance !== undefined) { sets.push('risk_tolerance = ?'); values.push(candidate.risk_tolerance); }
  if (source.goal !== undefined) { sets.push('goal = ?'); values.push(candidate.goal); }
  if (source.currency_code !== undefined) { sets.push('currency_code = ?'); values.push(candidate.currency_code!); }
  if (source.target_allocation !== undefined) {
    sets.push('target_allocation = ?');
    values.push(source.target_allocation == null ? null : JSON.stringify(source.target_allocation));
  }
  if (source.current_allocation !== undefined) {
    sets.push('current_allocation = ?');
    values.push(source.current_allocation == null ? null : JSON.stringify(source.current_allocation));
  }
  if (sets.length === 0) return success(c, await portfolioJson(c, p));

  sets.push('updated_at = ?');
  values.push(nowIso());
  await c.env.DB.prepare(`UPDATE portfolios SET ${sets.join(', ')} WHERE id = ?`).bind(...values, id).run();

  const fresh = await c.env.DB.prepare(
    'SELECT id, name, goal, risk_tolerance, currency_code, target_allocation, current_allocation, created_at FROM portfolios WHERE id = ?',
  ).bind(id).first<PortfolioRow>();
  return success(c, await portfolioJson(c, fresh!));
}

router.put('/:id', updatePortfolio);
router.patch('/:id', updatePortfolio);

router.delete('/:id', async (c) => {
  const user = c.get('user');
  const result = await c.env.DB.prepare('DELETE FROM portfolios WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).run();
  if (result.meta.changes === 0) return notFound(c);
  return c.body(null, 204);
});

export default router;
