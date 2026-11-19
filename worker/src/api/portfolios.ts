// Api::PortfoliosController (ScopedCrud) — index, show, create, update,
// destroy. Rails parity: portfolio_json computes total_value and allocation
// summary from the nested investments (the total_value COLUMN is shadowed by
// the model method), nested json differs from the investments controller's,
// and rebalance_config renders to_engine_config | null.

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { CURRENCY_CODES, castDecimal, error, jsonBody, notFound, nowIso, parseCsvLine, round2, success } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

type Ctx = Parameters<typeof success>[0];

type PortfolioRow = {
  id: string; name: string; goal: string | null; risk_tolerance: number | null;
  currency_code: string; target_allocation: string | null; current_allocation: string | null;
  created_at: string;
};

export type InvRow = {
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

export type ConfigRow = {
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

// ---- chunk 3: nested portfolio member routes -------------------------------
// Rails' rebalance_v2 does NOT run an engine: the SPA owns it. The endpoint
// persists config and hands back config + priced holdings.

const CONFIG_NUMERIC_KEYS = [
  'contribution', 'dividend_ratio', 'growth_ratio', 'dip_threshold', 'dip_boost',
  'trend_down_penalty', 'momentum_tilt', 'max_position_weight', 'max_sector_weight',
  'max_add_share', 'fee_reserve_pct', 'min_order_value', 'max_orders',
] as const;
const CONFIG_DEFAULTS: ConfigRow = {
  contribution: 21000, dividend_ratio: 0.6, growth_ratio: 0.4, dip_threshold: -0.10,
  dip_boost: 1.25, trend_down_penalty: 0.5, momentum_tilt: 0.25,
  max_position_weight: 0.10, max_sector_weight: 0.25, max_add_share: 0.30,
  fee_reserve_pct: 0.003, min_order_value: 500, max_orders: 8, target_mode: 'equal',
};

/** RebalanceConfig#set_defaults + params.permit (only known keys, explicit
 *  nil still overwrites — Rails assign_attributes semantics). */
export function configCandidate(base: ConfigRow | null, patch: Record<string, unknown>): ConfigRow {
  const out: ConfigRow = { ...CONFIG_DEFAULTS };
  // Existing rows do NOT re-run set_defaults (Rails: if: :new_record?), so a
  // persisted NULL stays NULL and must still fail validation.
  if (base) {
    for (const key of CONFIG_NUMERIC_KEYS) out[key] = base[key];
    out.target_mode = base.target_mode;
  }
  for (const key of CONFIG_NUMERIC_KEYS) {
    if (!(key in patch)) continue;
    const v = patch[key];
    if (key === 'max_orders') {
      const parsed = v === '' || v === null || v === undefined ? NaN : Number(v);
      out.max_orders = Number.isFinite(parsed) ? Math.trunc(parsed) : null;
    } else {
      out[key] = castDecimal(v);
    }
  }
  if ('target_mode' in patch) {
    out.target_mode = patch.target_mode == null ? null : String(patch.target_mode);
  }
  return out;
}

/** RebalanceConfig validations, in model definition order. */
export function validateConfig(v: ConfigRow): string[] {
  const errs: string[] = [];
  const gte0 = (key: keyof ConfigRow, label: string) => {
    if (v[key] === null) { errs.push(`${label} is not a number`); return; }
    if (Number(v[key]) < 0) errs.push(`${label} must be greater than or equal to 0`);
  };
  const bounded = (key: keyof ConfigRow, label: string, max?: number) => {
    if (v[key] === null) { errs.push(`${label} is not a number`); return; }
    const x = Number(v[key]);
    if (x <= 0) errs.push(`${label} must be greater than 0`);
    if (max !== undefined && x > max) errs.push(`${label} must be less than or equal to ${max}`);
  };
  gte0('contribution', 'Contribution');
  gte0('dividend_ratio', 'Dividend ratio');
  gte0('growth_ratio', 'Growth ratio');
  if (n(v.dividend_ratio) <= 0 && n(v.growth_ratio) <= 0) {
    errs.push('At least one of dividend_ratio or growth_ratio must be greater than zero');
  }
  if (v.target_mode === null || !['equal', 'current', 'invested'].includes(v.target_mode)) {
    errs.push('Target mode is not included in the list');
  }
  bounded('max_position_weight', 'Max position weight', 1);
  bounded('max_sector_weight', 'Max sector weight', 1);
  bounded('max_add_share', 'Max add share', 1);
  gte0('fee_reserve_pct', 'Fee reserve pct');
  if (v.fee_reserve_pct !== null && Number(v.fee_reserve_pct) > 0.1) errs.push('Fee reserve pct must be less than or equal to 0.1');
  gte0('min_order_value', 'Min order value');
  bounded('max_orders', 'Max orders');
  return errs;
}

async function saveConfig(c: Ctx, portfolioId: string, v: ConfigRow) {
  const existing = await c.env.DB.prepare('SELECT id FROM rebalance_configs WHERE portfolio_id = ?')
    .bind(portfolioId).first<{ id: string }>();
  const now = nowIso();
  const values = CONFIG_NUMERIC_KEYS.map((k) => v[k]);
  const cols = [...CONFIG_NUMERIC_KEYS, 'target_mode'];
  if (existing) {
    await c.env.DB.prepare(
      `UPDATE rebalance_configs SET ${cols.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE portfolio_id = ?`,
    ).bind(...values, v.target_mode, now, portfolioId).run();
  } else {
    await c.env.DB.prepare(
      `INSERT INTO rebalance_configs (id, portfolio_id, ${cols.join(', ')}, created_at, updated_at)
       VALUES (?, ?, ${cols.map(() => '?').join(', ')}, ?, ?)`,
    ).bind(crypto.randomUUID(), portfolioId, ...values, v.target_mode, now, now).run();
  }
  return c.env.DB.prepare('SELECT * FROM rebalance_configs WHERE portfolio_id = ?')
    .bind(portfolioId).first<ConfigRow>();
}

async function scopedPortfolio(c: Ctx): Promise<PortfolioRow | null> {
  return c.env.DB.prepare(
    'SELECT id, name, goal, risk_tolerance, currency_code, target_allocation, current_allocation, created_at FROM portfolios WHERE id = ? AND user_id = ?',
  ).bind(c.req.param('id'), c.get('user').id).first<PortfolioRow>();
}

/** Investment#to_holding_position — D1's plain `sector` string replaces Rails'
 *  belongs_to association; settings hold the optional v2 knobs. */
export function toHoldingPosition(i: InvRow) {
  const s = parseRebalanceSettings(i.rebalance_settings);
  return {
    instrument: i.symbol,
    quantity: n(i.shares),
    avgCost: n(i.buy_price),
    ltp: n(i.current_price),
    type: i.instrument_sub_type,
    sector: i.sector ?? (s.sector ?? null),
    targetWeight: s.targetWeight ?? null,
    conviction: s.conviction ?? false,
    paused: s.paused ?? false,
    trend: s.trend ?? null,
    mom6m: s.mom6m ?? null,
  };
}

const round4 = (x: number): number => Math.round(x * 10000) / 10000;

/** PortfolioService#optimize (v1). Rails computes expected_return from the
 *  ROUNDED weights and leaves it unrounded; keep that here. */
export function optimizeAllocation(
  assets: Array<{ symbol: string | null; expected_return: number | null; volatility: number | null }>,
  riskTolerance: number,
) {
  if (assets.length < 2) {
    const weight = round4(1 / assets.length);
    return { optimal_weights: assets.map((a) => ({ asset: a.symbol, weight })) };
  }
  const cost = (a: (typeof assets)[number]) =>
    n(a.expected_return) * (1 - riskTolerance) + n(a.volatility) * riskTolerance;
  const total = assets.reduce((sum, a) => sum + cost(a), 0);
  const optimal_weights = assets.map((a) => ({ asset: a.symbol, weight: round4(cost(a) / total) }));
  const assetOf = (asset: string | null) => assets.find((a) => a.symbol === asset)!;
  const totalWeight = optimal_weights.reduce((sum, w) => sum + w.weight, 0);
  const expected_return = optimal_weights.reduce(
    (sum, w) => sum + w.weight * n(assetOf(w.asset).expected_return), 0,
  ) / totalWeight;
  const variance = optimal_weights.reduce(
    (sum, w) => sum + (w.weight ** 2) * (n(assetOf(w.asset).volatility) ** 2), 0,
  );
  const volatility = round4(Math.sqrt(variance));
  return {
    optimal_weights,
    expected_return,
    volatility,
    sharpe_ratio: round2((expected_return - 0.05) / volatility),
  };
}

// Rails CSV.foreach(headers: true, header_converters: :symbol).
const csvHeader = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const blank = (v: unknown): boolean => v === null || v === undefined || String(v).trim() === '';
const toF = (v: unknown): number => {
  if (blank(v)) return 0;
  const x = Number(v);
  return Number.isFinite(x) ? x : 0; // Kernel#Float("garbage") would raise; to_f returns 0.
};
const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();

export type ImportRow = {
  symbol: string; name: string | null; shares: number; buy_price: number;
  investment_type: string; exchange: string; sector: string | null;
  currency_code: string; current_price: number | null; dividend_yield: number | null;
  instrument_sub_type: string | null; rebalance_settings: Record<string, unknown>;
};

export function validateImportRow(r: Record<string, string | null>): string[] {
  const errs: string[] = [];
  if (blank(r.symbol)) errs.push('Symbol required');
  if (blank(r.shares) || toF(r.shares) < 0) errs.push('Shares must be a positive number');
  if (blank(r.buy_price) || toF(r.buy_price) < 0) errs.push('Buy price required');
  return errs;
}

export function normalizeImportRow(r: Record<string, string | null>): ImportRow {
  // Rails uses `&.to_f` / `|| default`, so a PRESENT empty cell stays '' for
  // strings and casts to 0 for numbers; a MISSING cell is null. Only the v2
  // knobs use .compact, which drops null but keeps ''/false/0.
  const settings: Record<string, unknown> = {
    conviction: r.conviction === 'true',
    paused: r.paused === 'true',
  };
  if (r.target_weight != null) settings.targetWeight = toF(r.target_weight);
  if (r.trend != null) settings.trend = r.trend;
  if (r.mom6m != null) settings.mom6m = toF(r.mom6m);
  return {
    symbol: r.symbol == null ? '' : r.symbol.toUpperCase(),
    name: r.name ?? null,
    shares: toF(r.shares),
    buy_price: toF(r.buy_price),
    investment_type: r.investment_type == null ? 'stock' : r.investment_type.toLowerCase(),
    exchange: r.exchange == null ? 'NSE' : r.exchange.toUpperCase(),
    sector: r.sector ?? null,
    currency_code: r.currency_code ?? 'INR',
    current_price: r.current_price == null ? null : toF(r.current_price),
    dividend_yield: r.dividend_yield == null ? null : toF(r.dividend_yield),
    instrument_sub_type: r.instrument_sub_type == null ? null : capitalize(r.instrument_sub_type),
    rebalance_settings: settings,
  };
}

export function parseInvestmentCsv(csvText: string): {
  rows: ImportRow[]; warnings: Array<{ row: Record<string, string | null>; errors: string[] }>;
} {
  const lines = csvText.split(/\r?\n/);
  const headers = (parseCsvLine(lines[0] ?? '')).map(csvHeader);
  const rows: ImportRow[] = [];
  const warnings: Array<{ row: Record<string, string | null>; errors: string[] }> = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '') continue;
    const cells = parseCsvLine(lines[i]);
    const raw: Record<string, string | null> = {};
    // CSV::Row#to_h pads missing trailing fields with nil.
    headers.forEach((h, idx) => { raw[h] = cells[idx] ?? null; });
    const errs = validateImportRow(raw);
    if (errs.length) { warnings.push({ row: raw, errors: errs }); continue; }
    rows.push(normalizeImportRow(raw));
  }
  return { rows, warnings };
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

// POST /:id/rebalance — v1 Markowitz-ish service; seeded with each stock/ETF's
// dividend yield / fixed volatility (Rails Investment#expected_return/#volatility).
router.post('/:id/rebalance', async (c) => {
  const p = await scopedPortfolio(c);
  if (!p) return notFound(c);
  const invs = await c.env.DB.prepare(
    "SELECT symbol, shares, buy_price, current_price, dividend_yield, investment_type, instrument_sub_type, rebalance_settings, sector FROM investments WHERE portfolio_id = ? ORDER BY rowid",
  ).bind(p.id).all<InvRow>();
  const stocks = invs.results.filter((i) => ['stock', 'etf'].includes(i.investment_type ?? ''));
  if (stocks.length === 0) return success(c, { message: 'No stock or ETF investments to rebalance' });
  return success(c, optimizeAllocation(
    stocks.map((i) => ({
      symbol: i.symbol,
      // Rails: (dividend_yield || 0)/100, then `|| 0.10` in the controller —
      // 0.0 is falsy in Ruby, so a zero yield falls back to 10%.
      expected_return: (n(i.dividend_yield) / 100) || 0.10,
      volatility: 0.20,
    })),
    p.risk_tolerance || 0.5, // Ruby: 0 is falsy too.
  ));
});

// POST /:id/rebalance_v2 — Rails persists config then returns config +
// holdings for the SPA's own engine (its `engine_config` contribution override
// is computed and thrown away — deliberate bug parity).
router.post('/:id/rebalance_v2', async (c) => {
  const p = await scopedPortfolio(c);
  if (!p) return notFound(c);
  const body = await jsonBody<Record<string, unknown>>(c);
  const patch = body.rebalance_config;
  const row = await c.env.DB.prepare('SELECT * FROM rebalance_configs WHERE portfolio_id = ?')
    .bind(p.id).first<ConfigRow>();
  let config = row ?? configCandidate(null, {});
  if (patch && typeof patch === 'object' && !Array.isArray(patch)) {
    config = configCandidate(row, patch as Record<string, unknown>);
    const errs = validateConfig(config);
    if (errs.length) return error(c, 'Validation failed', 422, errs);
    config = (await saveConfig(c, p.id, config))!;
  }

  const invs = await c.env.DB.prepare(
    'SELECT * FROM investments WHERE portfolio_id = ? AND current_price IS NOT NULL AND current_price != 0 AND shares IS NOT NULL AND shares != 0 ORDER BY rowid',
  ).bind(p.id).all<InvRow>();
  if (invs.results.length === 0) {
    return success(c, { rows: [], summary: {}, warnings: ['No priced holdings found'] });
  }
  return success(c, { config: toEngineConfig(config), holdings: invs.results.map(toHoldingPosition), warnings: [] });
});

router.get('/:id/rebalance_config', async (c) => {
  const p = await scopedPortfolio(c);
  if (!p) return notFound(c);
  const row = await c.env.DB.prepare('SELECT * FROM rebalance_configs WHERE portfolio_id = ?')
    .bind(p.id).first<ConfigRow>();
  return success(c, toEngineConfig(row ?? configCandidate(null, {})));
});

router.put('/:id/rebalance_config', async (c) => {
  const p = await scopedPortfolio(c);
  if (!p) return notFound(c);
  const body = await jsonBody<Record<string, unknown>>(c);
  const patch = body.rebalance_config;
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return error(c, 'param is missing or the value is empty: rebalance_config', 400);
  }
  const row = await c.env.DB.prepare('SELECT * FROM rebalance_configs WHERE portfolio_id = ?')
    .bind(p.id).first<ConfigRow>();
  const candidate = configCandidate(row, patch as Record<string, unknown>);
  const errs = validateConfig(candidate);
  if (errs.length) return error(c, 'Validation failed', 422, errs);
  return success(c, toEngineConfig((await saveConfig(c, p.id, candidate))!));
});

