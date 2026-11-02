// Rebalance v2 Engine — pure TypeScript port of reference/rebalanceEngine.mjs
// Deterministic, no I/O, no UI imports. Matches golden numbers exactly.

import {
  HoldingPosition,
  RebalanceConfig,
  RebalanceRow,
  RebalanceResult,
  DEFAULT_CONFIG,
  ConcentrationStats,
  SleeveMix,
} from './types';

const EPS = 1e-9;

const sum = (arr: number[]): number => arr.reduce((s, x) => s + x, 0);

const r2 = (x: number): number => Math.round((x + Number.EPSILON) * 100) / 100;

const clip = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

function validate(cfg: RebalanceConfig): void {
  if (!(cfg.contribution >= 0)) throw new Error('contribution must be >= 0');
  if (!(cfg.dividendRatio >= 0 && cfg.growthRatio >= 0 && cfg.dividendRatio + cfg.growthRatio > 0)) {
    throw new Error('dividendRatio and growthRatio must be >= 0 and not both zero');
  }
  if (!(cfg.maxPositionWeight > 0 && cfg.maxPositionWeight <= 1)) {
    throw new Error('maxPositionWeight must be in (0,1]');
  }
}

function prep(h: HoldingPosition): RebalanceRow {
  const qty = Math.max(0, Math.floor(Number(h.quantity) || 0));
  const avgCost = Number(h.avgCost) || 0;
  const ltp = Number(h.ltp) || 0;

  return {
    ...h,
    instrument: String(h.instrument),
    type: h.type === 'Dividend' ? 'Dividend' : 'Growth',
    qty,
    avgCost,
    ltp,
    sector: h.sector ?? null,
    conviction: !!h.conviction,
    paused: !!h.paused,
    trend: h.trend ?? null,
    mom6m: Number.isFinite(h.mom6m ?? NaN) ? (h.mom6m ?? null) : null,
    targetWeight: Number.isFinite(h.targetWeight ?? NaN) && (h.targetWeight ?? 0) > 0 ? (h.targetWeight ?? null) : null,
    value: qty * ltp,
    perf: avgCost > 0 && ltp > 0 ? (ltp - avgCost) / avgCost : 0,
    reasons: [],
    alloc: 0,
    buyQty: 0,
    w: 1,
    gap: 0,
    head: 0,
    target: 0,
    performancePct: 0,
    weightBefore: 0,
    weightAfter: 0,
    dividendAllocation: 0,
    growthAllocation: 0,
    totalAllocation: 0,
    suggestedQty: 0,
    actualCost: 0,
    action: 'HOLD',
  };
}

function sleeveWeights(rows: RebalanceRow[], cfg: RebalanceConfig): void {
  const baseOf = (r: RebalanceRow): number =>
    r.targetWeight ?? (cfg.targetMode === 'current' ? r.value : cfg.targetMode === 'invested' ? r.qty * r.avgCost : 1);

  const pos = rows.map(baseOf).filter((b) => b > 0);
  const fallback = pos.length ? sum(pos) / pos.length : 1;

  const moms = rows.filter((r) => r.mom6m !== null).map((r) => r.mom6m!);
  let mean = 0;
  let sd = 0;
  if (moms.length >= 3) {
    mean = sum(moms) / moms.length;
    sd = Math.sqrt(sum(moms.map((m) => (m - mean) ** 2)) / moms.length);
  }

  for (const r of rows) {
    if (r.paused) {
      r.w = 0;
      r.reasons.push('Paused by you: no buy');
      continue;
    }
    let m = baseOf(r) > 0 ? baseOf(r) : fallback;
    if (sd > 0 && r.mom6m !== null) {
      m *= 1 + cfg.momentumTilt * clip((r.mom6m! - mean) / sd, -1.5, 1.5);
    }
    if (r.trend === 'down' && !r.conviction) {
      m *= cfg.trendDownPenalty;
      r.reasons.push('Trend down: lower target weight');
    } else if (r.perf < cfg.dipThreshold) {
      if (r.conviction || r.trend === 'up') {
        m *= cfg.dipBoost;
        r.reasons.push('Dip boost');
      } else {
        r.reasons.push('Down more than the dip threshold: no boost (mark it as conviction to average down)');
      }
    }
    r.w = m;
  }
}

