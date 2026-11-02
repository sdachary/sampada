import { ResponsiveContainer, LineChart as RLineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import {
  AXIS_DEFAULTS, GRID_DEFAULTS, SERIES_COLORS,
  getAnimationConfig, createChartA11ySummary, CHART_CONTAINER_DEFAULTS,
} from '../lib/chartTheme'

export default function Chart({ data, xKey, series, height = 180, animate = false, ...props }) {
  if (!data?.length) return null

  // Assign colors from theme if not provided
  const coloredSeries = series.map((s, i) => ({
    ...s,
    color: s.color || SERIES_COLORS[i % SERIES_COLORS.length],
  }))

  const animation = getAnimationConfig({ enabled: animate })

  const lines = coloredSeries.map(s => (
    <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color}
      strokeWidth={1.5} dot={false} {...animation} />
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
  const [entry] = payload
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
      padding: '8px 12px', fontSize: 12, fontVariantNumeric: 'tabular-nums',
      boxShadow: 'var(--shadow-modal)',
    }}>
      <p style={{ fontSize: 10, color: 'var(--muted)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ margin: 0, color: 'var(--ink)' }}>₹{Number(entry.value || 0).toLocaleString('en-IN')}</p>
    </div>
  )
}
