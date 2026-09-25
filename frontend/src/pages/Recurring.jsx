import { useState, useEffect } from 'react'
import { api } from '../lib/api'

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
    <div>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 86, marginBottom: 8, borderRadius: 'var(--radius)' }} />)}
    </div>
  )

  const totalMonthly = expenses.reduce((s, e) => s + (+e.monthly_amount || 0), 0)
  const activeCount = expenses.filter(e => e.active).length

  return (
    <div>
      <p className="page-num mb-4" >00<em>8</em> / 016</p>
      <h1 className="page-title" >Recurring Expenses</h1>
      <p className="text-13-5-muted-sm" >Subscriptions, EMIs, and regular bills.</p>

      {expenses.length > 0 && (
        <div className="card card-pad-mb16" >
          <div className="flex-g20-wrap" >
            <div><span className="label-caps-sm" >Monthly Total</span>
              <p className="fin amt-out" >₹{totalMonthly.toLocaleString('en-IN')}</p></div>
            <div><span className="label-caps-sm" >Active</span>
              <p className="amt-in" >{activeCount}/{expenses.length}</p></div>
          </div>
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">↻</span>
          <p>No recurring expenses</p>
          <p className="text-12-faint" >Add your monthly subscriptions and bills so you never miss a payment.</p>
        </div>
      ) : expenses.map(e => (
        <div key={e.id} className="card" style={{ padding: '14px 18px', marginBottom: 6, opacity: e.active ? 1 : 0.5 }}>
          <div className="spread-top-mb6" >
            <div>
              <p className="row-600-14" >{e.name}</p>
              <p className="text-11-5-muted" >
                {e.frequency} · {e.category}
                {e.auto_debit && <span> · auto-debit</span>}
              </p>
            </div>
            <p className="fin" style={{ fontFamily: 'var(--sans)', fontSize: 17, fontWeight: 600 }}>₹{(+e.amount).toLocaleString('en-IN')}</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5 }}>
            <span className="tag" style={{ background: e.active ? 'var(--emerald)' : 'var(--line)', color: e.active ? '#fff' : 'var(--ink-mute)' }}>
              {e.active ? 'active' : 'inactive'}
            </span>
            {e.next_due_date && (
              <span className="text-faint" >
                {e.next_due_date} · {daysText(e.next_due_days)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