function waterFill(items: RebalanceRow[], pool: number): number {
  const room = (r: RebalanceRow) => Math.max(0, r.head - r.alloc);
  const want = items.map((r) => Math.min(Math.max(0, r.gap - r.alloc), room(r)));
  const W = sum(want);
  let used = 0;

  if (W >= pool && W > 0) {
    items.forEach((r, i) => {
      const a = (want[i] * pool) / W;
      r.alloc += a;
      used += a;
    });
    return used;
  }

  items.forEach((r, i) => {
    r.alloc += want[i];
    used += want[i];
  });

  let surplus = pool - used;
  for (let it = 0; it < 25 && surplus > 0.005; it++) {
    const open = items.filter((r) => room(r) > EPS);
    if (!open.length) break;
    const ws = sum(open.map((r) => r.w));
    if (ws <= EPS) break;
    let spent = 0;
    for (const r of open) {
      const a = Math.min(room(r), (surplus * r.w) / ws);
      r.alloc += a;
      spent += a;
    }
    surplus -= spent;
    used += spent;
    if (spent <= EPS) break;
  }
  return used;
}

function allocate(
  sleeves: { Dividend: RebalanceRow[]; Growth: RebalanceRow[] },
  pools: { Dividend: number; Growth: number },
  Vafter: number,
  cfg: RebalanceConfig,
  allowed: Set<string>
): number {
  const all = [...sleeves.Dividend, ...sleeves.Growth];
  all.forEach((r) => { r.alloc = 0; });
  let carry = 0;

  for (const s of ['Dividend', 'Growth'] as const) {
    const S = sleeves[s];
    const pool = pools[s];
    if (!S.length) {
      carry += pool;
      continue;
    }
    const wsum = sum(S.map((r) => r.w)) || 1;
    const addCap = Math.max(cfg.maxAddShare, 1 / S.length) * pool;
    const Safter = sum(S.map((r) => r.value)) + pool;
    for (const r of S) {
      r.target = (r.w / wsum) * Safter;
      r.gap = Math.max(0, r.target - r.value);
      r.head = Math.min(Math.max(0, cfg.maxPositionWeight * Vafter - r.value), addCap);
    }
    const ok = S.filter((r) => allowed.has(r.instrument));
    carry += ok.length ? pool - waterFill(ok, pool) : pool;
  }

  if (carry > 0.5) {
    const ok = all.filter((r) => allowed.has(r.instrument));
    if (ok.length) waterFill(ok, carry);
  }
  return carry;
}

function weightsStats(items: RebalanceRow[], total: number): ConcentrationStats {
  const w = items.map((x) => (total > 0 ? x / total : 0)).sort((a, b) => b - a);
  return {
    top1: w[0] ?? 0,
    top5: sum(w.slice(0, 5)),
    hhi: sum(w.map((x) => x * x)),
  };
}

function drift(rows: RebalanceRow[], valueOf: (r: RebalanceRow) => number): number {
  let d = 0;
  let V = 0;
  for (const s of ['Dividend', 'Growth'] as const) {
    const S = rows.filter((r) => r.type === s && r.ltp > 0);
    const wsum = sum(S.map((r) => r.w)) || 1;
    const tot = sum(S.map(valueOf));
    V += tot;
    d += sum(S.map((r) => Math.abs(valueOf(r) - (r.w / wsum) * tot)));
  }
  return V > 0 ? d / 2 / V : 0;
}

function sleeveMix(sleeves: { Dividend: RebalanceRow[]; Growth: RebalanceRow[] }, valueOf: (r: RebalanceRow) => number): SleeveMix {
  const d = sum(sleeves.Dividend.map(valueOf));
  const g = sum(sleeves.Growth.map(valueOf));
  const t = d + g || 1;
  return { Dividend: d / t, Growth: g / t };
}

