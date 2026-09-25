import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'

const CATEGORIES = ['credit_card', 'loan', 'personal', 'mortgage', 'education', 'other']
const STATUSES = ['active', 'paid_default', 'paid_off', 'frozen']
const INTL = { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }

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
    if (currency) return `₹${(+value || 0).toLocaleString('en-IN', INTL)}`
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
      <div>
        <div style={{ fontSize: 10, color: 'var(--ink-faint)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        {options ? (
          <select className="input" value={draft} onChange={e => setDraft(e.target.value)} onBlur={handleSave} onKeyDown={handleKey} autoFocus style={{ padding: '4px 8px', fontSize: 13 }}>
            {options.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        ) : (
          <input className="input" type={type === 'number' ? 'number' : 'text'} value={draft}
            onChange={e => setDraft(e.target.value)} onBlur={handleSave} onKeyDown={handleKey}
            autoFocus min={0} step={type === 'number' ? '0.01' : undefined}
            style={{ padding: '4px 8px', fontSize: 13 }} />
        )}
      </div>
    )
  }

  return (
    <div onClick={() => { setDraft(value ?? ''); setEditing(true) }} style={{ cursor: 'pointer' }}>
      <div style={{ fontSize: 10, color: 'var(--ink-faint)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500, fontFamily: currency ? 'var(--sans)' : undefined, fontVariantNumeric: currency ? 'tabular-nums' : undefined }}>{display()}</div>
    </div>
  )
}

export default function DebtDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { debt, loading, saving, patch } = useDebt(id)

  if (loading) return (
    <div>
      <div className="skeleton" style={{ width: 80, height: 14, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: 200, height: 24, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: 140, height: 14, marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 200, marginBottom: 10 }} />
      <div className="skeleton h-200"  />
    </div>
  )

  if (!debt) return (
    <div className="empty-state">
      <span className="emoji">○</span>
      <p>Debt not found</p>
      <Link to="/dashboard/debts" className="btn btn-ghost mt-12" >Back to debts</Link>
    </div>
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
    <div>
      <div className="spread-mb20" >
        <Link to="/dashboard/debts" style={{ fontSize: 12.5, color: 'var(--ink-mute)', display: 'flex', alignItems: 'center', gap: 4 }}>
          ← Back to Debts
        </Link>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saving && <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Saving…</span>}
          <Link to={`/dashboard/debt-payoffs?debtId=${debt.id}`} className="btn btn-ghost" style={{ fontSize: 11.5, padding: '6px 14px' }}>
            Open in Simulator
          </Link>
        </div>
      </div>

      {/* header */}
      <div className="card card-pad-lg card-pad-mb16" >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>{debt.name}</h1>
            <p className="text-13-muted" >
              {debt.category ? debt.category.charAt(0).toUpperCase() + debt.category.slice(1) : 'Loan'}
              {debt.interest_rate ? ` · ${debt.interest_rate}% APR` : ''}
              {debt.currency_symbol ? ` · ${debt.currency_code || 'INR'}` : ''}
            </p>
          </div>
          <span className={`tag ${debt.status === 'active' ? 'coral' : debt.status === 'paid_off' ? 'green' : ''}`}>
            {debt.status.replace('_', ' ')}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
          <div><span className="label-caps-sm" >Total</span><p className="fin" style={{ fontSize: 20, fontWeight: 700 }}>{debt.currency_symbol}₹{debt.amount.toLocaleString('en-IN', INTL)}</p></div>
          <div><span className="label-caps-sm" >Paid</span><p className="fin" style={{ fontSize: 20, fontWeight: 700, color: 'var(--emerald)' }}>{debt.currency_symbol}₹{debt.paid_amount.toLocaleString('en-IN', INTL)}</p></div>
          <div><span className="label-caps-sm" >Remaining</span><p className="fin" style={{ fontSize: 20, fontWeight: 700, color: 'var(--coral)' }}>{debt.currency_symbol}₹{Math.round(remaining).toLocaleString('en-IN', INTL)}</p></div>
        </div>

        <div className="progress" style={{ marginBottom: 6, height: 8, borderRadius: 4 }}>
          <div className={`progress-fill ${pct >= 100 ? 'green' : ''}`} style={{ width: `${Math.min(pct, 100)}%`, borderRadius: 4 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-mute)' }}>
          <span className="fin">{pct}% paid off</span>
          {debt.debt_free_date && <span className="fin">Debt free by {new Date(debt.debt_free_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} ({debt.months_remaining} mo)</span>}
        </div>
      </div>

      {/* detail fields */}
      <div className="card card-pad-lg card-pad-mb16" >
        <p className="h-600-12 mb-14" >Details <span style={{ fontWeight: 400, color: 'var(--ink-faint)' }}>— click to edit</span></p>
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

        <div className="mt-16" >
          <InlineField label="Notes" value={debt.notes} type="text" onSave={v => patch({ notes: v || null })} />
        </div>
      </div>

      {/* payment timeline */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <p className="h-600-12 mb-14" >Payment Timeline</p>
        {timeline.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 16px' }}>
            <span className="emoji">○</span>
            <p>No payment history yet</p>
            <p className="text-12-faint" >Update the paid amount to track your progress.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {timeline.map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                borderBottom: i < timeline.length - 1 ? '1px solid var(--line-soft)' : 'none',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: i === timeline.length - 1 && t.remaining <= 0 ? 'var(--emerald)' : 'var(--coral-soft)',
                }} />
                <span style={{ flex: '0 0 80px', fontSize: 12, color: 'var(--ink-mute)' }}>
                  {t.date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
                <span className="fin" style={{ flex: '0 0 80px', fontSize: 13, fontWeight: 500 }}>
                  ₹{t.amount.toLocaleString('en-IN', INTL)}
                </span>
                <span className="fin" style={{ flex: 1, fontSize: 12, color: 'var(--ink-faint)', textAlign: 'right' }}>
                  Remaining: ₹{Math.round(t.remaining).toLocaleString('en-IN', INTL)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
