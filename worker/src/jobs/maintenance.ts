// Maintenance jobs: sync cleaner, statement-import cleanup, DPDP deletion
// scheduling and nightly net-worth snapshots. Ported from the matching
// Sidekiq jobs; per-user failures are logged and never take down the sweep.

import type { Bindings } from '../index';
import { convertAmount, exchangeRateSync } from './data';
import { enqueue } from './queue';

const DAY_MS = 24 * 60 * 60 * 1000;

/** SyncCleanerJob: any exchange rate older than 24h → sync inline (Rails
 *  queued ExchangeRateSyncJob; the sweep drains, so a direct call is the same
 *  effect without a queue hop). */
export async function syncCleaner(env: Bindings, now: Date = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - DAY_MS).toISOString();
  const stale = await env.DB.prepare('SELECT COUNT(*) AS n FROM exchange_rates WHERE fetched_at < ?')
    .bind(cutoff)
    .first<{ n: number }>();
  if ((stale?.n ?? 0) > 0) {
    await exchangeRateSync(env, now);
  }
}

/** CleanupStatementImportsJob: drop done/failed imports older than 24h — a
 *  statement is a transient copy of the user's data, not the data itself.
 *  ponytail: no file purge here; uploaded PDFs are parsed client-side and
 *  never stored (active_storage does not exist in the worker). */
export async function cleanupStatementImports(env: Bindings, now: Date = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - DAY_MS).toISOString();
  await env.DB.prepare("DELETE FROM statement_imports WHERE status IN ('done','failed') AND updated_at < ?")
    .bind(cutoff)
    .run();
}

/** Session rows are read-filtered for expiry, never deleted, so hashed tokens
 *  accumulate. Sweep expired + revoked rows hourly (retention gap 2). */
export const SESSION_PURGE_SQL = 'DELETE FROM sessions WHERE expires_at < ? OR revoked_at IS NOT NULL';

export async function purgeExpiredSessions(env: Bindings, now: Date = new Date()): Promise<void> {
  await env.DB.prepare(SESSION_PURGE_SQL).bind(now.toISOString()).run();
}

export const DEAD_LETTER_RETENTION_DAYS = 14;

/** Cutoff for the dead-letter sweep, in ISO-8601 (D1 stores ISO text). */
export function deadLetterCutoff(now: Date): string {
  return new Date(now.getTime() - DEAD_LETTER_RETENTION_DAYS * DAY_MS).toISOString();
}

/** Dead-lettered queue rows keep their payload + last_error forever otherwise.
 *  Purge only rows that exhausted retries AND carry an error older than 14
 *  days — successful rows (last_error IS NULL) are left alone. The retention
 *  doc's `dead_at` column never existed in the live schema (gap 3). */
export const DEAD_LETTER_PURGE_SQL =
  'DELETE FROM job_queue WHERE processed_at < ? AND attempts >= max_attempts AND last_error IS NOT NULL';

export async function purgeDeadLetters(env: Bindings, now: Date = new Date()): Promise<void> {
  await env.DB.prepare(DEAD_LETTER_PURGE_SQL).bind(deadLetterCutoff(now)).run();
}

/** CheckDeletionsJob: pending deletion requests whose cancel window has ended
 *  (scheduled_for <= now) get a process_deletion queue job. DPDP semantics:
 *  the 48h cancel window is enforced by scheduled_for; the processor (chunk 4)
 *  is idempotent — it acts only while status is still 'pending'. */
export async function checkDeletions(env: Bindings, now: Date = new Date()): Promise<void> {
  const due = await env.DB.prepare("SELECT id FROM deletion_requests WHERE status = 'pending' AND scheduled_for <= ?")
    .bind(now.toISOString())
    .all<{ id: string }>();
  for (const request of due.results) {
    await enqueue(env, 'process_deletion', { request_id: request.id });
  }
}

/** NetWorthSnapshotJob + NetWorthSnapshot.create_snapshot: one snapshot per
 *  active user per day; existing same-day snapshots are skipped. */
export async function netWorthSnapshot(env: Bindings, now: Date = new Date()): Promise<void> {
  const today = now.toISOString().slice(0, 10);
  const users = await env.DB.prepare('SELECT id, currency FROM users WHERE deleted_at IS NULL').all<{
    id: string;
    currency: string | null;
  }>();
  for (const user of users.results) {
    try {
      await snapshotUser(env, user.id, user.currency || 'INR', today, now);
    } catch (error) {
      console.error(JSON.stringify({ job: 'net_worth_snapshot', user: user.id, error: String(error) }));
    }
  }
}

async function snapshotUser(env: Bindings, userId: string, currency: string, today: string, now: Date): Promise<void> {
  const existing = await env.DB.prepare('SELECT id FROM net_worth_snapshots WHERE user_id = ? AND snapshot_date = ?')
    .bind(userId, today)
    .first<{ id: string }>();
  if (existing) return;

  const debts = await env.DB.prepare(
    "SELECT amount, paid_amount, currency_code FROM debts WHERE user_id = ? AND status = 'active'",
  )
    .bind(userId)
    .all<{ amount: number; paid_amount: number; currency_code: string }>();
  let totalLiabilities = 0;
  for (const debt of debts.results) {
    const remaining = Number(debt.amount) - Number(debt.paid_amount);
    totalLiabilities += await convertAmount(env, remaining, debt.currency_code, currency);
  }

  const portfolios = await env.DB.prepare('SELECT id, currency_code FROM portfolios WHERE user_id = ?')
    .bind(userId)
    .all<{ id: string; currency_code: string }>();
  let totalAssets = 0;
  const breakdown: Array<{ portfolio_id: string; value: number; currency: string }> = [];
  for (const portfolio of portfolios.results) {
    const holdings = await env.DB.prepare('SELECT shares, current_price FROM investments WHERE portfolio_id = ?')
      .bind(portfolio.id)
      .all<{ shares: number; current_price: number }>();
    const value = holdings.results.reduce((sum, h) => sum + (Number(h.shares) || 0) * (Number(h.current_price) || 0), 0);
    totalAssets += await convertAmount(env, value, portfolio.currency_code, currency);
    breakdown.push({ portfolio_id: portfolio.id, value, currency: portfolio.currency_code });
  }

  const round4 = (n: number): number => Math.round(n * 10000) / 10000;
  const nowIso = now.toISOString();
  await env.DB.prepare(
    `INSERT INTO net_worth_snapshots (id, user_id, snapshot_date, currency_code, total_assets, total_liabilities, net_worth, breakdown, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      userId,
      today,
      currency,
      round4(totalAssets),
      round4(totalLiabilities),
      round4(totalAssets - totalLiabilities),
      JSON.stringify({ portfolios: breakdown, debt_count: debts.results.length }),
      nowIso,
      nowIso,
    )
    .run();
}
