import { describe, expect, it } from 'vitest';
import { avalanchePlan, castDecimal, symbolFor } from './util';

describe('castDecimal', () => {
  it('maps nil/empty/garbage to null like the Rails BigDecimal cast', () => {
    expect(castDecimal(null)).toBeNull();
    expect(castDecimal('')).toBeNull();
    expect(castDecimal('abc')).toBeNull();
    expect(castDecimal('12.5')).toBe(12.5);
  });
});

describe('symbolFor', () => {
  it('uses the symbol map and falls back to the code for unknown currencies', () => {
    expect(symbolFor('INR')).toBe('₹');
    expect(symbolFor('USD')).toBe('$');
    expect(symbolFor('XYZ')).toBe('XYZ');
    expect(symbolFor(null)).toBe('₹');
  });
});

describe('avalanchePlan', () => {
  it('caps the schedule instead of looping forever on a zero-min-payment debt', () => {
    // Rails loops forever here (balance never reduced, no extra) — the port
    // must terminate at MAX_MONTHS.
    const result = avalanchePlan([{ id: 'd1', balance: 1000, interest_rate: 0.12, min_payment: 0 }]);
    expect(result.months).toBe(1200);
    expect(result.schedule).toHaveLength(1200);
  });
});
