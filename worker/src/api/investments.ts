// Api::InvestmentsController — index/create/update/destroy (NO show route).
// Controller-local investment_json (differs from portfolios' nested json).

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { CURRENCY_CODES, error, jsonBody, notFound, nowIso, round2, success, symbolFor } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

type Ctx = Parameters<typeof success>[0];

type InvestmentRow = {
  id: string; portfolio_id: string; symbol: string | null; name: string | null;
  investment_type: string | null; exchange: string | null; shares: number | null;
  buy_price: number | null; current_price: number | null; dividend_yield: number | null;
  sector: string | null; currency_code: string; instrument_sub_type: string | null;
  rebalance_settings: string | null; created_at: string; updated_at: string;
};

function investmentJson(i: InvestmentRow) {
  const shares = Number(i.shares ?? 0);
  const buyPrice = Number(i.buy_price ?? 0);
  const currentPrice = Number(i.current_price ?? 0);
  const currentValue = shares * currentPrice;
  const costBasis = shares * buyPrice;
  const gainLoss = currentValue - costBasis;
  const gainLossPct = costBasis > 0 ? Math.round((gainLoss / costBasis) * 10000) / 100 : 0;
  const cc = i.currency_code || 'INR';
  return {
    id: i.id, portfolio_id: i.portfolio_id, symbol: i.symbol, name: i.name,
    shares, buy_price: buyPrice, current_price: currentPrice, current_value: currentValue,
    gain_loss: gainLoss, gain_loss_pct: gainLossPct,
    dividend_yield: i.dividend_yield === null ? null : Number(i.dividend_yield),
    sector: i.sector, investment_type: i.investment_type,
    currency_code: cc, currency_symbol: symbolFor(cc), exchange: i.exchange,
  };
}

router.get('/', async (c) => {
  const user = c.get('user');
  const rows = await c.env.DB.prepare(
    `SELECT i.* FROM investments i JOIN portfolios p ON p.id = i.portfolio_id
     WHERE p.user_id = ? ORDER BY i.created_at DESC`,
  ).bind(user.id).all<InvestmentRow>();
  return success(c, rows.results.map(investmentJson));
});

router.post('/', async (c) => {
  const user = c.get('user');
  const body = await jsonBody<Record<string, unknown>>(c);
  const source = (body.investment as Record<string, unknown> | undefined) ?? body;

  const portfolioId = source.portfolio_id ? String(source.portfolio_id) : null;
  if (!portfolioId) return error(c, 'Portfolio is required', 422);

  const portfolio = await c.env.DB.prepare('SELECT id FROM portfolios WHERE id = ? AND user_id = ?')
    .bind(portfolioId, user.id).first<{ id: string }>();
  if (!portfolio) return error(c, 'Record not found', 404);

  const investmentType = source.investment_type ? String(source.investment_type) : null;
  const exchange = source.exchange ? String(source.exchange) : null;
  const instrumentSubType = source.instrument_sub_type ? String(source.instrument_sub_type) : 'Growth';
  const errs: string[] = [];
  if (investmentType && !['stock', 'etf', 'mutual_fund', 'bond', 'other'].includes(investmentType)) {
    errs.push('Investment type is not included in the list');
  }
  if (exchange && !['NSE', 'BSE', 'NYSE', 'NASDAQ', 'LSE', 'TSE', 'FRA', 'ASX', 'HKEX', 'TSX', 'OTHER'].includes(exchange)) {
    errs.push('Exchange is not included in the list');
  }
  if (instrumentSubType && !['Dividend Growth'].includes(instrumentSubType)) {
    errs.push('Instrument sub type is not included in the list');
  }
  if (!source.currency_code || !CURRENCY_CODES.includes(String(source.currency_code))) {
    errs.push('Currency code is not included in the list');
  }
  if (errs.length) return error(c, 'Validation failed', 422, errs);

  const now = nowIso();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO investments (id, portfolio_id, symbol, name, investment_type, exchange, shares, buy_price, current_price, dividend_yield, sector, currency_code, instrument_sub_type, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, portfolioId,
    source.symbol ? String(source.symbol) : null, source.name ? String(source.name) : null,
    investmentType, exchange,
    source.shares === null || source.shares === undefined ? null : Number(source.shares),
    source.buy_price === null || source.buy_price === undefined ? null : Number(source.buy_price),
    source.current_price === null || source.current_price === undefined ? null : Number(source.current_price),
    source.dividend_yield === null || source.dividend_yield === undefined ? null : Number(source.dividend_yield),
    source.sector ? String(source.sector) : null,
    source.currency_code ? String(source.currency_code) : 'INR',
    instrumentSubType,
    now, now,
  ).run();

  const i = await c.env.DB.prepare('SELECT * FROM investments WHERE id = ?').bind(id).first<InvestmentRow>();
  return c.json(investmentJson(i!), 201);
});