// POST /:id/import_investments — multipart `file` (the SPA reads the CSV into
// a File); `preview=true` parses only. Rails renders errors at 422 by default.
router.post('/:id/import_investments', async (c) => {
  const p = await scopedPortfolio(c);
  if (!p) return notFound(c);
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return error(c, 'No file provided', 422);
  const { rows, warnings } = parseInvestmentCsv(await file.text());
  if (c.req.query('preview') === 'true') return success(c, { preview: rows, warnings });

  for (const row of rows) {
    const sector = row.sector
      ? await c.env.DB.prepare('SELECT id FROM sectors WHERE name = ?').bind(row.sector).first<{ id: string }>()
      : null;
    const now = nowIso();
    // Rails also normalizes current_price_as_of; D1's investments table has no
    // such column, so the timestamp is dropped here.
    await c.env.DB.prepare(
      `INSERT INTO investments (id, portfolio_id, symbol, name, shares, buy_price, current_price,
        dividend_yield, investment_type, exchange, sector, sector_id, currency_code,
        instrument_sub_type, rebalance_settings, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(), p.id, row.symbol, row.name, row.shares, row.buy_price,
      row.current_price, row.dividend_yield, row.investment_type, row.exchange,
      row.sector, sector?.id ?? null, row.currency_code, row.instrument_sub_type,
      JSON.stringify(row.rebalance_settings), now, now,
    ).run();
  }
  return success(c, { created: rows.length, errors: warnings });
});

router.delete('/:id', async (c) => {
  const user = c.get('user');
  const result = await c.env.DB.prepare('DELETE FROM portfolios WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).run();
  if (result.meta.changes === 0) return notFound(c);
  return c.body(null, 204);
});

export default router;
