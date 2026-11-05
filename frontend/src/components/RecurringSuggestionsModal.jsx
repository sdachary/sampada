import { useState } from 'react'
import { api } from '../lib/api'
import { ResponsiveModal, Badge, EmptyState, fmtINR } from './ui'

// The detection proposals: one row per suggestion with a confidence badge,
// expandable example transactions, and accept / reject controls.
export default function RecurringSuggestionsModal({ suggestions = [], onClose, onAccept, onReject, onRejectAll, busy }) {
  const [expanded, setExpanded] = useState(null)
  const [examples, setExamples] = useState({})

  const toggleExamples = async (index, suggestion) => {
    if (expanded === index) {
      setExpanded(null)
      return
    }
    setExpanded(index)
    if (examples[index]) return
    const ids = (suggestion.example_tx_ids || []).slice(0, 2)
    const rows = await Promise.all(ids.map((id) => api.request(`/api/v1/transactions/${id}`).catch(() => null)))
    setExamples((prev) => ({ ...prev, [index]: rows.filter(Boolean) }))
  }

  const pending = suggestions.filter((s) => s.status === 'pending')

  return (
    <ResponsiveModal style={{ maxWidth: 560 }} open title={`Found ${suggestions.length} pattern${suggestions.length === 1 ? '' : 's'}`} onClose={onClose}>
      {suggestions.length === 0 ? (
        <EmptyState title="Not enough history yet">
          Add a few transactions first — then we can look for repeating payments.
        </EmptyState>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {suggestions.map((s, index) => {
            const done = s.status !== 'pending'
            const confidence = Number(s.confidence) || 0
            return (
              <div key={`${s.merchant_norm}-${index}`} style={{ padding: '12px 14px', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-md)', opacity: done ? 0.55 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', textDecoration: done ? 'line-through' : 'none' }}>
                      {s.name || s.merchant_norm}
                    </p>
                    <p style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                      {s.frequency} · next {s.next_due_date} · avg {fmtINR(Number(s.amount_avg) || 0)}
                    </p>
                  </div>
                  <Badge variant={confidence >= 0.8 ? 'success' : confidence >= 0.6 ? 'warning' : 'neutral'}>
                    {Math.round(confidence * 100)}%
                  </Badge>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                  <button type="button" className="btn" style={{ fontSize: 12 }} onClick={() => toggleExamples(index, s)}>
                    {expanded === index ? 'Hide examples' : 'Show examples'}
                  </button>
                  {!done && (
                    <>
                      <button type="button" className="btn btn-primary" style={{ fontSize: 12 }} disabled={busy} onClick={() => onAccept(index, s)}>
                        Accept
                      </button>
                      <button type="button" className="btn" style={{ fontSize: 12 }} disabled={busy} onClick={() => onReject(index)}>
                        Reject
                      </button>
                    </>
                  )}
                </div>

                {expanded === index && examples[index] && (
                  <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
                    {examples[index].map((t) => (
                      <div key={t.id} style={{ fontSize: 11.5, color: 'var(--faint)' }}>
                        {t.transaction_date} · {t.description || t.merchant} · {fmtINR(Number(t.amount) || 0)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {pending.length > 0 && (
            <button type="button" onClick={onRejectAll} disabled={busy}
              style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>
              Reject all remaining
            </button>
          )}
        </div>
      )}
    </ResponsiveModal>
  )
}
