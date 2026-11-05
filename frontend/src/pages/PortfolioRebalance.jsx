// Rebalance v2 — Main rebalance page component (T3)
// Uses extracted dialog components to avoid JSX parsing issues

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import { api } from '../lib/api'
import { useRebalance } from '../lib/rebalance/useRebalance'
import { rebalanceV2, rebalanceV1 } from '../lib/rebalance'
import { portfolioToHoldings } from '../lib/rebalance/mapping'
import {
  PageHeader, Card, Button, Input, Select, Progress, Badge, Table,
  InputField, Dialog, toast, Skeleton, EmptyState
} from '../components/ui'
import HoldingsDrawer from '../components/Rebalance/HoldingsDrawer'
import ImportPreviewDialog from '../components/Rebalance/ImportPreviewDialog'
import EditHoldingDialog from '../components/Rebalance/EditHoldingDialog'
import { api as apiClient } from '../lib/api'

const TARGET_MODES = [
  { value: 'equal', label: 'Equal weight' },
  { value: 'current', label: 'Current value' },
  { value: 'invested', label: 'Invested amount' },
]

export default function PortfolioRebalance() {
  const { id } = useParams()
  const { user } = useAuth()
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
    runRebalance,
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
      <div style={{ display: 'grid', gap: 16 }}>
        <Skeleton style={{ height: 40 }} />
        <Skeleton style={{ height: 80 }} />
        <Skeleton style={{ height: 200 }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHeader
        title="Rebalance"
        num="018 / 016"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
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
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          Buy-only rebalancing: new cash goes to the most underweight positions within guard rails.
        </p>
      </PageHeader>

      {hookError && <div style={{ color: 'var(--accent)', marginBottom: 12 }}>{hookError}</div>}

      {/* KPI Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Card style={{ padding: '16px' }}>
          <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Contribution</p>
          <input type="number" value={config.contribution} onChange={e => handleConfigChange('contribution', Number(e.target.value))} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14 }} />
        </Card>
        <Card style={{ padding: '16px' }}>
          <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Dividend Pool</p>
          <p className="fin" style={{ fontSize: 20, fontWeight: 600, color: 'var(--success)' }}>
            {result ? fmtINR(result.summary.dividendPool) : fmtINR(config.contribution * 0.6 * (1 - config.feeReservePct))}
          </p>
        </Card>
        <Card style={{ padding: '16px' }}>
          <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Growth Pool</p>
          <p className="fin" style={{ fontSize: 20, fontWeight: 600, color: 'var(--accent)' }}>
            {result ? fmtINR(result.summary.growthPool) : fmtINR(config.contribution * 0.4 * (1 - config.feeReservePct))}
          </p>
        </Card>
        <Card style={{ padding: '16px' }}>
          <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Actual Cost</p>
          <p className="fin" style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)' }}>
            {result ? fmtINR(result.summary.totalActualCost) : '—'}
          </p>
        </Card>
        <Card style={{ padding: '16px' }}>
          <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Leftover</p>
          <p className="fin" style={{ fontSize: 20, fontWeight: 600, color: 'var(--faint)' }}>
            {result ? fmtINR(result.summary.leftoverCash) : '—'}
          </p>
        </Card>
        <Card style={{ padding: '16px' }}>
          <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Orders</p>
          <p className="fin" style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)' }}>
            {result ? result.summary.orders : '—'}
          </p>
        </Card>
        <Card style={{ padding: '16px' }}>
          <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Charges Reserve</p>
          <p className="fin" style={{ fontSize: 20, fontWeight: 600, color: 'var(--warning)' }}>
            {result ? fmtINR(result.summary.feeReserve) : fmtINR(config.contribution * config.feeReservePct)}
          </p>
        </Card>
      </div>

      {/* Controls */}
      <Card style={{ padding: '16px' }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Controls</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
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
          <InputField label="Dip Boost"
            type="number" step="0.05" min="1" max="2" value={config.dipBoost}
            onChange={e => handleConfigChange('dipBoost', Number(e.target.value))} />
          <InputField label="Trend Down Penalty"
            type="number" step="0.05" min="0" max="1" value={config.trendDownPenalty}
            onChange={e => handleConfigChange('trendDownPenalty', Number(e.target.value))} />
          <InputField label="Momentum Tilt"
            type="number" step="0.05" min="0" max="1" value={config.momentumTilt}
            onChange={e => handleConfigChange('momentumTilt', Number(e.target.value))} />
          <InputField label="Max Add Share"
            type="number" step="0.01" min="0.01" max="1" value={config.maxAddShare}
            onChange={e => handleConfigChange('maxAddShare', Number(e.target.value))} />
          <InputField label="Fee Reserve (%)"
            type="number" step="0.001" min="0" max="0.1" value={config.feeReservePct}
            onChange={e => handleConfigChange('feeReservePct', Number(e.target.value))} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Button variant="ghost" onClick={handleResetDefaults}>Reset to defaults</Button>
        </div>
      </Card>

      {/* Compare v1 Toggle */}
      {compareV1 && v1Result && result && (
        <Card style={{ padding: '16px', border: '2px solid var(--accent)' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>v1 vs v2 Comparison (Current Portfolio)</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px' }}>Metric</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>v1 (Legacy)</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>v2 (New)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-soft)' }}>
                <td style={{ padding: '8px 12px' }}>Spent</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmtINR(v1Result.summary.totalActualCost)}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmtINR(result.summary.totalActualCost)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-soft)' }}>
                <td style={{ padding: '8px 12px' }}>Leftover</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmtINR(v1Result.summary.leftoverCash)}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmtINR(result.summary.leftoverCash)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-soft)' }}>
                <td style={{ padding: '8px 12px' }}>Orders</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{v1Result.summary.orders}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{result.summary.orders}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-soft)' }}>
                <td style={{ padding: '8px 12px' }}>Above 10% cap</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                  {fmtINR(v1Result.rows.filter(r => r.suggestedQty > 0 && r.weightAfter > 0.10).reduce((sum, r) => sum + r.actualCost, 0))}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                  {fmtINR(result.rows.filter(r => r.suggestedQty > 0 && r.weightAfter > 0.10).reduce((sum, r) => sum + r.actualCost, 0))}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-soft)' }}>
                <td style={{ padding: '8px 12px' }}>Top-5 weight</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{(v1Result.summary.concentrationAfter?.top5 * 100 || 0).toFixed(1)}%</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{(result.summary.concentrationAfter.top5 * 100).toFixed(1)}%</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-soft)' }}>
                <td style={{ padding: '8px 12px' }}>HHI</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{(v1Result.summary.concentrationAfter?.hhi || 0).toFixed(4)}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{result.summary.concentrationAfter.hhi.toFixed(4)}</td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      {/* Rebalance Table */}
      {result && (
        <div style={{ display: 'grid', gap: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Rebalance Plan</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px' }}>Instrument</th>
                <th style={{ padding: '8px 12px' }}>Type</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Qty</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Avg Cost</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>LTP</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Perf %</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Wt Now</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Wt After</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Allocation</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Suggested</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Cost</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Action</th>
                <th style={{ padding: '8px 12px' }}>Why</th>
              </tr>
            </thead>
            <tbody>
              {result.rows
                .filter((r) => r.ltp > 0)
                .sort((a, b) => (b.action === 'BUY' ? 1 : 0) - (a.action === 'BUY' ? 1 : 0))
                .map((r) => (
                  <tr key={r.instrument} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                    <td style={{ padding: '8px 12px' }}><strong>{r.instrument}</strong></td>
                    <td style={{ padding: '8px 12px' }}><span style={{ background: r.type === 'Dividend' ? 'var(--success-bg)' : 'var(--border-soft)', color: r.type === 'Dividend' ? 'var(--success)' : 'var(--muted)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontSize: 11 }}>{r.type}</span></td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{r.quantity}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{Number(r.avgCost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{Number(r.ltp || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      {r.performancePct > 0 ? <span style={{ color: 'var(--success)' }}>+{(r.performancePct * 100).toFixed(1)}%</span> : <span style={{ color: 'var(--accent)' }}>{(r.performancePct * 100).toFixed(1)}%</span>}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{(r.weightBefore * 100).toFixed(2)}%</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{(r.weightAfter * 100).toFixed(2)}%</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmtINR(r.totalAllocation)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}><strong>{r.suggestedQty}</strong></td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmtINR(r.actualCost)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span style={{ background: r.action === 'BUY' ? 'var(--success-bg)' : 'var(--border-soft)', color: r.action === 'BUY' ? 'var(--success)' : 'var(--muted)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontSize: 11 }}>{r.action}</span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      {r.reasons?.slice(0, 3).map((reason, i) => (
                        <span key={i} style={{ background: 'var(--border-soft)', color: 'var(--muted)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontSize: 10, marginRight: 4, display: 'inline-block', marginBottom: 2 }}>{reason}</span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      )}

      {/* Before/After Panel */}
      {result && (
        <Card style={{ padding: '16px' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Before / After</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Portfolio Value</p>
              <p className="fin" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
                {fmtINR(result.summary.portfolioBefore)} → {fmtINR(result.summary.portfolioAfter)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Top-5 Weight</p>
              <p className="fin" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
                {(result.summary.concentrationBefore.top5 * 100).toFixed(1)}% → {(result.summary.concentrationAfter.top5 * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Drift</p>
              <p className="fin" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
                {(result.summary.driftBefore * 100).toFixed(2)}% → {(result.summary.driftAfter * 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Sleeve Mix</p>
              <p style={{ fontSize: 14, color: 'var(--muted)' }}>
                Div: {(result.summary.sleeveMixBefore.Dividend * 100).toFixed(1)}% → {(result.summary.sleeveMixAfter.Dividend * 100).toFixed(1)}%
              </p>
              <p style={{ fontSize: 14, color: 'var(--muted)' }}>
                Gro: {(result.summary.sleeveMixBefore.Growth * 100).toFixed(1)}% → {(result.summary.sleeveMixAfter.Growth * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>
      )}

      {result?.warnings?.length > 0 && (
        <Card style={{ padding: '12px', borderLeft: '3px solid var(--warning)' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--warning)', marginBottom: 4 }}>Warnings</p>
          <ul style={{ fontSize: 12, color: 'var(--muted)', margin: 0, paddingLeft: 20 }}>
            {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </Card>
      )}

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

      <footer style={{ padding: '20px 0', borderTop: '1px solid var(--border-soft)', fontSize: 12, color: 'var(--faint)', textAlign: 'center' }}>
        Suggestions only. Check live prices and charges before ordering. Not investment advice.
      </footer>
    </div>
  )
}