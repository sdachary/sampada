import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Button, Card, Progress, Badge, EmptyState, PageHeader, Stat, Select } from '../components/ui'
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
    <div style={{ display: 'grid', gap: 12 }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, marginBottom: 10, borderRadius: 'var(--radius-md)' }} />)}
    </div>
  )

  const onTrack = budgets.filter(b => b.on_track).length
  const totalBudget = budgets.reduce((s, b) => s + (+b.monthly_limit || 0), 0)
  const totalSpent = budgets.reduce((s, b) => s + (+b.spent || 0), 0)

  const renderContent = () => {
    if (budgets.length === 0) {
      return (
        <EmptyState
          icon={<span aria-hidden="true" style={{ fontSize: 48, color: 'var(--border)' }}>□</span>}
          title="No budgets set yet"
          action="+ Add Budget"
          onAction={() => setModal('new')}
        >
          Create a budget to track spending by category.
        </EmptyState>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{b.category_name || `Category #${b.budget_category_id}`}</span>
                  <span style={{ fontSize: 18 }}>✉</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: 'var(--muted)' }}>Limit</span>
                  <span className="fin" style={{ fontSize: 14, fontWeight: 600 }}>{fmtINR(+b.monthly_limit || 0)}</span>
                </div>
                <Progress value={Math.min(pct, 100)} variant={over ? 'danger' : undefined} />
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
      <div style={{ display: 'grid', gap: 8 }}>
        {budgets.map(b => {
          const pct = +b.usage_pct || 0
          const over = pct > 100
          return (
            <Card key={b.id} style={{ padding: '16px 18px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{b.category_name || `Category #${b.budget_category_id}`}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--muted)' }}>{b.period || 'monthly'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="fin" style={{ fontSize: 15, fontWeight: 600 }}>{fmtINR(+b.monthly_limit || 0)}</p>
                  <p className="fin" style={{ fontSize: 12, color: over ? 'var(--danger)' : 'var(--muted)' }}>{fmtINR(+b.spent || 0)} spent</p>
                </div>
              </div>
              <Progress value={Math.min(pct, 100)} variant={over ? 'danger' : 'success'} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--faint)' }}>
                <span>{pct.toFixed(0)}% used</span>
                <span>{b.on_track ? <span style={{ color: 'var(--success)' }}>on track</span> : <span style={{ color: 'var(--danger)' }}>over budget</span>}</span>
                <span>{fmtINR(+b.remaining || 0)} left</span>
              </div>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHeader
        title="Budgets"
        num="007 / 016"
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Select value={view} onChange={e => setView(e.target.value)} style={{ minWidth: 120 }}>
              <option value="envelope">Envelopes</option>
              <option value="list">List</option>
            </Select>
            <Button onClick={() => setModal('new')}>+ Add Budget</Button>
          </div>
        }
      >
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Set limits and stay on track.</p>
      </PageHeader>

      <Card>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total Budget</span>
            <p className="fin" style={{ fontSize: 16, fontWeight: 600 }}>{fmtINR(totalBudget)}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Spent</span>
            <p className="fin" style={{ fontSize: 16, fontWeight: 600, color: 'var(--danger)' }}>{fmtINR(totalSpent)}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>On Track</span>
            <p className="fin" style={{ fontSize: 16, fontWeight: 600, color: 'var(--success)' }}>{onTrack}/{budgets.length}</p>
          </div>
        </div>
        <Progress value={Math.min((totalSpent / (totalBudget || 1)) * 100, 100)} variant={totalSpent <= totalBudget ? 'success' : 'danger'} />
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