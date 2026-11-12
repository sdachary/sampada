import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Button, Card, Progress, Badge, EmptyState, PageHeader, Stat, Select } from '../components/ui'
import { fmtINR } from '../lib/amounts'
import BudgetFormModal from '../components/BudgetFormModal'
import { Reveal } from '../lib/motion-primitives'

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
    <div className="space-y-3">
      {[1,2,3].map(i => <div key={i} className="skeleton-card" />)}
    </div>
  )

  const onTrack = budgets.filter(b => b.on_track).length
  const totalBudget = budgets.reduce((s, b) => s + (+b.monthly_limit || 0), 0)
  const totalSpent = budgets.reduce((s, b) => s + (+b.spent || 0), 0)

  const renderContent = () => {
    if (budgets.length === 0) {
      return (
        <EmptyState
          icon={<span aria-hidden="true" className="text-5xl text-border">□</span>}
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
        <Reveal delay={0}>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {budgets.map((b, i) => {
              const pct = +b.usage_pct || 0
              const over = pct > 100
              const color = ENVELOPE_COLORS[i % ENVELOPE_COLORS.length]
              return (
                <Card key={b.id} className="card-shell card-shell--interactive card-core--pad-base flex flex-col gap-2" style={{ borderTopColor: color }}>
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-base truncate">{b.category_name || `Category #${b.budget_category_id}`}</span>
                    <span className="text-2xl">✉</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Limit</span>
                    <span className="fin text-base font-semibold">{fmtINR(+b.monthly_limit || 0)}</span>
                  </div>
                  <Progress value={Math.min(pct, 100)} variant={over ? 'danger' : undefined} />
                  <div className="flex justify-between text-xs text-faint">
                    <span>{fmtINR(+b.spent || 0)}</span>
                    <span className={`font-medium ${over ? 'text-danger' : 'text-success'}`}>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="text-[10px] text-faint text-center py-1 border-t border-border-soft">
                    {over ? '⚠ Over budget' : b.on_track ? '✓ On track' : '⚠ Nearing limit'}
                  </div>
                </Card>
              )
            })}
          </div>
        </Reveal>
      )
    }

    return (
      <Reveal delay={0}>
        <div className="space-y-2">
          {budgets.map(b => {
            const pct = +b.usage_pct || 0
            const over = pct > 100
            return (
              <Card key={b.id} className="card-shell card-core--pad-base">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-base font-medium text-ink">{b.category_name || `Category #${b.budget_category_id}`}</p>
                    <p className="text-xs text-muted">{b.period || 'monthly'}</p>
                  </div>
                  <div className="text-right">
                    <p className="fin text-lg font-semibold">{fmtINR(+b.monthly_limit || 0)}</p>
                    <p className="fin text-sm">{fmtINR(+b.spent || 0)} spent</p>
                  </div>
                </div>
                <Progress value={Math.min(pct, 100)} variant={over ? 'danger' : 'success'} />
                <div className="flex justify-between text-xs text-faint mt-1">
                  <span>{pct.toFixed(0)}% used</span>
                  <span>{b.on_track ? <span className="text-success">on track</span> : <span className="text-danger">over budget</span>}</span>
                  <span>{fmtINR(+b.remaining || 0)} left</span>
                </div>
              </Card>
            )
          })}
        </div>
      </Reveal>
    )
  }

  return (
    <div className="space-y-5">
      <Reveal delay={0}>
        <PageHeader
          title="Budgets"
          num="007 / 016"
          action={
            <div className="flex gap-2 items-center">
              <Select value={view} onChange={e => setView(e.target.value)} className="min-w-[120px]">
                <option value="envelope">Envelopes</option>
                <option value="list">List</option>
              </Select>
              <Button onClick={() => setModal('new')}>+ Add Budget</Button>
            </div>
          }
        >
          <p className="text-sm text-muted">Set limits and stay on track.</p>
        </PageHeader>
      </Reveal>

      <Reveal delay={50}>
        <Card className="card-shell card-core--pad-lg">
          <div className="flex gap-4 flex-wrap items-center mb-2">
            <div className="flex flex-col gap-1">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted">Total Budget</span>
              <p className="fin text-lg font-semibold">{fmtINR(totalBudget)}</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted">Spent</span>
              <p className="fin text-lg font-semibold text-danger">{fmtINR(totalSpent)}</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted">On Track</span>
              <p className="fin text-lg font-semibold text-success">{onTrack}/{budgets.length}</p>
            </div>
          </div>
          <Progress value={Math.min((totalSpent / (totalBudget || 1)) * 100, 100)} variant={totalSpent <= totalBudget ? 'success' : 'danger'} />
        </Card>
      </Reveal>

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