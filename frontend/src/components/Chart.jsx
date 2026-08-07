import { ResponsiveContainer, LineChart as RLineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`

export default function Chart({ data, xKey, series, height = 180, yFormatter = fmt, xFormatter, ticks }) {
  if (!data?.length) return null
  const lines = series.map(s => (
    <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color}
      strokeWidth={1.5} dot={false} isAnimationActive={false} />
  ))
  const axes = (
    <>
      <CartesianGrid stroke="var(--line)" strokeDasharray="2 2" vertical={false} />
      <XAxis dataKey={xKey} tick={{ fill: 'var(--ink-faint)', fontSize: 9 }} tickLine={false}
        axisLine={false} interval={ticks ? 'preserveStartEnd' : 4}
        ticks={ticks} tickFormatter={xFormatter} minTickGap={24} />
      <YAxis tick={{ fill: 'var(--ink-faint)', fontSize: 9 }} tickLine={false} axisLine={false}
        tickFormatter={yFormatter} width={52} />
      <Tooltip formatter={(v) => [yFormatter(v)]} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12 }} />
    </>
  )

  return (
    <ResponsiveContainer width="100%" height={height}>
      {series.length === 1 && series[0].area ? (
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          {axes}
          <defs>
            <linearGradient id={`grad-${series[0].key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={series[0].color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={series[0].color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey={series[0].key} name={series[0].name} stroke={series[0].color}
            strokeWidth={2} fill={`url(#grad-${series[0].key})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      ) : (
        <RLineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          {axes}
          {lines}
        </RLineChart>
      )}
    </ResponsiveContainer>
  )
}
