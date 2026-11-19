// Shared helpers for the /api/v1 data routers (chunks 1–3).

import type { Context } from 'hono';
import type { AppEnv, Bindings } from '../index';
import { convertAmount } from '../jobs/data';

export type AppContext = Context<AppEnv>;

/** `render_success` — Rails merges an optional message into the data hash;
 *  arrays render raw (no message). */
export function success(c: AppContext, data: unknown, message?: string) {
  const body = message && data && typeof data === 'object' && !Array.isArray(data)
    ? { ...(data as Record<string, unknown>), message }
    : data;
  return c.json(body);
}

/** `render_error` — always carries success:false + message (+ optional errors). */
export function error(
  c: AppContext,
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 422 | 501,
  errors?: string[] | Record<string, unknown>,
) {
  return c.json({ success: false, message, ...(errors ? { errors } : {}) }, status);
}

/** RecordNotFound via rescue_from — Rails renders the model's message; SPA
 *  only reads `.error || .message`, so 'Record not found' suffices. */
export function notFound(c: AppContext) {
  return error(c, 'Record not found', 404);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** D1 stores NUMERIC as REAL; SQLite SUM over zero rows returns NULL. */
export function num(v: unknown): number {
  return typeof v === 'number' ? v : Number(v ?? 0);
}

export function boolFlag(v: unknown): boolean {
  return v === 1 || v === true;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** CSV.parse cell semantics shared by transactions/bulk_create and the
 *  portfolio import: comma-separated, double-quoted cells ("" escape,
 *  embedded commas). Unquoted whitespace is kept; multi-line cells are not
 *  supported by either importer. */
export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cell += '"'; i += 2; continue; }
        quoted = false; i++; continue;
      }
      cell += ch; i++; continue;
    }
    if (ch === '"') { quoted = true; i++; continue; }
    if (ch === ',') { cells.push(cell); cell = ''; i++; continue; }
    cell += ch; i++;
  }
  cells.push(cell);
  return cells;
}

/** Currency.symbol_for — unknown/absent codes fall back to the code/₹. */
const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£',
  JPY: '¥', CNY: '¥', AUD: 'A$', CAD: 'C$',
  CHF: 'Fr', SGD: 'S$', HKD: 'HK$', KRW: '₩',
  SEK: 'kr', NOK: 'kr', DKK: 'kr', NZD: 'NZ$',
  MXN: 'MX$', BRL: 'R$', ZAR: 'R', TRY: '₺',
  RUB: '₽', PLN: 'zł', THB: '฿', IDR: 'Rp',
  MYR: 'RM', PHP: '₱', CZK: 'Kč', ILS: '₪',
  AED: 'د.إ', SAR: '﷼', NGN: '₦', KES: 'KSh',
};

export function symbolFor(code: string | null | undefined): string {
  if (!code) return '₹';
  return CURRENCY_SYMBOLS[code] ?? code;
}

/** Currency::CURRENCY_SYMBOLS.keys — the Transaction inclusion list. */
export const CURRENCY_CODES = Object.keys(CURRENCY_SYMBOLS);

/** FeatureFlags::FEATURES — per-user flags persist in the settings table. */
export const FEATURE_FLAGS = ['pdf_import', 'recurring_detection', 'passkeys'] as const;

/** FeatureFlags.enabled? — default on unless a settings row says 'off'. */
export async function featureFlagEnabled(
  c: AppContext,
  key: string,
  userId: string,
): Promise<boolean> {
  const row = await c.env.DB.prepare('SELECT value FROM settings WHERE user_id = ? AND key = ?')
    .bind(userId, `${key}_enabled`)
    .first<{ value: string | null }>();
  return row?.value !== 'off';
}

