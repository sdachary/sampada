import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Card, Badge, Skeleton, EmptyState, PageHeader, Stat, fmtINR, toast, Button } from '../components/ui'
import RecurringFormModal from '../components/RecurringFormModal'
import RecurringSuggestionsModal from '../components/RecurringSuggestionsModal'
import { fetchFlags, enabled } from '../lib/flags'
import { Reveal } from '../lib/motion-primitives'

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
    <Reveal delay={0}>
      <div className="space-y-2">
        {[1,2,3].map(i => <Skeleton key={i} className="skeleton-card h-20" />)}
      </div>
    </Reveal>
  )

  const totalMonthly = expenses.reduce((s, e) => s + (+e.monthly_amount || 0), 0)
  const activeCount = expenses.filter(e => e.active).length
  const pendingCount = suggestions.filter(s => s.status === 'pending').length

  const renderList = () => {
    if (expenses.length === 0) {
      return (
        <Reveal delay={150}>
          <EmptyState
            icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-border" aria-hidden="true"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>}
            title="No recurring expenses"
            action="+ Add"
            onAction={() => setModal('new')}
          >
            Add your monthly subscriptions and bills so you never miss a payment.
          </EmptyState>
        </Reveal>
      )
    }

    return (
      <Reveal delay={150}>
        <div className="space-y-2">
          {expenses.map((e, index) => (
            <Reveal key={e.id} delay={index * 20}>
              <Card className={`card-shell ${e.active ? 'card-shell--interactive' : ''} card-core--pad-base ${e.active ? '' : 'opacity-50'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0">
                    <p className="text-base font-medium text-ink truncate">{e.name}</p>
                    <p className="text-sm text-muted flex items-center gap-1 flex-wrap">
                      {e.frequency} · {e.category}
                      {e.auto_debit && <span>· auto-debit</span>}
                    </p>
                  </div>
                  <p className="fin font-display text-lg font-semibold ml-3">{fmtINR(+e.amount)}</p>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <Badge variant={e.active ? 'success' : 'neutral'}>
                    {e.active ? 'active' : 'inactive'}
                  </Badge>
                  {e.next_due_date && (
                    <span className="text-faint">
                      {e.next_due_date} · {daysText(e.next_due_days)}
                    </span>
                  )}
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </Reveal>
    )
  }

  const renderStats = () => {
    if (expenses.length === 0) return null
    return (
      <Reveal delay={50}>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          <Stat label="Monthly Total" value={fmtINR(totalMonthly)} />
          <Stat label="Active" value={`${activeCount}/${expenses.length}`} />
        </div>
      </Reveal>
    )
  }

  return (
    <div className="space-y-5">
      <Reveal delay={0}>
        <PageHeader
          title="Recurring Expenses"
          num="008 / 016"
          action={<Button size="sm" onClick={() => setModal('new')}>+ Add</Button>}
        >
          <p className="text-sm text-muted">Subscriptions, EMIs, and regular bills.</p>
        </PageHeader>
      </Reveal>

      {renderStats()}

      <Reveal delay={100}>
        {flagOn && hasTransactions && (
          <Card className="card-shell card-shell--elevated card-core--pad-base flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-base font-medium text-ink">
                You've been logging for a while. Let me find patterns.
              </p>
              <p className="text-sm text-muted">
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
      </Reveal>

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