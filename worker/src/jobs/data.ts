// Data jobs: exchange-rate sync + market-data refresh, ported from
// ExchangeRateSyncJob / ImportMarketDataJob and the Yahoo adapter. Pure Yahoo
// parsing lives in exported functions so it is testable without D1.

import type { Bindings } from '../index';

const YAHOO_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart';

export type Quote = {
  price: number;
  currency: string | null;
  previousClose: number | null;
};

export function rateSymbol(from: string, to: string): string {
  return `${from}${to}=X`;
}

export function quoteUrl(symbol: string): string {
  return `${YAHOO_CHART}/${encodeURIComponent(symbol)}`;
}

export function dividendUrl(symbol: string): string {
  return `${quoteUrl(symbol)}?range=1y&interval=1mo`;
}

/** Last non-null close of the chart series, falling back to
 *  meta.regularMarketPrice — mirrors the adapter's price pick. */
export function parseQuote(json: unknown): Quote | null {
  const result = (json as { chart?: { result?: Array<Record<string, unknown>> } })?.chart?.result?.[0];
  if (!result) return null;
  const meta = (result.meta ?? {}) as { regularMarketPrice?: number; currency?: string; previousClose?: number };
  const closes = ((result.indicators as { quote?: Array<{ close?: Array<number | null> }> })?.quote?.[0]?.close ?? []) as Array<number | null>;
  let price: number | null = null;
  for (let i = closes.length - 1; i >= 0; i--) {
    if (typeof closes[i] === 'number') {
      price = closes[i];
      break;
    }
  }
  if (price === null && typeof meta.regularMarketPrice === 'number') price = meta.regularMarketPrice;
  if (price === null) return null;
  return {
    price,
    currency: typeof meta.currency === 'string' ? meta.currency : null,
    previousClose: typeof meta.previousClose === 'number' ? meta.previousClose : null,
  };
}

/** Trailing-12-month dividend yield (%) from a chart payload's
 *  events.dividends; null when the symbol paid nothing or the price is unusable. */
export function dividendYieldFrom(json: unknown): number | null {
  const result = (json as { chart?: { result?: Array<Record<string, unknown>> } })?.chart?.result?.[0];
  const events = (result?.events as { dividends?: Record<string, { amount?: number }> } | undefined)?.dividends;
  const price = Number((result?.meta as { regularMarketPrice?: number } | undefined)?.regularMarketPrice) || 0;
  if (!events || !(price > 0)) return null;
  const annual = Object.values(events).reduce((sum, d) => sum + (Number(d?.amount) || 0), 0);
  return Math.round((annual / price) * 100 * 100) / 100;
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchQuote(symbol: string): Promise<Quote | null> {
  const json = await fetchJson(quoteUrl(symbol));
  return json ? parseQuote(json) : null;
}

/** Stored rate for a pair, newest fetch first; null when never synced. */
export async function lookupRate(env: Bindings, from: string, to: string): Promise<number | null> {
  if (from === to) return 1;
  const row = await env.DB.prepare(
    'SELECT rate FROM exchange_rates WHERE from_currency = ? AND to_currency = ? ORDER BY fetched_at DESC LIMIT 1',
  )
    .bind(from, to)
    .first<{ rate: number }>();
  return row ? Number(row.rate) : null;
}

/** Rails ExchangeRateService#convert + the callers' `|| raw` fallback. */
export async function convertAmount(env: Bindings, amount: number, from: string, to: string): Promise<number> {
  if (from === to) return amount;
  const rate = await lookupRate(env, from, to);
  return rate === null ? amount : amount * rate;
}

const BASE_CURRENCY = 'USD';

/** ExchangeRateService.sync_all: every active currency → USD, upserted on the
 *  (from_currency, to_currency) unique index. */
export async function exchangeRateSync(env: Bindings, now: Date = new Date()): Promise<void> {
  const currencies = await env.DB.prepare('SELECT code FROM currencies WHERE active = 1').all<{ code: string }>();
  const nowIso = now.toISOString();
  for (const { code } of currencies.results) {
    if (code === BASE_CURRENCY) continue;
    const quote = await fetchQuote(rateSymbol(code, BASE_CURRENCY));
    if (!quote || !(quote.price > 0)) continue;
    await env.DB.prepare(
      `INSERT INTO exchange_rates (id, from_currency, to_currency, rate, source, fetched_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'yahoo_finance', ?, ?, ?)
       ON CONFLICT (from_currency, to_currency) DO UPDATE SET
         rate = excluded.rate, source = excluded.source,
         fetched_at = excluded.fetched_at, updated_at = excluded.updated_at`,
    )
      .bind(crypto.randomUUID(), code, BASE_CURRENCY, quote.price, nowIso, nowIso, nowIso)
      .run();
  }
}

/** ImportMarketDataJob: refresh every investment that has a symbol — price,
 *  currency and trailing-1y dividend yield. Subrequest cost is 2 per
 *  investment (quote + dividends); ponytail: free plan allows 50 per
 *  invocation, fine at household scale — chunk by updated_at if portfolios grow. */
export async function importMarketData(env: Bindings, now: Date = new Date()): Promise<void> {
  const investments = await env.DB.prepare(
    "SELECT id, symbol, currency_code FROM investments WHERE symbol IS NOT NULL AND symbol != ''",
  ).all<{ id: string; symbol: string; currency_code: string }>();
  const nowIso = now.toISOString();
  for (const inv of investments.results) {
    const quote = await fetchQuote(inv.symbol);
    if (!quote) continue;
    const yld = dividendYieldFrom(await fetchJson(dividendUrl(inv.symbol)));
    await env.DB.prepare(
      `UPDATE investments SET current_price = ?, currency_code = ?, dividend_yield = COALESCE(?, dividend_yield), updated_at = ? WHERE id = ?`,
    )
      .bind(quote.price, quote.currency ?? inv.currency_code, yld, nowIso, inv.id)
      .run();
  }
}

/** Rails PriceRefreshJob cached per-portfolio quotes in Redis (dropped with
 *  Redis). The worker instead keeps DB prices fresh hourly; portfolio reads
 *  compute values live from current_price (frontend change%, TODO(A5)). */
export async function priceRefresh(env: Bindings, now: Date = new Date()): Promise<void> {
  await importMarketData(env, now);
}
