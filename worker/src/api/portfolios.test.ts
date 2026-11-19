import { describe, expect, it } from 'vitest';
import { configCandidate, normalizeImportRow, optimizeAllocation, parseInvestmentCsv, toHoldingPosition, validateConfig, validateImportRow } from './portfolios';
import type { ConfigRow, InvRow } from './portfolios';

describe('optimizeAllocation', () => {
  it('falls back to one equal weight for a single asset (Rails default_allocation)', () => {
    expect(optimizeAllocation([{ symbol: 'AAA', expected_return: 0.02, volatility: 0.2 }], 0.5))
      .toEqual({ optimal_weights: [{ asset: 'AAA', weight: 1 }] });
  });

  it('weights by risk tolerance and derives return/volatility from rounded weights', () => {
    const r = optimizeAllocation([
      { symbol: 'AAA', expected_return: 0.10, volatility: 0.20 },
      { symbol: 'BBB', expected_return: 0.04, volatility: 0.10 },
    ], 0.5);
    // cost = return*(1-risk) + vol*risk => 0.15 / 0.07 => 0.6818 / 0.3182.
    expect(r.optimal_weights).toEqual([
      { asset: 'AAA', weight: 0.6818 }, { asset: 'BBB', weight: 0.3182 },
    ]);
    expect(r.volatility).toBe(0.14);
    expect(r.expected_return).toBeCloseTo(0.080908, 10);
    expect(r.sharpe_ratio).toBe(0.22);
  });
});

describe('config defaults and validation', () => {
  it('applies Rails defaults and keeps unknown keys out', () => {
    const c = configCandidate(null, { contribution: '5000', unknown: 1 });
    expect(c.contribution).toBe(5000);
    expect(c.target_mode).toBe('equal');
    expect(c.max_orders).toBe(8);
    expect(validateConfig(c)).toEqual([]);
  });

  it('rejects both-zero ratios, bad target mode and out-of-range weights in model order', () => {
    const c: ConfigRow = { ...configCandidate(null, {}), dividend_ratio: 0, growth_ratio: 0, target_mode: 'nope', max_position_weight: 2 };
    expect(validateConfig(c)).toEqual([
      'At least one of dividend_ratio or growth_ratio must be greater than zero',
      'Target mode is not included in the list',
      'Max position weight must be less than or equal to 1',
    ]);
  });
});

describe('CSV import', () => {
  it('warns in Rails order and normalizes valid rows', () => {
    const csv = 'symbol,shares,buy_price,name,investment_type,target_weight,conviction\n'
      + 'reliance,10,1200,Reliance,STOCK,0.3,true\n'
      + ',5,100\n';
    const { rows, warnings } = parseInvestmentCsv(csv);
    expect(warnings).toEqual([{
      // CSV::Row#to_h keeps every header; missing trailing cells are nil.
      row: { symbol: '', shares: '5', buy_price: '100', name: null, investment_type: null, target_weight: null, conviction: null },
      errors: ['Symbol required'],
    }]);
    expect(rows[0]).toEqual({
      symbol: 'RELIANCE', name: 'Reliance', shares: 10, buy_price: 1200,
      investment_type: 'stock', exchange: 'NSE', sector: null, currency_code: 'INR',
      current_price: null, dividend_yield: null, instrument_sub_type: null,
      rebalance_settings: { conviction: true, paused: false, targetWeight: 0.3 },
    });
    expect(validateImportRow({ symbol: 'A', shares: '-1', buy_price: '' })).toEqual([
      'Shares must be a positive number', 'Buy price required',
    ]);
  });

  it('capitalizes instrument subtype in Ruby style', () => {
    expect(normalizeImportRow({ symbol: 'a', shares: '1', buy_price: '2', instrument_sub_type: 'DIVIDEND' }).instrument_sub_type)
      .toBe('Dividend');
  });
});

describe('toHoldingPosition', () => {
  it('reads v2 knobs from rebalance_settings and prefers the stored sector', () => {
    const i = {
      symbol: 'AAA', shares: 5, buy_price: 100, current_price: 110,
      sector: 'Tech', instrument_sub_type: 'Growth',
      rebalance_settings: '{"targetWeight":0.4,"conviction":true,"mom6m":0.12}',
    } as InvRow;
    expect(toHoldingPosition(i)).toEqual({
      instrument: 'AAA', quantity: 5, avgCost: 100, ltp: 110, type: 'Growth',
      sector: 'Tech', targetWeight: 0.4, conviction: true, paused: false,
      trend: null, mom6m: 0.12,
    });
  });
});
