import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Card, Progress, Button, Skeleton, EmptyState, PageHeader, Badge, Input, InputField } from '../components/ui'
import Chart from '../components/Chart'
import { fmtINR } from '../lib/amounts'
import { AlertCircle, ArrowLeft, ExternalLink } from 'lucide-react'

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
    <div onClick={() => { setDraft(value ?? ''); setEditing(true) }} style={{ cursor: 'pointer' }}>
      <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500, fontFamily: currency ? 'var(--font-display)' : undefined, fontVariantNumeric: currency ? 'tabular-nums' : undefined }}>{display()}</div>
    </div>
  )
}

export default function DebtDetail() {
  const { id } = useParams()
  const { debt, loading, saving, patch } = useDebt(id)

  if (loading) return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Skeleton style={{ width: 80, height: 14 }} />
      <Skeleton style={{ width: 200, height: 24 }} />
      <Skeleton style={{ width: 140, height: 14 }} />
      <Skeleton style={{ height: 200 }} />
      <Skeleton style={{ height: 200 }} />
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
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHeader
        title="Debt Detail"
        num="005 / 016"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {saving && <span style={{ fontSize: 11, color: 'var(--muted)' }}>Saving…</span>}
            <Link to={`/dashboard/debt-payoffs?debtId=${debt.id}`}>
              <Button variant="ghost" size="sm">Open in Simulator</Button>
            </Link>
          </div>
        }
      />

      {/* header card */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>{debt.name}</h1>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              {debt.category ? debt.category.charAt(0).toUpperCase() + debt.category.slice(1) : 'Loan'}
              {debt.interest_rate ? ` · ${debt.interest_rate}% APR` : ''}
              {debt.currency_symbol ? ` · ${debt.currency_code || 'INR'}` : ''}
            </p>
          </div>
          <Badge variant={debt.status === 'active' ? 'accent' : debt.status === 'paid_off' ? 'success' : 'neutral'}>
            {debt.status.replace('_', ' ')}
          </Badge>
        </div>

        <div style={{ display: 'flex', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
          <div><span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Total</span><p className="fin" style={{ fontSize: 20, fontWeight: 700 }}>{fmtINR(debt.amount)}</p></div>
          <div><span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Paid</span><p className="fin" style={{ fontSize: 20, fontWeight: 700, color: 'var(--success)' }}>{fmtINR(debt.paid_amount)}</p></div>
          <div><span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Remaining</span><p className="fin" style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{fmtINR(Math.round(remaining))}</p></div>
        </div>

        <Progress value={pct} variant={pct >= 100 ? 'success' : 'accent'} label="Debt paid off" />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
          <span className="fin">{pct}% paid off</span>
          {debt.debt_free_date && <span className="fin">Debt free by {new Date(debt.debt_free_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} ({debt.months_remaining} mo)</span>}
        </div>
      </Card>

      {/* detail fields */}
      <Card>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 14 }}>Details <span style={{ fontWeight: 400, color: 'var(--muted)' }}>— click to edit</span></p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
          <InlineField label="Amount" value={debt.amount} type="number" currency onSave={v => patch({ amount: v })} />
          <InlineField label="EMI (₹/mo)" value={debt.emi_amount} type="number" currency onSave={v => patch({ emi_amount: v || null })} />
          <InlineField label="Interest Rate" value={debt.interest_rate} type="number" onSave={v => patch({ interest_rate: v || null })} />
          <InlineField label="Paid Amount" value={debt.paid_amount} type="number" currency onSave={v => patch({ paid_amount: v })} />
          <InlineField label="Started" value={debt.started_at} type="date" onSave={v => patch({ started_at: v || null })} />
          <InlineField label="Category" value={debt.category} options={CATEGORIES.map(c => [c, c.charAt(0).toUpperCase() + c.slice(1)])} onSave={v => patch({ category: v })} />
          <InlineField label="Status" value={debt.status} options={STATUSES.map(s => [s, s.replace('_', ' ')])} onSave={v => patch({ status: v })} />
          <InlineField label="Due Date" value={debt.due_date} type="date" onSave={v => patch({ due_date: v || null })} />
        </div>

        <div style={{ marginTop: 16 }}>
          <InlineField label="Notes" value={debt.notes} type="text" onSave={v => patch({ notes: v || null })} />
        </div>
      </Card>

      {/* payment timeline */}
      <Card>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 14 }}>Payment Timeline</p>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {timeline.map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                borderBottom: i < timeline.length - 1 ? '1px solid var(--border-soft)' : 'none',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: i === timeline.length - 1 && t.remaining <= 0 ? 'var(--success)' : 'var(--accent-soft)',
                }} />
                <span style={{ flex: '0 0 80px', fontSize: 12, color: 'var(--muted)' }}>
                  {t.date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
                <span className="fin" style={{ flex: '0 0 80px', fontSize: 13, fontWeight: 500 }}>
                  {fmtINR(t.amount)}
                </span>
                <span className="fin" style={{ flex: 1, fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>
                  Remaining: {fmtINR(Math.round(t.remaining))}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}