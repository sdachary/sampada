// Rebalance v2 — Main rebalance page component (T3)
// Uses extracted dialog components to avoid JSX parsing issues

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useRebalance } from '../lib/rebalance/useRebalance'
import { rebalanceV2, rebalanceV1 } from '../lib/rebalance'
import {
  PageHeader, Card, Button, InputField, toast, Skeleton, Table
} from '../components/ui'
import HoldingsDrawer from '../components/Rebalance/HoldingsDrawer'
import ImportPreviewDialog from '../components/Rebalance/ImportPreviewDialog'
import EditHoldingDialog from '../components/Rebalance/EditHoldingDialog'
import { api as apiClient } from '../lib/api'
import { Reveal } from '../lib/motion-primitives'

export default function PortfolioRebalance() {
  const { id } = useParams()
  const [compareV1, setCompareV1] = useState(false)
  const [holdingsDrawerOpen, setHoldingsDrawerOpen] = useState(false)
  const [importPreview, setImportPreview] = useState(null)
  const [importFile, setImportFile] = useState(null)
  const [editingHolding, setEditingHolding] = useState(null)
  const [sectors, setSectors] = useState([])

  const {
    holdings: apiHoldings,
    config: apiConfig,
    loading: hookLoading,
    saveConfig,
    error: hookError,
  } = useRebalance({ portfolioId: id, autoLoad: true })

  const [config, setConfig] = useState({
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
  })

  useEffect(() => {
    if (apiConfig) {
      setConfig(prev => ({
        ...prev,
        contribution: apiConfig.contribution ?? prev.contribution,
        dividendRatio: apiConfig.dividendRatio ?? prev.dividendRatio,
        growthRatio: apiConfig.growthRatio ?? prev.growthRatio,
        dipThreshold: apiConfig.dipThreshold ?? prev.dipThreshold,
        dipBoost: apiConfig.dipBoost ?? prev.dipBoost,
        trendDownPenalty: apiConfig.trendDownPenalty ?? prev.trendDownPenalty,
        momentumTilt: apiConfig.momentumTilt ?? prev.momentumTilt,
        maxPositionWeight: apiConfig.maxPositionWeight ?? prev.maxPositionWeight,
        maxSectorWeight: apiConfig.maxSectorWeight ?? prev.maxSectorWeight,
        maxAddShare: apiConfig.maxAddShare ?? prev.maxAddShare,
        feeReservePct: apiConfig.feeReservePct ?? prev.feeReservePct,
        minOrderValue: apiConfig.minOrderValue ?? prev.minOrderValue,
        maxOrders: apiConfig.maxOrders ?? prev.maxOrders,
        targetMode: apiConfig.targetMode ?? prev.targetMode,
      }))
    }
  }, [apiConfig])

  // Fetch sectors for edit dialog
  useEffect(() => {
    api.request('/api/v1/sectors').then(d => setSectors(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const holdings = useMemo(() => {
    if (!apiHoldings?.length) return []
    return apiHoldings
      .filter((inv) => Number(inv.current_price || 0) > 0 && Number(inv.shares || 0) > 0)
      .map((inv) => ({
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
        _original: inv,
      }))
  }, [apiHoldings])

  // Memoized rebalance computation for performance (<10ms for 200 rows)
  const { result, v1Result } = useMemo(() => {
    if (holdings.length === 0) return { result: null, v1Result: null }
    const engineConfig = { ...config }
    const result = rebalanceV2(holdings, engineConfig)
    const v1Holdings = holdings.map(h => ({ ...h, perf: (h.ltp - h.avgCost) / h.avgCost }))
    const v1Result = rebalanceV1(v1Holdings, { contribution: engineConfig.contribution })
    return { result, v1Result }
  }, [holdings, config])

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveConfig = async () => {
    await saveConfig(config)
    toast('Configuration saved')
  }

  const handleResetDefaults = () => {
    setConfig({
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
    })
    toast('Reset to defaults')
  }

  const handleCompareV1 = () => {
    setCompareV1(!compareV1)
  }

  const handleImportPreview = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await api.importInvestments(id, file, true)
      setImportPreview(response.preview)
      setImportFile(file)
    } catch (err) {
      toast(err.message)
    }
  }

  const handleImportApply = async () => {
    if (!importFile) return
    try {
      await api.importInvestments(id, importFile, false)
      toast('Investments imported')
      setImportPreview(null)
      setImportFile(null)
    } catch (err) {
      toast(err.message)
    }
  }

  const handleEditHolding = (inv) => {
    setEditingHolding(inv)
  }

  const handleDeleteHolding = (id) => {
    if (window.confirm('Delete this holding?')) {
      apiClient.request(`/api/v1/investments/${id}`, { method: 'DELETE' })
        .then(() => {
          toast('Holding deleted')
        })
        .catch(err => toast(err.message))
    }
  }

  const fmtINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

  const TARGET_MODES = [
    { value: 'equal', label: 'Equal weight' },
    { value: 'current', label: 'Current value' },
    { value: 'invested', label: 'Invested amount' },
  ]

  if (hookLoading) {
    return (
      <Reveal delay={0}>
        <div className="space-y-4">
          <Skeleton className="skeleton-title w-32" />
          <Skeleton className="skeleton-text w-64" />
          <Skeleton className="skeleton-card h-48" />
        </div>
      </Reveal>
    )
  }

  return (
    <div className="space-y-5">
      <Reveal delay={0}>
        <PageHeader
          title="Rebalance"
          num="018 / 016"
          action={
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setHoldingsDrawerOpen(true)}>
                Holdings
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCompareV1}>
                {compareV1 ? 'Hide v1' : 'Compare v1'}
              </Button>
              <Button onClick={handleSaveConfig}>Save config</Button>
            </div>
          }
        >
          <p className="text-sm text-muted">
            Buy-only rebalancing: new cash goes to the most underweight positions within guard rails.
          </p>
        </PageHeader>
      </Reveal>

      {hookError && <Reveal delay={50}><div className="text-accent mb-3">{hookError}</div></Reveal>}

      <Reveal delay={100}>
        {/* KPI Bar */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-4">
          <Card className="card-shell card-core--pad-base">
            <p className="label-caps">Contribution</p>
            <input type="number" value={config.contribution} onChange={e => handleConfigChange('contribution', Number(e.target.value))} className="w-full px-3 py-2 border border-border rounded-sm text-base" />
          </Card>
          <Card className="card-shell card-core--pad-base">
            <p className="label-caps">Dividend Pool</p>
            <p className="fin font-display text-xl font-semibold text-success mt-1">
              {result ? fmtINR(result.summary.dividendPool) : fmtINR(config.contribution * 0.6 * (1 - config.feeReservePct))}
            </p>
          </Card>
          <Card className="card-shell card-core--pad-base">
            <p className="label-caps">Growth Pool</p>
            <p className="fin font-display text-xl font-semibold text-accent mt-1">
              {result ? fmtINR(result.summary.growthPool) : fmtINR(config.contribution * 0.4 * (1 - config.feeReservePct))}
            </p>
          </Card>
          <Card className="card-shell card-core--pad-base">
            <p className="label-caps">Actual Cost</p>
            <p className="fin font-display text-xl font-semibold text-ink mt-1">
              {result ? fmtINR(result.summary.totalActualCost) : '—'}
            </p>
          </Card>
          <Card className="card-shell card-core--pad-base">
            <p className="label-caps">Leftover</p>
            <p className="fin font-display text-xl font-semibold text-faint mt-1">
              {result ? fmtINR(result.summary.leftoverCash) : '—'}
            </p>
          </Card>
          <Card className="card-shell card-core--pad-base">
            <p className="label-caps">Orders</p>
            <p className="fin font-display text-xl font-semibold text-ink mt-1">
              {result ? result.summary.orders : '—'}
            </p>
          </Card>
          <Card className="card-shell card-core--pad-base">
            <p className="label-caps">Charges Reserve</p>
            <p className="fin font-display text-xl font-semibold text-warning mt-1">
              {result ? fmtINR(result.summary.feeReserve) : fmtINR(config.contribution * config.feeReservePct)}
            </p>
          </Card>
        </div>
      </Reveal>

      <Reveal delay={150}>
        {/* Controls */}
        <Card className="card-shell card-core--pad-lg">
          <p className="text-sm font-semibold text-ink mb-3">Controls</p>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <InputField label="Dividend / Growth Split" type="range"
              min="0" max="1" step="0.05" value={config.dividendRatio}
              onChange={e => { const v = Number(e.target.value); handleConfigChange('dividendRatio', v); handleConfigChange('growthRatio', 1 - v); }}
              style={{ width: '100%' }} />
            <InputField label="Dip Threshold (%)"
              type="range" min="-0.5" max="0" step="0.01" value={config.dipThreshold}
              onChange={e => handleConfigChange('dipThreshold', Number(e.target.value))} />
            <InputField label="Dip Boost"
              type="number" step="0.05" min="1" max="3" value={config.dipBoost}
              onChange={e => handleConfigChange('dipBoost', Number(e.target.value))} />
            <InputField label="Target Mode"
              as="select" value={config.targetMode}
              onChange={e => handleConfigChange('targetMode', e.target.value)}
              options={TARGET_MODES} />
            <InputField label="Max Position Weight (%)"
              type="number" step="0.01" min="0.01" max="1" value={config.maxPositionWeight}
              onChange={e => handleConfigChange('maxPositionWeight', Number(e.target.value))} />
            <InputField label="Max Sector Weight (%)"
              type="number" step="0.01" min="0.01" max="1" value={config.maxSectorWeight}
              onChange={e => handleConfigChange('maxSectorWeight', Number(e.target.value))} />
            <InputField label="Max Add Share (%)"
              type="number" step="0.01" min="0.01" max="1" value={config.maxAddShare}
              onChange={e => handleConfigChange('maxAddShare', Number(e.target.value))} />
            <InputField label="Fee Reserve (%)"
              type="number" step="0.001" min="0" max="0.1" value={config.feeReservePct}
              onChange={e => handleConfigChange('feeReservePct', Number(e.target.value))} />
            <InputField label="Min Order Value"
              type="number" step="100" min="100" value={config.minOrderValue}
              onChange={e => handleConfigChange('minOrderValue', Number(e.target.value))} />
            <InputField label="Max Orders"
              type="number" step="1" min="1" max="20" value={config.maxOrders}
              onChange={e => handleConfigChange('maxOrders', Number(e.target.value))} />
            <InputField label="Trend Down Penalty"
              type="number" step="0.05" min="0" max="1" value={config.trendDownPenalty}
              onChange={e => handleConfigChange('trendDownPenalty', Number(e.target.value))} />
            <InputField label="Momentum Tilt"
              type="number" step="0.05" min="0" max="1" value={config.momentumTilt}
              onChange={e => handleConfigChange('momentumTilt', Number(e.target.value))} />
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="ghost" onClick={handleResetDefaults}>Reset to defaults</Button>
          </div>
        </Card>
      </Reveal>

      <Reveal delay={200}>
        {/* Compare v1 Toggle */}
        {compareV1 && v1Result && result && (
          <Card className="card-shell card-shell--elevated card-core--pad-lg border border-accent">
            <p className="text-sm font-semibold text-ink mb-3">v1 vs v2 Comparison (Current Portfolio)</p>
            <Table
              columns={[
                { key: 'metric', label: 'Metric' },
                { key: 'v1', label: 'v1 (Legacy)', align: 'right' },
                { key: 'v2', label: 'v2 (New)', align: 'right' },
              ]}
              rows={[
                { id: 'spent', cells: { metric: 'Spent', v1: fmtINR(v1Result.summary.totalActualCost), v2: fmtINR(result.summary.totalActualCost) } },
                { id: 'leftover', cells: { metric: 'Leftover', v1: fmtINR(v1Result.summary.leftoverCash), v2: fmtINR(result.summary.leftoverCash) } },
                { id: 'orders', cells: { metric: 'Orders', v1: v1Result.summary.orders, v2: result.summary.orders } },
                { id: 'above10', cells: {
                  metric: 'Above 10% cap',
                  v1: fmtINR(v1Result.rows.filter(r => r.suggestedQty > 0 && r.weightAfter > 0.10).reduce((sum, r) => sum + r.actualCost, 0)),
                  v2: fmtINR(result.rows.filter(r => r.suggestedQty > 0 && r.weightAfter > 0.10).reduce((sum, r) => sum + r.actualCost, 0)),
                }},
                { id: 'top5', cells: {
                  metric: 'Top-5 weight',
                  v1: `${(v1Result.summary.concentrationAfter?.top5 * 100 || 0).toFixed(1)}%`,
                  v2: `${(result.summary.concentrationAfter.top5 * 100).toFixed(1)}%`,
                }},
                { id: 'hhi', cells: {
                  metric: 'HHI',
                  v1: (v1Result.summary.concentrationAfter?.hhi || 0).toFixed(4),
                  v2: result.summary.concentrationAfter.hhi.toFixed(4),
                }},
              ]}
            />
          </Card>
        )}
      </Reveal>

      <Reveal delay={250}>
        {/* Rebalance Table */}
        {result && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-ink">Rebalance Plan</p>
            <Table
              columns={[
                { key: 'instrument', label: 'Instrument' },
                { key: 'type', label: 'Type' },
                { key: 'quantity', label: 'Qty', align: 'right' },
                { key: 'avgCost', label: 'Avg Cost', align: 'right' },
                { key: 'ltp', label: 'LTP', align: 'right' },
                { key: 'performancePct', label: 'Perf %', align: 'right' },
                { key: 'weightBefore', label: 'Wt Now', align: 'right' },
                { key: 'weightAfter', label: 'Wt After', align: 'right' },
                { key: 'totalAllocation', label: 'Allocation', align: 'right' },
                { key: 'suggestedQty', label: 'Suggested', align: 'right' },
                { key: 'actualCost', label: 'Cost', align: 'right' },
                { key: 'action', label: 'Action', align: 'center' },
                { key: 'reasons', label: 'Why' },
              ]}
              rows={result.rows
                .filter((r) => r.ltp > 0)
                .sort((a, b) => (b.action === 'BUY' ? 1 : 0) - (a.action === 'BUY' ? 1 : 0))
                .map((r) => ({
                  id: r.instrument,
                  cells: {
                    instrument: <strong>{r.instrument}</strong>,
                    type: <span className={`px-2 py-0.5 rounded-full text-xs ${r.type === 'Dividend' ? 'bg-success-bg text-success' : 'bg-border-soft text-muted'}`}>{r.type}</span>,
                    quantity: r.quantity,
                    avgCost: `₹${Number(r.avgCost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    ltp: `₹${Number(r.ltp || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    performancePct: r.performancePct > 0
                      ? <span className="text-success">+{(r.performancePct * 100).toFixed(1)}%</span>
                      : <span className="text-accent">{(r.performancePct * 100).toFixed(1)}%</span>,
                    weightBefore: `{(r.weightBefore * 100).toFixed(2)}%`,
                    weightAfter: `{(r.weightAfter * 100).toFixed(2)}%`,
                    totalAllocation: fmtINR(r.totalAllocation),
                    suggestedQty: <strong>{r.suggestedQty}</strong>,
                    actualCost: fmtINR(r.actualCost),
                    action: <span className={`px-2 py-0.5 rounded-full text-xs ${r.action === 'BUY' ? 'bg-success-bg text-success' : 'bg-border-soft text-muted'}`}>{r.action}</span>,
                    reasons: r.reasons?.slice(0, 3).map((reason, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-border-soft text-muted mr-1 mb-1 inline-block">{reason}</span>
                    )),
                  },
                }))
              }
              ariaLabel="Rebalance plan table"
            />
          </div>
        )}
      </Reveal>

      <Reveal delay={300}>
        {/* Before/After Panel */}
        {result && (
          <Card className="card-shell card-core--pad-lg">
            <p className="text-sm font-semibold text-ink mb-3">Before / After</p>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="label-caps">Portfolio Value</p>
                <p className="fin font-display text-lg font-semibold text-ink mt-1">
                  {fmtINR(result.summary.portfolioBefore)} → {fmtINR(result.summary.portfolioAfter)}
                </p>
              </div>
              <div>
                <p className="label-caps">Top-5 Weight</p>
                <p className="fin font-display text-lg font-semibold text-ink mt-1">
                  {(result.summary.concentrationBefore.top5 * 100).toFixed(1)}% → {(result.summary.concentrationAfter.top5 * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="label-caps">Drift</p>
                <p className="fin font-display text-lg font-semibold text-ink mt-1">
                  {(result.summary.driftBefore * 100).toFixed(2)}% → {(result.summary.driftAfter * 100).toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="label-caps">Sleeve Mix</p>
                <p className="text-sm text-muted">
                  Div: {(result.summary.sleeveMixBefore.Dividend * 100).toFixed(1)}% → {(result.summary.sleeveMixAfter.Dividend * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-muted">
                  Gro: {(result.summary.sleeveMixBefore.Growth * 100).toFixed(1)}% → {(result.summary.sleeveMixAfter.Growth * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>
        )}
      </Reveal>

      <Reveal delay={350}>
        {result?.warnings?.length > 0 && (
          <Card className="card-shell card-core--pad-base border-l-3 border-l-warning">
            <p className="text-xs font-semibold text-warning mb-1">Warnings</p>
            <ul className="text-sm text-muted m-0 pl-5">
              {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </Card>
        )}
      </Reveal>

      <HoldingsDrawer
        open={holdingsDrawerOpen}
        onClose={() => setHoldingsDrawerOpen(false)}
        holdings={apiHoldings}
        onEdit={handleEditHolding}
        onDelete={handleDeleteHolding}
        onImportClick={() => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = '.csv'
          input.onchange = e => e.target.files[0] && handleImportPreview(e.target.files[0])
          input.click()
        }}
        onAddClick={() => setEditingHolding({})}
      />

      <ImportPreviewDialog
        open={!!importPreview}
        onClose={() => { setImportPreview(null); setImportFile(null); }}
        preview={importPreview}
        onApply={handleImportApply}
        onChangeFile={() => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = '.csv'
          input.onchange = e => e.target.files[0] && handleImportPreview(e.target.files[0])
          input.click()
        }}
      />

      <EditHoldingDialog
        open={!!editingHolding}
        onClose={() => setEditingHolding(null)}
        holding={editingHolding}
        sectors={sectors}
        onSave={() => setEditingHolding(null)}
      />

      <footer className="py-5 border-t border-border-soft text-sm text-faint text-center">
        Suggestions only. Check live prices and charges before ordering. Not investment advice.
      </footer>
    </div>
  )
}