export function rebalanceV2(holdings: HoldingPosition[], userCfg: Partial<RebalanceConfig> = {}): RebalanceResult {
  const cfg: RebalanceConfig = { ...DEFAULT_CONFIG, ...userCfg };
  validate(cfg);

  const rows = holdings.map(prep);
  const warnings: string[] = [];
  const priced = rows.filter((r) => r.ltp > 0);

  rows.filter((r) => !(r.ltp > 0)).forEach((r) => r.reasons.push('No valid price: excluded'));
  if (rows.some((r) => !(r.ltp > 0))) {
    warnings.push('Some instruments have no valid price and were excluded.');
  }

  const V = sum(priced.map((r) => r.value));
  const C = cfg.contribution;
  const spendable = C * (1 - cfg.feeReservePct);
  const Vafter = V + C;
  const dShare = cfg.dividendRatio / (cfg.dividendRatio + cfg.growthRatio);
  const pools = {
    Dividend: spendable * dShare,
    Growth: spendable * (1 - dShare),
  };

  const sleeves = {
    Dividend: priced.filter((r) => r.type === 'Dividend'),
    Growth: priced.filter((r) => r.type === 'Growth'),
  };

  if (!sleeves.Dividend.length && pools.Dividend > 0) {
    warnings.push('No priced Dividend stocks: that pool was moved to Growth.');
  }
  if (!sleeves.Growth.length && pools.Growth > 0) {
    warnings.push('No priced Growth stocks: that pool was moved to Dividend.');
  }

  sleeves.Dividend.length && sleeveWeights(sleeves.Dividend, cfg);
  sleeves.Growth.length && sleeveWeights(sleeves.Growth, cfg);

  const driftBefore = drift(priced, (r) => r.value);

  // 1) fractional allocation over all stocks, 2) keep biggest allocations, 3) allocate again over survivors
  allocate(sleeves, pools, Vafter, cfg, new Set(priced.map((r) => r.instrument)));

  let surv = priced
    .filter((r) => r.alloc >= cfg.minOrderValue)
    .sort((a, b) => b.alloc - a.alloc)
    .slice(0, cfg.maxOrders);

  if (!surv.length && priced.length) {
    surv = [...priced].sort((a, b) => b.alloc - a.alloc).slice(0, 1);
  }
  const survSet = new Set(surv.map((r) => r.instrument));
  allocate(sleeves, pools, Vafter, cfg, survSet);

  // whole shares: buy where at least half a share is still owed, then sweep leftover cash
  let cash = spendable;
  const sectorVal: Record<string, number> = {};
  priced.forEach((r) => {
    if (r.sector) sectorVal[r.sector] = (sectorVal[r.sector] || 0) + r.value;
  });

  const blocked = (r: RebalanceRow): string | null => {
    if (r.paused) return 'paused';
    if (r.ltp > cash + EPS) return 'cash';
    if (r.value + (r.buyQty + 1) * r.ltp > cfg.maxPositionWeight * Vafter + EPS) return 'position cap';
    if (r.sector && (sectorVal[r.sector] + r.ltp) > cfg.maxSectorWeight * Vafter + EPS) return 'sector cap';
    return null;
  };

  const buy = (r: RebalanceRow): void => {
    r.buyQty += 1;
    cash -= r.ltp;
    if (r.sector) sectorVal[r.sector] += r.ltp;
  };

  // Pass 1: buy where at least half a share is still owed
  for (;;) {
    let best: RebalanceRow | null = null;
    let bestScore = 0.5 - EPS;
    for (const r of surv) {
      if (blocked(r)) continue;
      const score = (r.alloc - r.buyQty * r.ltp) / r.ltp;
      if (score > bestScore) {
        best = r;
        bestScore = score;
      }
    }
    if (!best) break;
    buy(best);
  }

  // Pass 2 (sweep): with leftover cash, buy one share of stock with largest remaining target gap
  for (;;) {
    const orders = priced.filter((r) => r.buyQty > 0).length;
    let best: RebalanceRow | null = null;
    let bestScore = EPS;
    for (const r of priced) {
      if (r.buyQty === 0 && orders >= cfg.maxOrders) continue;
      if (blocked(r)) continue;
      const score = (r.target - r.value - r.buyQty * r.ltp) / r.ltp;
      if (score > bestScore) {
        best = r;
        bestScore = score;
      }
    }
    if (!best) break;
    buy(best);
  }

  const totalCost = sum(priced.map((r) => r.buyQty * r.ltp));
  const Vend = V + totalCost;

  for (const r of rows) {
    const cost = r.buyQty * r.ltp;
    if (r.ltp > 0) {
      if (!r.paused && cfg.maxPositionWeight * Vafter - r.value <= EPS) {
        r.reasons.push('At position cap: no buy');
      } else if (r.paused) {
        // reason already set
      } else if (r.gap <= EPS) {
        r.reasons.push('At or above target: no buy');
      } else if (r.buyQty === 0 && r.alloc > 0 && r.ltp > r.alloc) {
        r.reasons.push('One share costs more than this allocation');
      } else if (r.buyQty === 0 && !survSet.has(r.instrument)) {
        r.reasons.push('Allocation too small or outside the order limit');
      }
      if (r.gap > EPS) {
        r.reasons.unshift('Underweight by ' + Math.round(r.gap));
      }
    }
    r.suggestedQty = r.buyQty;
    r.actualCost = r2(cost);
    r.action = r.buyQty > 0 ? 'BUY' : 'HOLD';
    r.performancePct = r.perf;
    r.dividendAllocation = r.type === 'Dividend' ? r2(r.alloc) : 0;
    r.growthAllocation = r.type === 'Growth' ? r2(r.alloc) : 0;
    r.totalAllocation = r2(r.alloc);
    r.weightBefore = V > 0 ? r.value / V : 0;
    r.weightAfter = Vend > 0 ? (r.value + cost) / Vend : 0;
  }

  const driftAfter = drift(priced, (r) => r.value + r.buyQty * r.ltp);

  return {
    rows,
    summary: {
      contribution: C,
      feeReserve: r2(C - spendable),
      dividendPool: r2(pools.Dividend),
      growthPool: r2(pools.Growth),
      totalActualCost: r2(totalCost),
      leftoverCash: r2(C - totalCost),
      orders: priced.filter((r) => r.buyQty > 0).length,
      portfolioBefore: r2(V),
      portfolioAfter: r2(Vend),
      concentrationBefore: weightsStats(priced.map((r) => r.value), V),
      concentrationAfter: weightsStats(priced.map((r) => r.value + r.buyQty * r.ltp), Vend),
      driftBefore,
      driftAfter,
      sleeveMixBefore: sleeveMix(sleeves, (r) => r.value),
      sleeveMixAfter: sleeveMix(sleeves, (r) => r.value + r.buyQty * r.ltp),
    },
    warnings,
  };
}

