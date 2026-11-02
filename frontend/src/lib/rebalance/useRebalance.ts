// Rebalance v2 — React hook for rebalance functionality

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../lib/useAuth';
import { api } from '../../lib/api';
import { rebalanceV2, rebalanceV1 } from '../rebalance';
import type { RebalanceResult, RebalanceConfig, HoldingPosition } from '../rebalance';
import { portfolioToHoldings, apiConfigToEngineConfig, buildEngineInput } from './mapping';

interface UseRebalanceOptions {
  portfolioId: string;
  autoLoad?: boolean;
}

export function useRebalance({ portfolioId, autoLoad = true }: UseRebalanceOptions) {
  const { user } = useAuth();

  const [holdings, setHoldings] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [v1Result, setV1Result] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!portfolioId) return;
    setLoading(true);
    setError(null);
    try {
      // Load portfolio with rebalance config
      const portfolio = await api.request(`/api/v1/portfolios/${portfolioId}`);
      setHoldings(portfolio.investments || []);
      setConfig(portfolio.rebalance_config || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    if (autoLoad) loadData();
  }, [loadData, autoLoad]);

  const runRebalance = useCallback(async (customContribution?: number) => {
    if (!portfolioId) return;
    setLoading(true);
    setError(null);
    try {
      const contribution = customContribution || (config?.contribution || 21000);
      // Frontend engine execution
      const portfolio = await api.request(`/api/v1/portfolios/${portfolioId}`);
      const holdings = portfolio.investments
        .filter((inv: any) => Number(inv.current_price || 0) > 0 && Number(inv.shares || 0) > 0)
        .map((inv: any) => ({
          instrument: inv.symbol,
          quantity: Number(inv.shares || 0),
          avgCost: Number(inv.buy_price || 0),
          ltp: Number(inv.current_price || 0),
          type: inv.instrument_sub_type || (Number(inv.dividend_yield || 0) > 0 ? 'Dividend' : 'Growth'),
          sector: inv.sector,
          targetWeight: inv.rebalance_settings?.targetWeight,
          conviction: Boolean(inv.rebalance_settings?.conviction),
          paused: Boolean(inv.rebalance_settings?.paused),
          trend: inv.rebalance_settings?.trend,
          mom6m: inv.rebalance_settings?.mom6m,
        }));

      const engineConfig = {
        contribution,
        dividendRatio: Number(config?.dividendRatio ?? 0.6),
        growthRatio: Number(config?.growthRatio ?? 0.4),
        dipThreshold: Number(config?.dipThreshold ?? -0.10),
        dipBoost: Number(config?.dipBoost ?? 1.25),
        trendDownPenalty: Number(config?.trendDownPenalty ?? 0.5),
        momentumTilt: Number(config?.momentumTilt ?? 0.25),
        maxPositionWeight: Number(config?.maxPositionWeight ?? 0.10),
        maxSectorWeight: Number(config?.maxSectorWeight ?? 0.25),
        maxAddShare: Number(config?.maxAddShare ?? 0.30),
        feeReservePct: Number(config?.feeReservePct ?? 0.003),
        minOrderValue: Number(config?.minOrderValue ?? 500),
        maxOrders: Number(config?.maxOrders ?? 8),
        targetMode: config?.targetMode ?? 'equal',
      };

      const result = rebalanceV2(holdings, engineConfig);
      setResult(result);

      // Also run v1 for comparison
      const v1Result = rebalanceV1(
        holdings.map((h: any) => ({ ...h, perf: (h.ltp - h.avgCost) / h.avgCost })),
        { contribution: engineConfig.contribution }
      );
      setV1Result(v1Result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [config]);

  const saveConfig = async (newConfig: any) => {
    const updated = await api.updateRebalanceConfig(portfolioId, newConfig);
    setConfig(updated);
  };

  return {
    holdings,
    config,
    result,
    v1Result,
    loading,
    error,
    loadData,
    runRebalance,
    saveConfig,
  };
}

export default useRebalance;