router.put('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const i = await c.env.DB.prepare(
    `SELECT i.* FROM investments i JOIN portfolios p ON p.id = i.portfolio_id WHERE i.id = ? AND p.user_id = ?`,
  ).bind(id, user.id).first<InvestmentRow>();
  if (!i) return notFound(c);

  const body = await jsonBody<Record<string, unknown>>(c);
  const source = (body.investment as Record<string, unknown> | undefined) ?? body;
  const has = (k: string) => source[k] !== undefined;

  const candidate = {
    symbol: has('symbol') ? (source.symbol ? String(source.symbol) : null) : i.symbol,
    name: has('name') ? (source.name ? String(source.name) : null) : i.name,
    shares: has('shares') ? (source.shares === null || source.shares === undefined ? null : Number(source.shares)) : i.shares,
    buy_price: has('buy_price') ? (source.buy_price === null || source.buy_price === undefined ? null : Number(source.buy_price)) : i.buy_price,
    current_price: has('current_price') ? (source.current_price === null || source.current_price === undefined ? null : Number(source.current_price)) : i.current_price,
    dividend_yield: has('dividend_yield') ? (source.dividend_yield === null || source.dividend_yield === undefined ? null : Number(source.dividend_yield)) : i.dividend_yield,
    sector: has('sector') ? (source.sector ? String(source.sector) : null) : i.sector,
    investment_type: has('investment_type') ? (source.investment_type ? String(source.investment_type) : null) : i.investment_type,
    exchange: has('exchange') ? (source.exchange ? String(source.exchange) : null) : i.exchange,
    currency_code: has('currency_code') ? (source.currency_code ? String(source.currency_code) : 'INR') : (i.currency_code || 'INR'),
    instrument_sub_type: has('instrument_sub_type') ? (source.instrument_sub_type ? String(source.instrument_sub_type) : null) : i.instrument_sub_type,
  };

  const errs: string[] = [];
  if (candidate.investment_type && !['stock', 'etf', 'mutual_fund', 'bond', 'other'].includes(candidate.investment_type)) {
    errs.push('Investment type is not included in the list');
  }
  if (candidate.exchange && !['NSE', 'BSE', 'NYSE', 'NASDAQ', 'LSE', 'TSE', 'FRA', 'ASX', 'HKEX', 'TSX', 'OTHER'].includes(candidate.exchange)) {
    errs.push('Exchange is not included in the list');
  }
  if (candidate.instrument_sub_type && !['Dividend Growth'].includes(candidate.instrument_sub_type)) {
    errs.push('Instrument sub type is not included in the list');
  }
  if (errs.length) return error(c, 'Validation failed', 422, errs);

  const sets: string[] = [];
  const values: unknown[] = [];
  if (has('symbol')) { sets.push('symbol = ?'); values.push(candidate.symbol); }
  if (has('name')) { sets.push('name = ?'); values.push(candidate.name); }
  if (has('shares')) { sets.push('shares = ?'); values.push(candidate.shares); }
  if (has('buy_price')) { sets.push('buy_price = ?'); values.push(candidate.buy_price); }
  if (has('current_price')) { sets.push('current_price = ?'); values.push(candidate.current_price); }
  if (has('dividend_yield')) { sets.push('dividend_yield = ?'); values.push(candidate.dividend_yield); }
  if (has('sector')) { sets.push('sector = ?'); values.push(candidate.sector); }
  if (has('investment_type')) { sets.push('investment_type = ?'); values.push(candidate.investment_type); }
  if (has('exchange')) { sets.push('exchange = ?'); values.push(candidate.exchange); }
  if (has('currency_code')) { sets.push('currency_code = ?'); values.push(candidate.currency_code); }
  if (has('instrument_sub_type')) { sets.push('instrument_sub_type = ?'); values.push(candidate.instrument_sub_type); }
  if (sets.length > 0) {
    sets.push('updated_at = ?');
    values.push(nowIso());
    await c.env.DB.prepare(`UPDATE investments SET ${sets.join(', ')} WHERE id = ?`).bind(...values, id).run();
  }

  const fresh = await c.env.DB.prepare('SELECT * FROM investments WHERE id = ?').bind(id).first<InvestmentRow>();
  return success(c, investmentJson(fresh!));
});

router.delete('/:id', async (c) => {
  const user = c.get('user');
  const result = await c.env.DB.prepare(
    'DELETE FROM investments WHERE id = ? AND portfolio_id IN (SELECT id FROM portfolios WHERE user_id = ?)',
  ).bind(c.req.param('id'), user.id).run();
  if (result.meta.changes === 0) return error(c, 'Record not found', 404);
  return success(c, {}, 'Investment deleted');
});

export default router;
