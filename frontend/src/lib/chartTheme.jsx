// Chart theme (Step 6) — single source for Recharts styling, tokens only.
// Colors, axis/grid, tooltip, number formatting, animation, a11y helpers.

import { prefersReducedMotion } from '../lib/motion-primitives'

// Color palette — one coral accent max per chart, others ink/muted/success
export const CHART_PALETTE = {
  accent: 'var(--accent)',
  accentSoft: 'var(--accent-soft)',
  ink: 'var(--ink)',
  inkMuted: 'var(--ink-mute)',
  muted: 'var(--muted)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  border: 'var(--border)',
  borderSoft: 'var(--border-soft)',
  surface: 'var(--surface)',
  bg: 'var(--bg)',
  overlay: 'var(--overlay)',
}

// Series colors — assign in order: accent, ink, muted, success, warning, danger
export const SERIES_COLORS = [
  CHART_PALETTE.accent,
  CHART_PALETTE.ink,
  CHART_PALETTE.muted,
  CHART_PALETTE.success,
  CHART_PALETTE.warning,
  CHART_PALETTE.danger,
]

// Semantic aliases for specific chart types
export const CHART_COLORS = {
  conservative: CHART_PALETTE.ink,       // was #6366f1
  moderate: CHART_PALETTE.accent,        // was #f59e0b (coral)
  aggressive: CHART_PALETTE.muted,       // was #ef4444
  equity: CHART_PALETTE.accent,
  debt: CHART_PALETTE.ink,
  gold: CHART_PALETTE.warning,
}

export const PIE_COLORS = [
  CHART_PALETTE.accent,
  CHART_PALETTE.ink,
  CHART_PALETTE.warning,
  CHART_PALETTE.success,
  CHART_PALETTE.muted,
]

// Axis & grid defaults — grid at --border-soft, ticks at --ink-faint
export const AXIS_DEFAULTS = {
  tick: { fill: CHART_PALETTE.inkMuted, fontSize: 10 },
  axisLine: { stroke: CHART_PALETTE.borderSoft },
  tickLine: { stroke: CHART_PALETTE.borderSoft },
}

export const GRID_DEFAULTS = {
  stroke: CHART_PALETTE.borderSoft,
  strokeDasharray: '2 2',
  vertical: false,
}

// Tooltip component — Card-like surface, tokens, tabular numerals
export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const [entry] = payload
  const formatter = entry.valueFormatter || ((v) => `₹${Number(v || 0).toLocaleString('en-IN')}`)
  return (
    <div className="chart-tooltip" style={{
      background: CHART_PALETTE.surface,
      border: `1px solid ${CHART_PALETTE.border}`,
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 12,
      fontVariantNumeric: 'tabular-nums',
      boxShadow: 'var(--shadow-modal)',
    }}>
      <p style={{ fontSize: 10, color: CHART_PALETTE.muted, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ margin: 0, color: CHART_PALETTE.ink }}>{formatter(entry.value, entry.name)}</p>
    </div>
  )
}

// Number formatting — respects user's locale/currency
export function createNumberFormatter({ currency = 'INR', locale = 'en-IN', maximumFractionDigits = 0 } = {}) {
  const fmt = new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits })
  return (value) => fmt.format(Number(value || 0))
}

export const fmtINR = createNumberFormatter({ currency: 'INR', maximumFractionDigits: 0 })

// Animation config — on first mount only, off for reduced motion
export function getAnimationConfig({ enabled = true, duration = 400 } = {}) {
  const reduce = prefersReducedMotion()
  if (reduce || !enabled) return { isAnimationActive: false }
  return { isAnimationActive: true, animationDuration: duration, animationEasing: 'easeOut' }
}

// Accessible text summary — generates a visually-hidden table for screen readers
export function createChartA11ySummary({ data, xKey, series, formatter = fmtINR }) {
  if (!data?.length || !series?.length) return null
  const rows = data.map(d => ({
    label: d[xKey],
    values: series.map(s => ({ name: s.name, value: formatter(d[s.key]) })),
  }))
  return (
    <table className="chart-a11y" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
      <caption style={{ display: 'none' }}>Chart data</caption>
      <thead>
        <tr>
          <th>{xKey}</th>
          {series.map(s => <th key={s.key}>{s.name}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td>{r.label}</td>
            {r.values.map(v => <td key={v.name}>{v.value}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Chart container wrapper — applies consistent defaults
export const CHART_CONTAINER_DEFAULTS = {
  margin: { top: 8, right: 8, bottom: 0, left: 0 },
}