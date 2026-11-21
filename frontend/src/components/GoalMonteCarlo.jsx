// Probability bands for a goal, from the Worker's Monte Carlo simulation.
import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../lib/api'
import { Badge, Skeleton } from './ui'
import { AXIS_DEFAULTS, GRID_DEFAULTS, ChartTooltip } from '../lib/chartTheme'

export default function GoalMonteCarlo({ goalId }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    api.request(`/api/v1/goals/${goalId}/monte_carlo`).then(setData).catch(() => {})
  }, [goalId])

  if (!data) return <Skeleton className="skeleton-card h-44 mt-4" />
  if (!data.years?.length) return null

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-muted">Possible outcomes ({data.runs} simulations)</p>
        <Badge variant={data.probability >= 70 ? 'success' : 'neutral'}>
          {data.probability}% chance of target
        </Badge>
      </div>
      <div role="img" aria-label={`Monte Carlo projection: ${data.probability}% chance of reaching the goal`}>
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={data.years} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_DEFAULTS} strokeDasharray="3 3" />
            <XAxis dataKey="year" {...AXIS_DEFAULTS.tick} />
            <YAxis {...AXIS_DEFAULTS.tick} tickFormatter={v => `₹${Math.round(v / 100000)}L`} width={52} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="p10" stroke="var(--warning)" strokeDasharray="4 4" dot={false} name="Low (p10)" strokeWidth={1.5} />
            <Line type="monotone" dataKey="p50" stroke="var(--accent)" dot={false} name="Median" strokeWidth={2.5} />
            <Line type="monotone" dataKey="p90" stroke="var(--success)" strokeDasharray="4 4" dot={false} name="High (p90)" strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
