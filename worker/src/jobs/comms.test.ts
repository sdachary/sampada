import { describe, expect, it } from 'vitest';
import { erasurePlan } from './comms';

const NOW = '2026-11-19T00:00:00.000Z';
const plan = erasurePlan('u1', 'r1', NOW);
const sqls = plan.map((step) => step.sql);

describe('DPDP erasure plan', () => {
  it('hard-deletes user-keyed data, credentials and sessions', () => {
    for (const table of [
      'transactions',
      'portfolios',
      'debts',
      'goals',
      'trips',
      'net_worth_snapshots',
      'sessions',
      'webauthn_credentials',
      'api_credentials',
    ]) {
      expect(sqls).toContain(`DELETE FROM ${table} WHERE user_id = ?`);
    }
  });

  it('keeps the anonymized tombstone and the legal-hold records', () => {
    expect(sqls.some((sql) => sql.startsWith('DELETE FROM users '))).toBe(false);
    for (const table of ['deletion_requests', 'consent_records', 'grievances']) {
      expect(sqls.some((sql) => sql.startsWith(`DELETE FROM ${table} `))).toBe(false);
    }
    expect(sqls.some((sql) => sql.startsWith("UPDATE users SET email = 'deleted-' || id"))).toBe(true);
  });

  it('deletes FK children before their parents', () => {
    const at = (prefix: string): number => sqls.findIndex((sql) => sql.startsWith(prefix));
    expect(at('DELETE FROM messages ')).toBeLessThan(at('DELETE FROM conversations WHERE user_id'));
    expect(at('DELETE FROM investments ')).toBeLessThan(at('DELETE FROM portfolios WHERE user_id'));
    expect(at('DELETE FROM dividend_sips ')).toBeLessThan(at('DELETE FROM portfolios WHERE user_id'));
    expect(at('DELETE FROM debt_payoff_debts ')).toBeLessThan(at('DELETE FROM debts WHERE user_id'));
    expect(at('DELETE FROM debt_payoff_debts ')).toBeLessThan(at('DELETE FROM debt_payoffs WHERE user_id'));
    expect(at('DELETE FROM trip_expenses ')).toBeLessThan(at('DELETE FROM trip_members '));
    expect(at('DELETE FROM trip_settlements ')).toBeLessThan(at('DELETE FROM trip_members '));
    expect(at('DELETE FROM transactions WHERE user_id')).toBeLessThan(
      at('DELETE FROM recurring_expenses WHERE user_id'),
    );
  });

  it('reaches trip_settlements through trips (it has no user_id column)', () => {
    expect(sqls.filter((sql) => sql.startsWith('DELETE FROM trip_settlements '))).toEqual([
      'DELETE FROM trip_settlements WHERE trip_id IN (SELECT id FROM trips WHERE user_id = ?)',
    ]);
  });

  it('binds ids instead of inlining them, and finalizes the request last', () => {
    for (const step of plan) {
      expect(step.sql).not.toContain("'u1'");
    }
    for (const step of plan.filter((s) => s.sql.startsWith('DELETE'))) {
      expect(step.binds.every((bind) => bind === 'u1')).toBe(true);
    }
    expect(plan[plan.length - 1].binds).toEqual([NOW, NOW, 'r1']);
  });
});
