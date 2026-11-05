import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Card, Badge, Skeleton, EmptyState, PageHeader, Stat, fmtINR, toast } from '../components/ui'
import RecurringFormModal from '../components/RecurringFormModal'
import RecurringSuggestionsModal from '../components/RecurringSuggestionsModal'
import { fetchFlags, enabled } from '../lib/flags'

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
  const [modal, setModal] = useState(null)
  const [flagOn, setFlagOn] = useState(false)
  const [hasTransactions, setHasTransactions] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(null)
  const [acceptedCount, setAcceptedCount] = useState(0)

  useEffect(() => {
    api.request('/api/v1/recurring_expenses').then(d => setExpenses(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false))
    fetchFlags().then(f => setFlagOn(enabled('recurring_detection', f))).catch(() => {})
    api.request('/api/v1/transactions?per=1').then(d => setHasTransactions((d.pagination?.total || 0) > 0)).catch(() => {})
    api.request('/api/v1/recurring_detection').then(d => setSuggestions(d.suggestions || [])).catch(() => {})
  }, [])

  const refreshExpenses = () => {
    api.request('/api/v1/recurring_expenses').then(d => setExpenses(Array.isArray(d) ? d : [])).catch(() => {})
  }

  const closeModal = (saved) => {
    if (saved) refreshExpenses()
    setModal(null)
  }

  const refreshSuggestions = async () => {
    const d = await api.request('/api/v1/recurring_detection').catch(() => null)
    const next = d?.suggestions || []
    setSuggestions(next)
    return next
  }

  const detect = async () => {
    setDetecting(true)
    try {
      const d = await api.request('/api/v1/recurring_detection/detect', { method: 'POST' })
      setSuggestions(d.suggestions || [])
      setSuggestionsOpen(true)
    } catch (err) {
      if (err.status === 409) {
        await refreshSuggestions()
        setSuggestionsOpen(true)
      } else if (err.status === 501) {
        setFlagOn(false)
      } else {
        toast(err.message)
      }
    } finally {
      setDetecting(false)
    }
  }

  const rejectSuggestion = async (index) => {
    setBusy(true)
    try {
      await api.request(`/api/v1/recurring_detection/suggestions/${index}`, {
        method: 'PUT', body: JSON.stringify({ status: 'rejected' }),
      })
      await refreshSuggestions()
    } catch (err) {
      toast(err.message)
    } finally {
      setBusy(false)
    }
  }

  const rejectAll = async () => {
    setBusy(true)
    try {
      const pendingIndexes = suggestions.map((s, i) => (s.status === 'pending' ? i : -1)).filter(i => i >= 0)
      for (const index of pendingIndexes) {
        await api.request(`/api/v1/recurring_detection/suggestions/${index}`, {
          method: 'PUT', body: JSON.stringify({ status: 'rejected' }),
        })
      }
      const next = await refreshSuggestions()
      if (!next.some(s => s.status === 'pending')) setSuggestionsOpen(false)
    } catch (err) {
      toast(err.message)
    } finally {
      setBusy(false)
    }
  }

  // Accept opens the edit form on top of the list; the list closes so the
  // two overlays never stack.
  const acceptSuggestion = (index, suggestion) => {
    setSuggestionsOpen(false)
    setEditing({ index, suggestion })
  }

  if (loading) return (
    <div style={{ display: 'grid', gap: 8 }}>
      {[1,2,3].map(i => <Skeleton key={i} style={{ height: 86, borderRadius: 'var(--radius-md)' }} />)}
    </div>
  )

  const totalMonthly = expenses.reduce((s, e) => s + (+e.monthly_amount || 0), 0)
  const activeCount = expenses.filter(e => e.active).length
  const pendingCount = suggestions.filter(s => s.status === 'pending').length

  const renderList = () => {
    if (expenses.length === 0) {
      return (
        <EmptyState
          icon={<span aria-hidden="true" style={{ fontSize: 48, color: 'var(--border)' }}>↻</span>}
          title="No recurring expenses"
          action="+ Add"
          onAction={() => setModal('new')}
        >
          Add your monthly subscriptions and bills so you never miss a payment.
        </EmptyState>
      )
    }

    return (
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
    )
  }

  const renderStats = () => {
    if (expenses.length === 0) return null
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))', gap: 12 }}>
        <Stat label="Monthly Total" value={fmtINR(totalMonthly)} />
        <Stat label="Active" value={`${activeCount}/${expenses.length}`} />
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHeader
        title="Recurring Expenses"
        num="008 / 016"
        action={
          <Button size="sm" onClick={() => setModal('new')}>+ Add</Button>
        }
      >
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Subscriptions, EMIs, and regular bills.</p>
      </PageHeader>

      {renderStats()}

      {flagOn && hasTransactions && (
        <Card style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
              You've been logging for a while. Let me find patterns.
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>
              We scan your transactions for subscriptions and bills you might have missed.
            </p>
          </div>
          <Button size="sm" disabled={detecting} onClick={pendingCount > 0 ? () => setSuggestionsOpen(true) : detect}>
            {pendingCount > 0
              ? `Review ${pendingCount} pattern${pendingCount > 1 ? 's' : ''}`
              : detecting ? 'Scanning…' : 'Detect recurring'}
          </Button>
        </Card>
      )}

      {renderList()}

      {modal && (
        <RecurringFormModal
          expense={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => closeModal(true)}
        />
      )}

      {suggestionsOpen && (
        <RecurringSuggestionsModal
          suggestions={suggestions}
          busy={busy}
          onClose={() => setSuggestionsOpen(false)}
          onAccept={acceptSuggestion}
          onReject={rejectSuggestion}
          onRejectAll={rejectAll}
        />
      )}

      {editing && (
        <RecurringFormModal
          prefill={{
            name: editing.suggestion.name || editing.suggestion.merchant_norm,
            amount: Number(editing.suggestion.amount_avg) || 0,
            frequency: editing.suggestion.frequency,
            next_due_date: editing.suggestion.next_due_date,
          }}
          onClose={() => setEditing(null)}
          onSubmit={async (values) => {
            await api.request(`/api/v1/recurring_detection/suggestions/${editing.index}`, {
              method: 'PUT',
              body: JSON.stringify({ status: 'edited', ...values }),
            })
          }}
          onSave={async () => {
            setEditing(null)
            const count = acceptedCount + 1
            setAcceptedCount(count)
            const next = await refreshSuggestions()
            refreshExpenses()
            toast(`Added ${count} recurring expense${count > 1 ? 's' : ''}`)
            if (next.some(s => s.status === 'pending')) setSuggestionsOpen(true)
          }}
        />
      )}
    </div>
  )
}