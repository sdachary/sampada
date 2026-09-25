import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const ENVELOPE_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#06b6d4','#6366f1','#a855f7','#ec4899','#f43f5e']

export default function Budgets() {
  const [budgets, setBudgets] = useState([])
  const [view, setView] = useState('envelope')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.request('/api/v1/budgets/overview').then(d => setBudgets(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, marginBottom: 10, borderRadius: 'var(--radius)' }} />)}
    </div>
  )

  const onTrack = budgets.filter(b => b.on_track).length
  const totalBudget = budgets.reduce((s, b) => s + (+b.monthly_limit || 0), 0)
  const totalSpent = budgets.reduce((s, b) => s + (+b.spent || 0), 0)

  return (
    <div>
      <p className="page-num mb-4" >00<em>7</em> / 016</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <h1 className="page-title-no-mb" >Budgets</h1>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setView('envelope')} style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, border: '1px solid var(--line)', background: view === 'envelope' ? 'var(--coral)' : 'transparent', color: view === 'envelope' ? '#fff' : 'var(--ink)', cursor: 'pointer' }}>Envelopes</button>
          <button onClick={() => setView('list')} style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, border: '1px solid var(--line)', background: view === 'list' ? 'var(--coral)' : 'transparent', color: view === 'list' ? '#fff' : 'var(--ink)', cursor: 'pointer' }}>List</button>
        </div>
      </div>
      <p className="text-13-5-muted-sm" >Set limits and stay on track.</p>

      <div className="card card-pad-mb16" >
        <div className="flex-g20-wrap" >
          <div><span className="label-caps-sm" >Total Budget</span>
            <p className="fin h-600-16" >₹{totalBudget.toLocaleString('en-IN')}</p></div>
          <div><span className="label-caps-sm" >Spent</span>
            <p className="fin amt-out" >₹{totalSpent.toLocaleString('en-IN')}</p></div>
          <div><span className="label-caps-sm" >On Track</span>
            <p className="amt-in" >{onTrack}/{budgets.length}</p></div>
        </div>
        <div className="progress" style={{ height: 8, marginTop: 10 }}>
          <div className={`progress-fill${totalSpent <= totalBudget ? ' green' : ''}`} style={{ width: `${Math.min((totalSpent / (totalBudget || 1)) * 100, 100)}%` }} />
        </div>
      </div>

      {budgets.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">□</span>
          <p>No budgets set yet</p>
          <p className="text-12-faint" >Create a budget to track spending by category.</p>
        </div>
      ) : view === 'envelope' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {budgets.map((b, i) => {
            const pct = +b.usage_pct || 0
            const over = pct > 100
            const color = ENVELOPE_COLORS[i % ENVELOPE_COLORS.length]
            return (
              <div key={b.id} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: `3px solid ${color}` }}>
                <div className="spread" >
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{b.category_name || `Category #${b.budget_category_id}`}</span>
                  <span className="fs-18" >✉</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span className="text-mute" >Limit</span>
                  <span className="fin h-600-14" >₹{(+b.monthly_limit || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="progress" style={{ height: 10, background: 'rgba(0,0,0,0.06)' }}>
                  <div className={`progress-fill${over ? '' : ' green'}`} style={{ width: `${Math.min(pct, 100)}%`, background: over ? 'var(--coral)' : color }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-faint)' }}>
                  <span>₹{(+b.spent || 0).toLocaleString('en-IN')}</span>
                  <span style={{ color: over ? 'var(--coral)' : 'var(--emerald)', fontWeight: 500 }}>{pct.toFixed(0)}%</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink-faint)', textAlign: 'center', padding: '2px 0', borderTop: '1px solid var(--line-soft)' }}>
                  {over ? '⚠ Over budget' : b.on_track ? '✓ On track' : '⚠ Nearing limit'}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        budgets.map(b => {
          const pct = +b.usage_pct || 0
          const over = pct > 100
          return (
            <div key={b.id} className="card" style={{ padding: '16px 18px', marginBottom: 8 }}>
              <div className="spread-top-mb8" >
                <div>
                  <p className="row-600-14" >{b.category_name || `Category #${b.budget_category_id}`}</p>
                  <p className="text-11-5-muted" >{b.period || 'monthly'}</p>
                </div>
                <div className="table-cell-num-plain" >
                  <p className="fin h-600-15" >₹{(+b.monthly_limit || 0).toLocaleString('en-IN')}</p>
                  <p className="fin" style={{ fontSize: 12, color: over ? 'var(--coral)' : 'var(--ink-mute)' }}>₹{(+b.spent || 0).toLocaleString('en-IN')} spent</p>
                </div>
              </div>
              <div className="progress" style={{ height: 6, marginBottom: 6 }}>
                <div className={`progress-fill${over ? '' : ' green'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-faint)' }}>
                <span>{pct.toFixed(0)}% used</span>
                <span>{b.on_track ? <span style={{ color: 'var(--emerald)' }}>on track</span> : <span className="text-coral" >over budget</span>}</span>
                <span>₹{(+b.remaining || 0).toLocaleString('en-IN')} left</span>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
