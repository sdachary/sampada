import { describe, expect, it } from 'vitest';
import { dividendYieldFrom, parseQuote, quoteUrl, rateSymbol } from './data';

describe('yahoo symbol/url builders', () => {
  it('builds FX and chart urls', () => {
    expect(rateSymbol('INR', 'USD')).toBe('INRUSD=X');
    expect(quoteUrl('RELIANCE.NS')).toBe('https://query1.finance.yahoo.com/v8/finance/chart/RELIANCE.NS');
  });
});

describe('parseQuote', () => {
  it('takes the last non-null close', () => {
    const quote = parseQuote({
      chart: {
        result: [
          {
            meta: { currency: 'INR', previousClose: 100, regularMarketPrice: 123 },
            indicators: { quote: [{ close: [98, null, 101, null] }] },
          },
        ],
      },
    });
    expect(quote).toEqual({ price: 101, currency: 'INR', previousClose: 100 });
  });

  it('falls back to meta.regularMarketPrice when closes are unusable', () => {
    const quote = parseQuote({
      chart: { result: [{ meta: { regularMarketPrice: 55.5 }, indicators: { quote: [{ close: [null, null] }] } }] },
    });
    expect(quote?.price).toBe(55.5);
  });

  it('returns null for error payloads and empty charts', () => {
    expect(parseQuote({ chart: { error: 'bad symbol' } })).toBeNull();
    expect(parseQuote({ chart: { result: [] } })).toBeNull();
  });
});

describe('dividendYieldFrom', () => {
  it('sums 1y dividends over the current price, 2dp', () => {
    const yld = dividendYieldFrom({
      chart: {
        result: [
          {
            meta: { regularMarketPrice: 200 },
            events: { dividends: { '1': { amount: 5 }, '2': { amount: 2.5 }, '3': { amount: 0 } } },
          },
        ],
      },
    });
    expect(yld).toBe(3.75); // 7.5 / 200 * 100
  });

  it('returns null with no dividend events or no price', () => {
    expect(dividendYieldFrom({ chart: { result: [{ meta: { regularMarketPrice: 10 } }] } })).toBeNull();
    expect(
      dividendYieldFrom({ chart: { result: [{ meta: {}, events: { dividends: { '1': { amount: 1 } } } }] } }),
    ).toBeNull();
  });
});
