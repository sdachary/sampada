// Rebalance v2 Types — matches REBALANCE_V2_SPEC.md §3

export type InstrumentType = 'Dividend' | 'Growth';

export interface HoldingPosition {
  instrument: string;
  quantity: number;             // whole shares; 0 allowed (watchlist)
  avgCost: number;
  ltp: number;                  // 0 or missing => excluded with warning
  type: InstrumentType;
  sector?: string;
  targetWeight?: number;        // relative weight inside its sleeve, > 0
  conviction?: boolean;         // "I would average down on this one"
  paused?: boolean;             // "do not buy this month"
  trend?: 'up' | 'down';
  mom6m?: number;               // e.g. 0.12 = +12% over 6 months
}

export interface RebalanceConfig {
  contribution: number;
  dividendRatio: number;
  growthRatio: number;
  dipThreshold: number;         // -0.10
  dipBoost: number;             // 1.25
  trendDownPenalty: number;     // 0.5
  momentumTilt: number;         // 0.25
  maxPositionWeight: number;    // 0.10 of portfolio after the buy
  maxSectorWeight: number;      // 0.25
  maxAddShare: number;          // 0.30 of a sleeve pool per stock
  feeReservePct: number;        // 0.003
  minOrderValue: number;        // 500
  maxOrders: number;            // 8
  targetMode: 'equal' | 'current' | 'invested';
}

export interface RebalanceRow extends HoldingPosition {
  // Computed fields
  performancePct: number;
  weightBefore: number;
  weightAfter: number;
  dividendAllocation: number;
  growthAllocation: number;
  totalAllocation: number;
  suggestedQty: number;
  actualCost: number;
  action: 'BUY' | 'HOLD';
  reasons: string[];
  // Internal (not in spec output but needed for algorithm)
  value: number;
  w: number;
  gap: number;
  head: number;
  target: number;
  alloc: number;
  buyQty: number;
}

export interface ConcentrationStats {
  top1: number;
  top5: number;
  hhi: number;
}

export interface SleeveMix {
  Dividend: number;
  Growth: number;
}

export interface RebalanceSummary {
  contribution: number;
  feeReserve: number;
  dividendPool: number;
  growthPool: number;
  totalActualCost: number;
  leftoverCash: number;
  orders: number;
  portfolioBefore: number;
  portfolioAfter: number;
  concentrationBefore: ConcentrationStats;
  concentrationAfter: ConcentrationStats;
  driftBefore: number;
  driftAfter: number;
  sleeveMixBefore: SleeveMix;
  sleeveMixAfter: SleeveMix;
}

export interface RebalanceResult {
  rows: RebalanceRow[];
  summary: RebalanceSummary;
  warnings: string[];
}

// Default config values (matches reference/rebalanceEngine.mjs)
export const DEFAULT_CONFIG: RebalanceConfig = {
  contribution: 21000,
  dividendRatio: 0.6,
  growthRatio: 0.4,
  dipThreshold: -0.10,
  dipBoost: 1.25,
  trendDownPenalty: 0.5,
  momentumTilt: 0.25,
  maxPositionWeight: 0.10,
  maxSectorWeight: 0.25,
  maxAddShare: 0.30,
  feeReservePct: 0.003,
  minOrderValue: 500,
  maxOrders: 8,
  targetMode: 'equal',
};