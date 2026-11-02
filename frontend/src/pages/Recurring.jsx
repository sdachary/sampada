import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Card, Badge, Skeleton, EmptyState, PageHeader, Stat, fmtINR } from '../components/ui'

function daysText(days) {
  if (days === null || days === undefined) return ''
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) > 1 ? 's' : ''} overdue`
  return `${days} day${days > 1 ? 's' : ''} away`
}

export default function Recurring() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.request('/api/v1/recurring_expenses').then(d => setExpenses(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'grid', gap: 8 }}>
      {[1,2,3].map(i => <Skeleton key={i} style={{ height: 86, borderRadius: 'var(--radius-md)' }} />)}
    </div>
  )

  const totalMonthly = expenses.reduce((s, e) => s + (+e.monthly_amount || 0), 0)
  const activeCount = expenses.filter(e => e.active).length

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHeader
        title="Recurring Expenses"
        num="008 / 016"
      >
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Subscriptions, EMIs, and regular bills.</p>
      </PageHeader>

      {expenses.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))', gap: 12 }}>
          <Stat label="Monthly Total" value={fmtINR(totalMonthly)} />
          <Stat label="Active" value={`${activeCount}/${expenses.length}`} />
        </div>
      )}

      {expenses.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true" style={{ fontSize: 48, color: 'var(--border)' }}>↻</span>}
          title="No recurring expenses"
        >
          Add your monthly subscriptions and bills so you never miss a payment.
        </EmptyState>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {expenses.map(e => (
            <Card key={e.id} style={{ padding: '14px 18px', opacity: e.active ? 1 : 0.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{e.name}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                    {e.frequency} · {e.category}
                    {e.auto_debit && <span> · auto-debit</span>}
                  </p>
                </div>
                <p className="fin" style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>{fmtINR(+e.amount)}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5 }}>
                <Badge variant={e.active ? 'success' : 'neutral'}>
                  {e.active ? 'active' : 'inactive'}
                </Badge>
                {e.next_due_date && (
                  <span style={{ color: 'var(--faint)' }}>
                    {e.next_due_date} · {daysText(e.next_due_days)}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}