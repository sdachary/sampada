// Rebalance v2 — Frontend data mapping utilities
// Converts portfolio API data to engine HoldingPosition format

import type { HoldingPosition, RebalanceConfig } from './rebalance';

/**
 * Convert API investment to engine HoldingPosition
 */
export function investmentToHoldingPosition(inv: any): HoldingPosition {
  return {
    instrument: inv.symbol,
    quantity: Number(inv.shares || 0),
    avgCost: Number(inv.buy_price || 0),
    ltp: Number(inv.current_price || 0),
    type: inv.instrument_sub_type || (Number(inv.dividend_yield || 0) > 0 ? 'Dividend' : 'Growth'),
    sector: inv.sector || inv.rebalance_settings?.sector,
    targetWeight: inv.rebalance_settings?.targetWeight,
    conviction: Boolean(inv.rebalance_settings?.conviction),
    paused: Boolean(inv.rebalance_settings?.paused),
    trend: inv.rebalance_settings?.trend,
    mom6m: inv.rebalance_settings?.mom6m,
  };
}

/**
 * Convert portfolio API response to holdings array
 */
export function portfolioToHoldings(portfolio: any): HoldingPosition[] {
  if (!portfolio?.investments?.length) return [];

  return portfolio.investments
    .filter((inv: any) => Number(inv.current_price || 0) > 0 && Number(inv.shares || 0) > 0)
    .map(investmentToHoldingPosition);
}

/**
 * Convert API rebalance config to engine config
 */
export function apiConfigToEngineConfig(apiConfig: any): RebalanceConfig {
  return {
    contribution: Number(apiConfig.contribution || 21000),
    dividendRatio: Number(apiConfig.dividendRatio ?? apiConfig.dividend_ratio ?? 0.6),
    growthRatio: Number(apiConfig.growthRatio ?? apiConfig.growth_ratio ?? 0.4),
    dipThreshold: Number(apiConfig.dipThreshold ?? apiConfig.dip_threshold ?? -0.10),
    dipBoost: Number(apiConfig.dipBoost ?? apiConfig.dip_boost ?? 1.25),
    trendDownPenalty: Number(apiConfig.trendDownPenalty ?? apiConfig.trend_down_penalty ?? 0.5),
    momentumTilt: Number(apiConfig.momentumTilt ?? apiConfig.momentum_tilt ?? 0.25),
    maxPositionWeight: Number(apiConfig.maxPositionWeight ?? apiConfig.max_position_weight ?? 0.10),
    maxSectorWeight: Number(apiConfig.maxSectorWeight ?? apiConfig.max_sector_weight ?? 0.25),
    maxAddShare: Number(apiConfig.maxAddShare ?? apiConfig.max_add_share ?? 0.30),
    feeReservePct: Number(apiConfig.feeReservePct ?? apiConfig.fee_reserve_pct ?? 0.003),
    minOrderValue: Number(apiConfig.minOrderValue ?? apiConfig.min_order_value ?? 500),
    maxOrders: Number(apiConfig.maxOrders ?? apiConfig.max_orders ?? 8),
    targetMode: apiConfig.targetMode ?? apiConfig.target_mode ?? 'equal',
  };
}

/**
 * Convert engine config to API config format
 */
export function engineConfigToApiConfig(engineConfig: any): any {
  return {
    contribution: engineConfig.contribution,
    dividend_ratio: engineConfig.dividendRatio,
    growth_ratio: engineConfig.growthRatio,
    dip_threshold: engineConfig.dipThreshold,
    dip_boost: engineConfig.dipBoost,
    trend_down_penalty: engineConfig.trendDownPenalty,
    momentum_tilt: engineConfig.momentumTilt,
    max_position_weight: engineConfig.maxPositionWeight,
    max_sector_weight: engineConfig.maxSectorWeight,
    max_add_share: engineConfig.maxAddShare,
    fee_reserve_pct: engineConfig.feeReservePct,
    min_order_value: engineConfig.minOrderValue,
    max_orders: engineConfig.maxOrders,
    target_mode: engineConfig.targetMode,
  };
}

/**
 * Build complete engine input from portfolio API response
 */
export function buildEngineInput(portfolio: any, contribution?: number): {
  holdings: HoldingPosition[];
  config: RebalanceConfig;
} {
  const holdings = portfolioToHoldings(portfolio);
  const config = portfolio.rebalance_config
    ? apiConfigToEngineConfig(portfolio.rebalance_config)
    : {
        contribution: contribution || 21000,
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

  if (contribution) config.contribution = contribution;

  return { holdings, config };
}