// Legacy v1 (for "compare with v1" toggle)
export function rebalanceV1(holdings: HoldingPosition[], userCfg: Partial<RebalanceConfig> = {}): { rows: RebalanceRow[]; summary: { totalActualCost: number; leftoverCash: number; orders: number } } {
  const cfg = { ...DEFAULT_CONFIG, ...userCfg };
  const rows = holdings.map(prep).filter((r) => r.ltp > 0);
  const total = cfg.contribution;
  const aDiv = total * cfg.dividendRatio;
  const aGro = total * cfg.growthRatio;
  const divs = rows.filter((r) => r.type === 'Dividend');
  const posSum = sum(rows.filter((r) => r.type === 'Growth' && r.perf > 0).map((r) => r.perf));

  for (const r of rows) {
    const d = r.type === 'Dividend' && divs.length ? aDiv / divs.length : 0;
    const g = r.type === 'Growth' && r.perf > 0 && posSum > 0 ? (r.perf / posSum) * aGro : 0;
    r.alloc = d + g;
    r.buyQty = Math.floor(r.alloc / r.ltp);
  }

  const residual = total - sum(rows.map((r) => r.buyQty * r.ltp));
  const dips = rows.filter((r) => r.perf < cfg.dipThreshold);
  const bonus = residual / Math.max(1, dips.length);
  for (const r of dips) r.buyQty += Math.floor(bonus / r.ltp);

  const cost = sum(rows.map((r) => r.buyQty * r.ltp));
  return {
    rows,
    summary: { totalActualCost: r2(cost), leftoverCash: r2(total - cost), orders: rows.filter((r) => r.buyQty > 0).length },
  };
}