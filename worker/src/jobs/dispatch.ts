// Job dispatch: 9 Rails Sidekiq cron schedules consolidated into 2 wrangler
// cron triggers (free plan caps cron triggers per worker). The pure function
// jobsForCron maps (cron pattern, now) -> job names so gating is unit-tested
// without D1. Rails hours were treated as UTC; config.time_zone was not set.

import type { Bindings } from '../index';
import { exchangeRateSync, importMarketData, priceRefresh } from './data';
import { securityHealthCheck, databaseBackup } from './backup';
import { expenseReminderCheck } from './comms';
import {
  checkDeletions,
  cleanupStatementImports,
  netWorthSnapshot,
  purgeDeadLetters,
  purgeExpiredSessions,
  syncCleaner,
} from './maintenance';

export type JobName =
  | 'check_deletions'
  | 'sync_cleaner'
  | 'cleanup_statement_imports'
  | 'purge_expired_sessions'
  | 'purge_dead_letters'
  | 'price_refresh'
  | 'exchange_rate_sync'
  | 'import_market_data'
  | 'security_health_check'
  | 'database_backup'
  | 'net_worth_snapshot'
  | 'expense_reminder_check';

export const HALF_HOUR_CRON = '*/30 * * * *';
export const DAILY_CRON = '0 2,3,4,9 * * *';

/**
 * Which jobs fire for a given cron event at `now` (UTC).
 * - every 30 min: check_deletions (was the Sidekiq cron with a 30-minute interval)
 * - at minute 0 of every hour: sync_cleaner, cleanup_statement_imports
 *   (Rails ran cleanup at :45 — moved to :00), purge_expired_sessions,
 *   purge_dead_letters, price_refresh;
 *   exchange_rate_sync when hour % 6 == 0;
 *   import_market_data at 21:00 UTC Mon–Fri (after market close).
 * - 02/03/04/09 UTC daily: security_health_check, database_backup,
 *   net_worth_snapshot, expense_reminder_check.
 */
export function jobsForCron(cron: string, now: Date): JobName[] {
  const minute = now.getUTCMinutes();
  const hour = now.getUTCHours();
  const day = now.getUTCDay(); // 0 Sun .. 6 Sat

  if (cron === HALF_HOUR_CRON) {
    const jobs: JobName[] = ['check_deletions'];
    if (minute === 0) {
      jobs.push('sync_cleaner', 'cleanup_statement_imports', 'purge_expired_sessions', 'purge_dead_letters', 'price_refresh');
      if (hour % 6 === 0) jobs.push('exchange_rate_sync');
      if (hour === 21 && day >= 1 && day <= 5) jobs.push('import_market_data');
    }
    return jobs;
  }

  if (cron === DAILY_CRON) {
    const byHour: Partial<Record<number, JobName>> = {
      2: 'security_health_check',
      3: 'database_backup',
      4: 'net_worth_snapshot',
      9: 'expense_reminder_check',
    };
    const job = byHour[hour];
    return job ? [job] : [];
  }

  return [];
}

export type JobHandler = (env: Bindings, now: Date) => Promise<void>;

/** Real bodies live in ./data, ./maintenance, ./backup and ./comms. */
export const HANDLERS: Record<JobName, JobHandler> = {
  check_deletions: checkDeletions,
  sync_cleaner: syncCleaner,
  cleanup_statement_imports: cleanupStatementImports,
  purge_expired_sessions: purgeExpiredSessions,
  purge_dead_letters: purgeDeadLetters,
  price_refresh: priceRefresh,
  exchange_rate_sync: exchangeRateSync,
  import_market_data: importMarketData,
  net_worth_snapshot: netWorthSnapshot,
  security_health_check: securityHealthCheck,
  database_backup: databaseBackup,
  expense_reminder_check: expenseReminderCheck,
};

/** Run one job, never throwing: cron handlers must not take down the sweep. */
export async function runJob(name: JobName, env: Bindings, now = new Date()): Promise<'ok' | 'error'> {
  const t0 = Date.now();
  try {
    await HANDLERS[name](env, now);
    console.log(JSON.stringify({ job: name, status: 'ok', ms: Date.now() - t0 }));
    return 'ok';
  } catch (error) {
    console.error(JSON.stringify({ job: name, status: 'error', error: String(error), ms: Date.now() - t0 }));
    return 'error';
  }
}

/** scheduled() entry point: dispatch every job this cron event is due for. */
export async function handleScheduled(cron: string, env: Bindings): Promise<string[]> {
  const jobs = jobsForCron(cron, new Date());
  for (const job of jobs) await runJob(job, env);
  return jobs;
}
