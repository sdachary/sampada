// Rebalance v2 Engine Tests — ports reference/rebalanceEngine.test.mjs
// Run: node --test test/rebalance.test.ts (or via npm test)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rebalanceV1, rebalanceV2, DEFAULT_CONFIG } from '../src/lib/rebalance/index';
import { SEED } from './seed';

const GOLDEN_V1 = { cost: 20099.58, left: 900.42, orders: 16 };
const GOLDEN_V2 = {
  buys: { APOLLOTYRE: 5, BIRET: 6, EMBASSY: 5, HINDZINC: 7, IDEA: 199, ITC: 5, ONGC: 17, POWERGRID: 14 },
  cost: 20936.57, left: 63.43, div: 12562.2, gro: 8374.8,
};

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
const buys = (res: { rows: any[] }) => Object.fromEntries(
  res.rows.filter((r) => r.suggestedQty > 0).map((r) => [r.instrument, r.suggestedQty])
);

test('golden: v1 reproduces the original spec on the seed portfolio', () => {
  const r = rebalanceV1(SEED);
  assert.equal(r.summary.totalActualCost, GOLDEN_V1.cost);
  assert.equal(r.summary.leftoverCash, GOLDEN_V1.left);
  assert.equal(r.summary.orders, GOLDEN_V1.orders);
});

test('golden: v2 on the seed portfolio', () => {
  const r = rebalanceV2(SEED);
  assert.deepEqual(buys(r), GOLDEN_V2.buys);
  assert.equal(r.summary.totalActualCost, GOLDEN_V2.cost);
  assert.equal(r.summary.leftoverCash, GOLDEN_V2.left);
  assert.equal(r.summary.dividendPool, GOLDEN_V2.div);
  assert.equal(r.summary.growthPool, GOLDEN_V2.gro);
});

test('v2 never adds to positions at or above the position cap, and never exceeds the order limit', () => {
  const r = rebalanceV2(SEED);
  const hfcl = r.rows.find((x) => x.instrument === 'HFCL');
  assert.equal(hfcl.suggestedQty, 0);
  assert.ok(r.summary.orders <= DEFAULT_CONFIG.maxOrders);
});

test('invariants hold on random portfolios', () => {
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  for (let t = 0; t < 300; t++) {
    const n = 3 + Math.floor(rnd() * 20);
    const h = Array.from({ length: n }, (_, i) => {
      const ltp = 10 + rnd() * 3000;
      return {
        instrument: 'S' + i,
        quantity: Math.floor(rnd() * 100),
        avgCost: ltp * (0.5 + rnd()),
        ltp,
        type: rnd() < 0.3 ? 'Dividend' : 'Growth',
        paused: rnd() < 0.1,
      };
    });
    const C = Math.floor(rnd() * 60000);
    const r = rebalanceV2(h, { contribution: C });
    assert.ok(r.summary.totalActualCost <= C + 1e-6, 'cost within contribution');
    assert.ok(r.summary.leftoverCash >= -1e-6, 'leftover not negative');
    assert.ok(r.summary.orders <= DEFAULT_CONFIG.maxOrders);
    for (const x of r.rows) {
      assert.ok(Number.isInteger(x.suggestedQty) && x.suggestedQty >= 0);
      if (x.paused) assert.equal(x.suggestedQty, 0);
      assert.ok(Number.isFinite(x.actualCost));
    }
  }
});

test('zero contribution buys nothing; tiny contribution does not break', () => {
  assert.equal(rebalanceV2(SEED, { contribution: 0 }).summary.orders, 0);
  const t = rebalanceV2(SEED, { contribution: 300 });
  assert.ok(t.summary.totalActualCost <= 300);
});

test('missing sleeve moves its pool to the other sleeve and warns', () => {
  const onlyGrowth = SEED.filter((h) => h.type === 'Growth');
  const r = rebalanceV2(onlyGrowth);
  assert.ok(r.warnings.some((w) => w.includes('Dividend')));
  assert.ok(r.summary.totalActualCost > 15000);
});

test('instruments without a valid price are excluded, not crashed on', () => {
  const r = rebalanceV2([...SEED, { instrument: 'BAD', quantity: 5, avgCost: 10, ltp: 0, type: 'Growth' }]);
  const bad = r.rows.find((x) => x.instrument === 'BAD');
  assert.equal(bad.suggestedQty, 0);
  assert.ok(r.warnings.length > 0);
});

test('output is deterministic', () => {
  assert.deepEqual(rebalanceV2(SEED), rebalanceV2(SEED));
});

test('conviction flag enables the dip boost; trend down without conviction does not', () => {
  const base = rebalanceV2(SEED);
  const flagged = rebalanceV2(SEED.map((h) => (h.instrument === 'ITC' ? { ...h, conviction: true } : h)));
  const itcA = base.rows.find((x) => x.instrument === 'ITC').totalAllocation;
  const itcB = flagged.rows.find((x) => x.instrument === 'ITC').totalAllocation;
  assert.ok(itcB >= itcA);
  assert.ok(flagged.rows.find((x) => x.instrument === 'ITC').reasons.includes('Dip boost'));
});

test('sector cap blocks buys that would breach it', () => {
  const tagged = SEED.map((h) => ({
    ...h,
    sector: ['ONGC', 'IOC', 'COALINDIA'].includes(h.instrument) ? 'Energy' : h.sector,
  }));
  const r = rebalanceV2(tagged, { maxSectorWeight: 0.15 });
  const energyAfter = sum(
    r.rows
      .filter((x) => ['ONGC', 'IOC', 'COALINDIA'].includes(x.instrument))
      .map((x) => x.value + x.actualCost)
  );
  const before = sum(
    r.rows
      .filter((x) => ['ONGC', 'IOC', 'COALINDIA'].includes(x.instrument))
      .map((x) => x.value)
  );
  const Vafter = r.summary.portfolioBefore + r.summary.contribution;
  if (before / Vafter >= 0.15) assert.equal(energyAfter, before);
  else assert.ok(energyAfter / Vafter <= 0.15 + 1e-6);
});