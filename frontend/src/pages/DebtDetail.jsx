import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Card, Progress, Button, Skeleton, EmptyState, PageHeader, Badge, Input, InputField } from '../components/ui'
import Chart from '../components/Chart'
import { fmtINR } from '../lib/amounts'
import { AlertCircle, ArrowLeft, ExternalLink } from 'lucide-react'
import { Reveal } from '../lib/motion-primitives'

const CATEGORIES = ['credit_card', 'loan', 'personal', 'mortgage', 'education', 'other']
const STATUSES = ['active', 'paid_default', 'paid_off', 'frozen']

function useDebt(id) {
  const [debt, setDebt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const d = await api.request(`/api/v1/debts/${id}`)
      setDebt(d)
    } catch {} finally { setLoading(false) }
  }, [id])

  const patch = useCallback(async (updates) => {
    setSaving(true)
    try {
      const d = await api.request(`/api/v1/debts/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
      setDebt(d)
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  return { debt, loading, saving, patch, refetch: fetch }
}

function InlineField({ label, value, type = 'text', options, onSave, currency }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  const display = () => {
    if (currency) return fmtINR(+value || 0)
    if (options) return options.find(o => o[0] === value)?.[1] ?? value
    return value ?? '—'
  }

  const handleSave = () => {
    const v = type === 'number' ? (parseFloat(draft) || 0) : draft
    onSave(v)
    setEditing(false)
  }

  const handleKey = (e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false) } }

  if (editing) {
    return (
      <InputField
        label={label}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKey}
        type={type === 'number' ? 'number' : type}
        inputProps={{ min: 0, step: type === 'number' ? '0.01' : undefined, autoFocus: true }}
      />
    )
  }

  return (
    <div onClick={() => { setDraft(value ?? ''); setEditing(true) }} className="cursor-pointer min-h-[44px]">
      <div className="text-2xs font-semibold uppercase tracking-wider text-muted mb-1">{label}</div>
      <div className={`font-medium ${currency ? 'fin font-display' : ''}`}>{display()}</div>
    </div>
  )
}

export default function DebtDetail() {
  const { id } = useParams()
  const { debt, loading, saving, patch } = useDebt(id)

  if (loading) return (
    <div className="space-y-3">
      <Skeleton className="skeleton-title w-20" />
      <Skeleton className="skeleton-title w-48" />
      <Skeleton className="skeleton-text w-32" />
      <Skeleton className="skeleton-card h-48" />
      <Skeleton className="skeleton-card h-48" />
    </div>
  )

  if (!debt) return (
    <EmptyState
      icon={<AlertCircle size={32} />}
      title="Debt not found"
      action="Back to debts"
      onAction={() => window.location.href = '/dashboard/debts'}
    />
  )

  const pct = debt.amount > 0 ? Math.min(Math.round((debt.paid_amount / debt.amount) * 100), 100) : 0
  const remaining = Math.max(debt.amount - debt.paid_amount, 0)

  // synthetic timeline from paid_amount
  const timeline = []
  if (debt.paid_amount > 0 && debt.emi_amount > 0) {
    const start = debt.started_at ? new Date(debt.started_at) : new Date(debt.created_at || Date.now())
    let paidRemaining = debt.paid_amount
    let runningRemaining = debt.amount
    let month = 0
    while (paidRemaining > 0.01 && month < 120) {
      const amt = Math.min(debt.emi_amount, paidRemaining)
      const d = new Date(start)
      d.setMonth(d.getMonth() + month)
      runningRemaining -= amt
      paidRemaining -= amt
      timeline.push({ date: d, amount: amt, remaining: Math.max(runningRemaining, 0) })
      month++
    }
  }

  return (
    <div className="space-y-5">
      <Reveal delay={0}>
        <PageHeader
          title="Debt Detail"
          num="005 / 016"
          action={
            <div className="flex gap-2">
              {saving && <span className="text-xs text-muted self-center">Saving…</span>}
              <Link to={`/dashboard/debt-payoffs?debtId=${debt.id}`}>
                <Button variant="ghost" size="sm">Open in Simulator</Button>
              </Link>
            </div>
          }
        />
      </Reveal>

      <Reveal delay={50}>
        {/* header card */}
        <Card className="card-shell card-shell--elevated card-core--pad-lg">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h1 className="font-display text-xl lg:text-2xl font-semibold tracking-tight mb-1">{debt.name}</h1>
              <p className="text-sm text-muted">
                {debt.category ? debt.category.charAt(0).toUpperCase() + debt.category.slice(1) : 'Loan'}
                {debt.interest_rate ? ` · ${debt.interest_rate}% APR` : ''}
                {debt.currency_symbol ? ` · ${debt.currency_code || 'INR'}` : ''}
              </p>
            </div>
            <Badge variant={debt.status === 'active' ? 'accent' : debt.status === 'paid_off' ? 'success' : 'neutral'}>
              {debt.status.replace('_', ' ')}
            </Badge>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-3">
            <div>
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted">Total</span>
              <p className="fin font-display text-xl font-bold">{fmtINR(debt.amount)}</p>
            </div>
            <div>
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted">Paid</span>
              <p className="fin font-display text-xl font-bold text-success">{fmtINR(debt.paid_amount)}</p>
            </div>
            <div>
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted">Remaining</span>
              <p className="fin font-display text-xl font-bold text-accent">{fmtINR(Math.round(remaining))}</p>
            </div>
          </div>

          <Progress value={pct} variant={pct >= 100 ? 'success' : 'accent'} label="Debt paid off" />
          <div className="flex justify-between text-sm text-muted mt-2">
            <span className="fin">{pct}% paid off</span>
            {debt.debt_free_date && <span className="fin">Debt free by {new Date(debt.debt_free_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} ({debt.months_remaining} mo)</span>}
          </div>
        </Card>
      </Reveal>

      <Reveal delay={100}>
        {/* detail fields */}
        <Card className="card-shell card-core--pad-lg">
          <p className="text-sm font-semibold text-ink mb-3">Details <span className="font-normal text-muted">— click to edit</span></p>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <InlineField label="Amount" value={debt.amount} type="number" currency onSave={v => patch({ amount: v })} />
            <InlineField label="EMI (₹/mo)" value={debt.emi_amount} type="number" currency onSave={v => patch({ emi_amount: v || null })} />
            <InlineField label="Interest Rate" value={debt.interest_rate} type="number" onSave={v => patch({ interest_rate: v || null })} />
            <InlineField label="Paid Amount" value={debt.paid_amount} type="number" currency onSave={v => patch({ paid_amount: v })} />
            <InlineField label="Started" value={debt.started_at} type="date" onSave={v => patch({ started_at: v || null })} />
            <InlineField label="Category" value={debt.category} options={CATEGORIES.map(c => [c, c.charAt(0).toUpperCase() + c.slice(1)])} onSave={v => patch({ category: v })} />
            <InlineField label="Status" value={debt.status} options={STATUSES.map(s => [s, s.replace('_', ' ')])} onSave={v => patch({ status: v })} />
            <InlineField label="Due Date" value={debt.due_date} type="date" onSave={v => patch({ due_date: v || null })} />
          </div>

          <div className="mt-4">
            <InlineField label="Notes" value={debt.notes} type="text" onSave={v => patch({ notes: v || null })} />
          </div>
        </Card>
      </Reveal>

      <Reveal delay={150}>
        {/* payment timeline */}
        <Card className="card-shell card-core--pad-lg">
          <p className="text-sm font-semibold text-ink mb-3">Payment Timeline</p>
          {timeline.length === 0 ? (
            <EmptyState
              icon={<AlertCircle size={32} />}
              title="No payment history yet"
              action="Add payment"
              onAction={() => patch({ paid_amount: debt.paid_amount + (debt.emi_amount || 0) })}
            >
              Update the paid amount to track your progress.
            </EmptyState>
          ) : (
            <div className="space-y-0">
              {timeline.map((t, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border-soft last:border-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${i === timeline.length - 1 && t.remaining <= 0 ? 'bg-success' : 'bg-accent'}`} />
                  <span className="w-20 text-xs text-muted shrink-0">
                    {t.date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </span>
                  <span className="fin w-20 text-sm font-medium shrink-0">
                    {fmtINR(t.amount)}
                  </span>
                  <span className="fin text-sm text-muted text-right flex-1">
                    Remaining: {fmtINR(Math.round(t.remaining))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Reveal>
    </div>
  )
}