import { describe, expect, it } from 'vitest';
import { DAILY_CRON, HALF_HOUR_CRON, jobsForCron } from './dispatch';

const utc = (h: number, m: number, day: number): Date => {
  // day: 0 Sun .. 6 Sat — pick Nov 2026 (starts on a Sunday) so date = day + 1
  return new Date(Date.UTC(2026, 10, day + 1, h, m, 0));
};

describe('jobsForCron', () => {
  it('every half hour always runs check_deletions, and only it at :30', () => {
    expect(jobsForCron(HALF_HOUR_CRON, utc(5, 30, 1))).toEqual(['check_deletions']);
  });

  it('at minute 0 runs the hourly maintenance set', () => {
    const jobs = jobsForCron(HALF_HOUR_CRON, utc(5, 0, 2));
    expect(jobs).toContain('check_deletions');
    expect(jobs).toContain('sync_cleaner');
    expect(jobs).toContain('cleanup_statement_imports');
    expect(jobs).toContain('purge_expired_sessions');
    expect(jobs).toContain('purge_dead_letters');
    expect(jobs).toContain('price_refresh');
  });

  it('does not run the hygiene purges at :30', () => {
    const jobs = jobsForCron(HALF_HOUR_CRON, utc(5, 30, 2));
    expect(jobs).not.toContain('purge_expired_sessions');
    expect(jobs).not.toContain('purge_dead_letters');
  });

  it('exchange_rate_sync fires when UTC hour % 6 == 0', () => {
    expect(jobsForCron(HALF_HOUR_CRON, utc(0, 0, 2))).toContain('exchange_rate_sync');
    expect(jobsForCron(HALF_HOUR_CRON, utc(18, 0, 2))).toContain('exchange_rate_sync');
    expect(jobsForCron(HALF_HOUR_CRON, utc(7, 0, 2))).not.toContain('exchange_rate_sync');
  });

  it('import_market_data fires 21:00 UTC Mon–Fri only', () => {
    expect(jobsForCron(HALF_HOUR_CRON, utc(21, 0, 1))).toContain('import_market_data'); // Mon
    expect(jobsForCron(HALF_HOUR_CRON, utc(21, 0, 5))).toContain('import_market_data'); // Fri
    expect(jobsForCron(HALF_HOUR_CRON, utc(21, 0, 6))).not.toContain('import_market_data'); // Sat
    expect(jobsForCron(HALF_HOUR_CRON, utc(20, 0, 1))).not.toContain('import_market_data');
  });

  it('daily cron dispatches by hour', () => {
    expect(jobsForCron(DAILY_CRON, utc(2, 0, 3))).toEqual(['security_health_check']);
    expect(jobsForCron(DAILY_CRON, utc(3, 0, 3))).toEqual(['database_backup']);
    expect(jobsForCron(DAILY_CRON, utc(4, 0, 3))).toEqual(['net_worth_snapshot']);
    expect(jobsForCron(DAILY_CRON, utc(9, 0, 3))).toEqual(['expense_reminder_check']);
    expect(jobsForCron(DAILY_CRON, utc(5, 0, 3))).toEqual([]);
  });

  it('unknown cron patterns fire nothing', () => {
    expect(jobsForCron('* * * * *', utc(3, 0, 3))).toEqual([]);
  });
});
