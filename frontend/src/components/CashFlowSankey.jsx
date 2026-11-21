// Monthly income -> spending -> categories, from the Worker's cash_flow report.
import { useEffect, useState } from 'react'
import { ResponsiveContainer, Sankey, Tooltip, Rectangle } from 'recharts'
import { api } from '../lib/api'
import { Skeleton } from './ui'

export default function CashFlowSankey() {
  const [report, setReport] = useState(null)
  useEffect(() => {
    api.request('/api/v1/reports/cash_flow').then(setReport).catch(() => {})
  }, [])

  if (!report) return <Skeleton className="skeleton-card h-64" />

  const expenses = report.expenses || []
  const spent = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const leftover = Math.max(0, report.net || 0)
  if (!spent && !leftover) {
    return <p className="text-sm text-muted py-8 text-center">No transactions logged this month yet.</p>
  }

  const nodes = [{ name: 'Income' }, { name: 'Spending' }, { name: 'Left over' }]
  expenses.forEach((e) => nodes.push({ name: e.category }))
  const links = []
  if (spent > 0) links.push({ source: 0, target: 1, value: spent })
  if (leftover > 0) links.push({ source: 0, target: 2, value: leftover })
  expenses.forEach((e, i) => {
    if (e.amount > 0) links.push({ source: 1, target: 3 + i, value: e.amount })
  })

  return (
    <div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm mb-2">
        <span className="text-muted">Income <strong className="text-ink fin ml-1">₹{Math.round(report.income || 0).toLocaleString('en-IN')}</strong></span>
        <span className="text-muted">Spent <strong className="text-ink fin ml-1">₹{Math.round(spent).toLocaleString('en-IN')}</strong></span>
        <span className="text-muted">Left over <strong className="text-ink fin ml-1">₹{Math.round(leftover).toLocaleString('en-IN')}</strong></span>
      </div>
      <div className="h-56" role="img" aria-label={`${report.month}: income ₹${Math.round(report.income || 0)}, spent ₹${Math.round(spent)}, left over ₹${Math.round(leftover)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <Sankey data={{ nodes, links }} nodePadding={14} nodeWidth={12} node={<Rectangle fill="var(--accent)" />} link={{ stroke: 'var(--accent)', strokeOpacity: 0.3 }}>
            <Tooltip formatter={(value) => `₹${Number(value || 0).toLocaleString('en-IN')}`} />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
