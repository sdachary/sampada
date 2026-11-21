import { ResponsiveContainer, LineChart as RLineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import {
  AXIS_DEFAULTS, GRID_DEFAULTS, SERIES_COLORS,
  getAnimationConfig, createChartA11ySummary, CHART_CONTAINER_DEFAULTS,
} from '../lib/chartTheme'

// Dash patterns make series distinguishable without relying on color.
const DASH = ['none', '6 4', '2 3', '8 3 2 3', '10 4']

export default function Chart({ data, xKey, series, height = 180, animate = false }) {
  if (!data?.length) return null

  const coloredSeries = series.map((s, i) => ({
    ...s,
    color: s.color || SERIES_COLORS[i % SERIES_COLORS.length],
    dash: s.dash || DASH[i % DASH.length],
  }))

  const animation = getAnimationConfig({ enabled: animate })

  const lines = coloredSeries.map(s => (
    <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color}
      strokeWidth={1.5} strokeDasharray={s.dash} dot={false} {...animation} />
  ))

  const axes = (
    <>
      <CartesianGrid {...GRID_DEFAULTS} />
      <XAxis dataKey={xKey} {...AXIS_DEFAULTS.tick} tickLine={AXIS_DEFAULTS.tickLine}
        axisLine={AXIS_DEFAULTS.axisLine} interval={4} minTickGap={24} />
      <YAxis {...AXIS_DEFAULTS.tick} tickLine={AXIS_DEFAULTS.tickLine}
        axisLine={AXIS_DEFAULTS.axisLine} width={52} />
      <Tooltip content={<ChartTooltip />} />
    </>
  )

  return (
    <>
      {createChartA11ySummary({ data, xKey, series: coloredSeries })}
      {coloredSeries.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted" aria-hidden="true">
          {coloredSeries.map(s => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <svg width="18" height="2" aria-hidden="true">
                <line x1="0" y1="1" x2="18" y2="1" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash} />
              </svg>
              {s.name}
            </span>
          ))}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        {coloredSeries.length === 1 && coloredSeries[0].area ? (
          <AreaChart data={data} {...CHART_CONTAINER_DEFAULTS}>
            {axes}
            <defs>
              <linearGradient id={`grad-${coloredSeries[0].key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={coloredSeries[0].color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={coloredSeries[0].color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey={coloredSeries[0].key} name={coloredSeries[0].name}
              stroke={coloredSeries[0].color} strokeWidth={2}
              fill={`url(#grad-${coloredSeries[0].key})`} dot={false} {...animation} />
          </AreaChart>
        ) : (
          <RLineChart data={data} {...CHART_CONTAINER_DEFAULTS}>
            {axes}
            {lines}
          </RLineChart>
        )}
      </ResponsiveContainer>
    </>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
      padding: '8px 12px', fontSize: 12, fontVariantNumeric: 'tabular-nums',
      boxShadow: 'var(--shadow-modal)', minWidth: 140,
    }}>
      <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      {payload.map(entry => (
        <p key={entry.dataKey} style={{ margin: '2px 0', color: 'var(--ink)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span>{entry.name}</span>
          <span style={{ fontWeight: 600 }}>₹{Number(entry.value || 0).toLocaleString('en-IN')}</span>
        </p>
      ))}
    </div>
  )
}
