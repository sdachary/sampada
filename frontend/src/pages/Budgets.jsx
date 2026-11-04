import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Button, Card, Skeleton, EmptyState, PageHeader, Stat } from '../components/ui'
import { fmtINR } from '../lib/amounts'
import BudgetFormModal from '../components/BudgetFormModal'

const ENVELOPE_COLORS = ['var(--danger)', 'var(--warning)', 'var(--accent)', 'var(--success)', 'var(--success)', 'var(--accent)', 'var(--accent)', 'var(--accent)', 'var(--danger)', 'var(--danger)']

export default function Budgets() {
  const [budgets, setBudgets] = useState([])
  const [view, setView] = useState('envelope')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  useEffect(() => {
    api.request('/api/v1/budgets/overview').then(d => setBudgets(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const closeModal = (saved) => {
    if (saved) {
      api.request('/api/v1/budgets/overview').then(d => setBudgets(Array.isArray(d) ? d : []))
    }
    setModal(null)
  }

  if (loading) return (
    <div>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, marginBottom: 10, borderRadius: 'var(--radius)' }} />)}
    </div>
  )

  const onTrack = budgets.filter(b => b.on_track).length
  const totalBudget = budgets.reduce((s, b) => s + (+b.monthly_limit || 0), 0)
  const totalSpent = budgets.reduce((s, b) => s + (+b.spent || 0), 0)

  const renderContent = () => {
    if (budgets.length === 0) {
      return (
        <div className="empty-state">
          <span className="emoji">□</span>
          <p>No budgets set yet</p>
          <p className="text-12-faint" >Create a budget to track spending by category.</p>
          <Button variant="primary" onClick={() => setModal('new')} style={{ marginTop: 16 }}>+ Add Budget</Button>
        </div>
      )
    }

    if (view === 'envelope') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {budgets.map((b, i) => {
            const pct = +b.usage_pct || 0
            const over = pct > 100
            const color = ENVELOPE_COLORS[i % ENVELOPE_COLORS.length]
            return (
              <Card key={b.id} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: `3px solid ${color}` }}>
                <div className="spread" >
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{b.category_name || `Category #${b.budget_category_id}`}</span>
                  <span className="fs-18" >✉</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span className="text-mute" >Limit</span>
                  <span className="fin h-600-14" >{fmtINR(+b.monthly_limit || 0)}</span>
                </div>
                <div className="progress" style={{ height: 10, background: 'var(--border-soft)' }}>
                  <div className={`progress-fill${over ? '' : ' green'}`} style={{ width: `${Math.min(pct, 100)}%`, background: over ? 'var(--danger)' : color }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--faint)' }}>
                  <span>{fmtINR(+b.spent || 0)}</span>
                  <span style={{ color: over ? 'var(--danger)' : 'var(--success)', fontWeight: 500 }}>{pct.toFixed(0)}%</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--faint)', textAlign: 'center', padding: '2px 0', borderTop: '1px solid var(--border-soft)' }}>
                  {over ? '⚠ Over budget' : b.on_track ? '✓ On track' : '⚠ Nearing limit'}
                </div>
              </Card>
            )
          })}
        </div>
      )
    }

    return (
      budgets.map(b => {
        const pct = +b.usage_pct || 0
        const over = pct > 100
        return (
          <Card key={b.id} style={{ padding: '16px 18px', marginBottom: 8 }}>
            <div className="spread-top-mb8" >
              <div>
                <p className="row-600-14" >{b.category_name || `Category #${b.budget_category_id}`}</p>
                <p className="text-11-5-muted" >{b.period || 'monthly'}</p>
              </div>
              <div className="table-cell-num-plain" >
                <p className="fin h-600-15" >{fmtINR(+b.monthly_limit || 0)}</p>
                <p className="fin" style={{ fontSize: 12, color: over ? 'var(--danger)' : 'var(--muted)' }}>{fmtINR(+b.spent || 0)} spent</p>
              </div>
            </div>
            <div className="progress" style={{ height: 6, marginBottom: 6 }}>
              <div className={`progress-fill${over ? '' : ' green'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--faint)' }}>
              <span>{pct.toFixed(0)}% used</span>
              <span>{b.on_track ? <span style={{ color: 'var(--success)' }}>on track</span> : <span className="text-danger" >over budget</span>}</span>
              <span>{fmtINR(+b.remaining || 0)} left</span>
            </div>
          </Card>
        )
      })
    )
  }

  return (
    <div>
      <p className="page-num mb-4" >00<em>7</em> / 016</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <h1 className="page-title-no-mb" >Budgets</h1>
        <div style={{ display: 'flex', gap: 4 }}>
          <Button variant={view === 'envelope' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('envelope')}>Envelopes</Button>
          <Button variant={view === 'list' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('list')}>List</Button>
          <Button variant="primary" size="sm" onClick={() => setModal('new')}>+ Add Budget</Button>
        </div>
      </div>
      <p className="text-13-5-muted-sm" >Set limits and stay on track.</p>

      <Card>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="label-caps-sm" >Total Budget</span>
            <p className="fin h-600-16" >{fmtINR(totalBudget)}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="label-caps-sm" >Spent</span>
            <p className="fin amt-out" >{fmtINR(totalSpent)}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="label-caps-sm" >On Track</span>
            <p className="amt-in" >{onTrack}/{budgets.length}</p>
          </div>
        </div>
        <div className="progress" style={{ height: 8, marginTop: 10 }}>
          <div className={`progress-fill${totalSpent <= totalBudget ? ' green' : ''}`} style={{ width: `${Math.min((totalSpent / (totalBudget || 1)) * 100, 100)}%` }} />
        </div>
      </Card>

      {renderContent()}

      {modal && (
        <BudgetFormModal
          budget={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => closeModal(true)}
        />
      )}
    </div>
  )
}