/** Rails ActiveRecord BigDecimal cast: nil/''/garbage → nil. */
export function castDecimal(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Settings find_or_initialize_by + update! (value stored as text). */
export async function setSetting(c: AppContext, userId: string, key: string, value: string): Promise<void> {
  const now = nowIso();
  const existing = await c.env.DB.prepare('SELECT id FROM settings WHERE user_id = ? AND key = ?')
    .bind(userId, key)
    .first<{ id: string }>();
  if (existing) {
    await c.env.DB.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE id = ?')
      .bind(value, now, existing.id)
      .run();
  } else {
    await c.env.DB.prepare('INSERT INTO settings (id, key, value, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), key, value, userId, now, now)
      .run();
  }
}

export function getSetting(c: AppContext, userId: string, key: string): Promise<string | null> {
  return c.env.DB.prepare('SELECT value FROM settings WHERE user_id = ? AND key = ?')
    .bind(userId, key).first<{ value: string | null }>().then((r) => (r ? r.value : null));
}

export function deleteSetting(c: AppContext, userId: string, key: string): Promise<void> {
  return c.env.DB.prepare('DELETE FROM settings WHERE user_id = ? AND key = ?')
    .bind(userId, key).run().then(() => undefined);
}

/** notifications.metadata is a JSON column in Rails; D1 stores TEXT. */
export function parseMetadata(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** JSON params body, tolerating malformed/absent bodies. */
export async function jsonBody<T extends Record<string, unknown>>(c: AppContext): Promise<T> {
  return c.req.json<T>().catch(() => ({}) as T);
}

/** Boolean coercion matching Rails' ActiveModel::Type::Boolean#cast for the
 *  wire formats the SPA sends: true/false, "true"/"false", 1/0, "1"/"0". */
export function castBoolean(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') return ['true', '1', 't', 'yes'].includes(v.toLowerCase());
  return false;
}

// ---- date math (Rails Date#advance semantics; UTC, like jobs/comms.ts) ----

function isoOf(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Rails Date#next_month: Jan 31 + 1mo = Feb 28, not Mar 2. */
export function addMonthsClamped(iso: string, months: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return isoOf(ny, nm + 1, Math.min(d, lastDay));
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Date#strftime('%b') over UTC — Rails formatted today/month dates in the
 *  app timezone; dates live in the DB as plain ISO day strings. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthLabel(date: Date): string {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

// ---- debt payoff (DebtPayoffService#avalanche_plan) ----

export type PayoffDebt = { id: string; balance: number; interest_rate: number; min_payment: number };

export type PayoffOptions = {
  extra_payment?: number;
  lump_sum_amount?: number;
  annual_extra?: number;
  custom_extra_payments?: Record<number, number>;
  strategy?: 'avalanche' | 'snowball';
};

/** DebtPayoffService#calculate_plan. avalanche = highest-interest-first,
 *  snowball = smallest-balance-first (Rails sort_by). Mirrors the Ruby loop
 *  exactly, including its `payment` accumulation quirk (extra only carries
 *  while the top-of-stack debt is the first positive one). */
export function avalanchePlan(
  debts: PayoffDebt[],
  opts: PayoffOptions = {},
): { months: number; total_interest: number; schedule: Array<Record<string, number>> } {
  const ordered = debts.map((d) => ({ ...d })).sort(
    opts.strategy === 'snowball' ? (a, b) => a.balance - b.balance : (a, b) => b.interest_rate - a.interest_rate,
  );
  const extra = opts.extra_payment ?? 0;
  const lumpSum = opts.lump_sum_amount ?? 0;
  const annualExtra = opts.annual_extra ?? 0;
  const custom = opts.custom_extra_payments ?? {};
  let months = 0;
  let totalInterest = 0;
  const schedule: Array<Record<string, number>> = [];
  // ponytail: 1200-month cap — Rails loops forever (schedule grows unbounded)
  // when a debt has 0 min_payment and no extra; real plans end in < 100y.
  const MAX_MONTHS = 1200;
  while (ordered.some((d) => d.balance > 0) && months < MAX_MONTHS) {
    months += 1;
    let payment = extra;
    let monthInterest = 0;
    let monthPrincipal = 0;
    ordered.forEach((debt, index) => {
      if (debt.balance <= 0) return;
      const interest = debt.balance * (debt.interest_rate / 100 / 12);
      debt.balance += interest;
      totalInterest += interest;
      monthInterest += interest;
      const monthlyMin = Math.min(debt.min_payment, debt.balance);
      debt.balance -= monthlyMin;
      monthPrincipal += monthlyMin;
      if (index === ordered.findIndex((d) => d.balance > 0)) payment += monthlyMin;
    });

    let extraAmount = payment;
    if (months === 1) extraAmount += lumpSum;
    if (months % 12 === 0) extraAmount += annualExtra;
    if (custom[months]) extraAmount += custom[months];

    const priorityDebt = ordered.find((d) => d.balance > 0);
    if (priorityDebt && extraAmount > 0) {
      const amount = Math.min(extraAmount, priorityDebt.balance);
      priorityDebt.balance -= amount;
      monthPrincipal += amount;
    }

    schedule.push({
      month: months,
      payment: round2(monthPrincipal + monthInterest),
      interest: round2(monthInterest),
      principal: round2(monthPrincipal),
      balance: round2(ordered.reduce((s, d) => s + d.balance, 0)),
    });
  }
  return { months, total_interest: round2(totalInterest), schedule };
}

// ---- net worth snapshots (NetWorthSnapshot.current / .create_snapshot) ----

export type SnapshotRow = {
  id: string; snapshot_date: string; total_assets: number | null; total_liabilities: number | null;
  net_worth: number | null; breakdown: string | null; created_at: string; currency_code: string | null;
};

/** Rails returns a loaded snapshot or nil when the table is empty; the JSON
 *  serializer then emits nulls. Return null to match (never auto-create). */
export async function currentSnapshot(env: Bindings, userId: string): Promise<SnapshotRow | null> {
  return env.DB.prepare(
    'SELECT id, snapshot_date, total_assets, total_liabilities, net_worth, breakdown, created_at, currency_code FROM net_worth_snapshots WHERE user_id = ? ORDER BY snapshot_date DESC LIMIT 1',
  )
    .bind(userId)
    .first<SnapshotRow>();
}

/** NetWorthSnapshot.create_snapshot — used only where Rails called it inline
 *  (journey#show auto-creates the first snapshot). Values round to 4dp like
 *  the nightly job; breakdown keeps the same keys Rails wrote. */
export async function createSnapshot(env: Bindings, userId: string, baseCurrency: string): Promise<SnapshotRow | null> {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const existing = await env.DB.prepare(
    'SELECT id FROM net_worth_snapshots WHERE user_id = ? AND snapshot_date = ?',
  ).bind(userId, today).first<{ id: string }>();
  if (existing) return currentSnapshot(env, userId);

  const debts = await env.DB.prepare(
    "SELECT amount, paid_amount, currency_code FROM debts WHERE user_id = ? AND status = 'active'",
  ).bind(userId).all<{ amount: number; paid_amount: number; currency_code: string }>();
  let totalLiabilities = 0;
  for (const d of debts.results) {
    const remaining = Number(d.amount) - Number(d.paid_amount);
    totalLiabilities += await convertAmount(env, remaining, d.currency_code, baseCurrency);
  }

  const portfolios = await env.DB.prepare(
    'SELECT id, currency_code FROM portfolios WHERE user_id = ?',
  ).bind(userId).all<{ id: string; currency_code: string }>();
  let totalAssets = 0;
  const breakdown: Array<{ portfolio_id: string; value: number; currency: string }> = [];
  for (const p of portfolios.results) {
    const holdings = await env.DB.prepare(
      'SELECT shares, current_price FROM investments WHERE portfolio_id = ?',
    ).bind(p.id).all<{ shares: number | null; current_price: number | null }>();
    const value = holdings.results.reduce(
      (sum, h) => sum + (Number(h.shares) || 0) * (Number(h.current_price) || 0), 0);
    totalAssets += await convertAmount(env, value, p.currency_code, baseCurrency);
    breakdown.push({ portfolio_id: p.id, value, currency: p.currency_code });
  }

  const round4 = (n: number): number => Math.round(n * 10000) / 10000;
  await env.DB.prepare(
    `INSERT INTO net_worth_snapshots (id, user_id, snapshot_date, currency_code, total_assets, total_liabilities, net_worth, breakdown, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(), userId, today, baseCurrency,
      round4(totalAssets), round4(totalLiabilities), round4(totalAssets - totalLiabilities),
      JSON.stringify({ debts: totalLiabilities, portfolios: breakdown, base_currency: baseCurrency }),
      now, now,
    )
    .run();
  return currentSnapshot(env, userId);
}

