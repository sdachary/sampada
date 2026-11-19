import { describe, expect, it } from 'vitest';
import {
  DEAD_LETTER_PURGE_SQL,
  DEAD_LETTER_RETENTION_DAYS,
  SESSION_PURGE_SQL,
  deadLetterCutoff,
} from './maintenance';

describe('retention hygiene sweeps', () => {
  it('purges sessions that expired or were revoked', () => {
    expect(SESSION_PURGE_SQL).toContain('expires_at < ?');
    expect(SESSION_PURGE_SQL).toContain('revoked_at IS NOT NULL');
    expect(SESSION_PURGE_SQL).toContain('OR');
  });

  it('dead-letter purge only touches processed rows that exhausted retries with an error', () => {
    expect(DEAD_LETTER_PURGE_SQL).toContain('processed_at < ?');
    expect(DEAD_LETTER_PURGE_SQL).toContain('attempts >= max_attempts');
    expect(DEAD_LETTER_PURGE_SQL).toContain('last_error IS NOT NULL');
    // the retention doc named a `dead_at` column that the live schema has never had
    expect(DEAD_LETTER_PURGE_SQL).not.toContain('dead_at');
  });

  it('dead-letter cutoff is 14 days before now', () => {
    expect(DEAD_LETTER_RETENTION_DAYS).toBe(14);
    expect(deadLetterCutoff(new Date('2026-11-19T00:00:00.000Z'))).toBe('2026-11-05T00:00:00.000Z');
  });
});
