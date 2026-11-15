import { describe, expect, it } from 'vitest';
import { prunePlan } from './backup';

const DAY = 24 * 3600 * 1000;
const NOW = new Date('2026-11-15T03:00:00Z');
// small numbers instead of GB: same policy, readable arithmetic
const OPTS = { retentionDays: 30, totalBudgetBytes: 10 * 1024 };

function obj(daysAgo: number, size = 1024): { key: string; uploaded: Date; size: number } {
  return {
    key: `backups/sampada_backup_${String(daysAgo).padStart(2, '0')}.json`,
    uploaded: new Date(NOW.getTime() - daysAgo * DAY),
    size,
  };
}

describe('prunePlan (R2 free-tier budget policy)', () => {
  it('keeps everything inside retention and budget', () => {
    expect(prunePlan([obj(1), obj(2)], 1024, NOW, OPTS)).toEqual([]);
  });

  it('drops past the retention window, keeps the exact 30-day boundary', () => {
    expect(prunePlan([obj(1), obj(30), obj(31)], 1024, NOW, OPTS)).toEqual([obj(31).key]);
  });

  it('drops oldest-first until kept + incoming fits the budget', () => {
    // kept 3 KiB + incoming 9 KiB = 12 > 10 → drop day-3 → 11 → drop day-2 → 10
    expect(prunePlan([obj(3), obj(2), obj(1)], 9 * 1024, NOW, OPTS)).toEqual([obj(3).key, obj(2).key]);
  });

  it('drops everything when only the incoming dump can fit', () => {
    expect(prunePlan([obj(1), obj(2)], 12 * 1024, NOW, OPTS)).toEqual([obj(2).key, obj(1).key]);
  });

  it('handles an empty bucket', () => {
    expect(prunePlan([], 1024, NOW, OPTS)).toEqual([]);
  });
});
