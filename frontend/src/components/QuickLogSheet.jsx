import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'

const TYPES = ['expense', 'income']

const INCOME_WORDS = ['earned', 'salary', 'received', 'credit', 'income', 'freelance', 'refund', 'cashback', 'dividend', 'interest']

function parseNaturalInput(text) {
  if (!text.trim()) return null
  const lower = text.toLowerCase()

  // Detect type from keywords
  const type = INCOME_WORDS.some(w => lower.includes(w)) ? 'income' : 'expense'

  // Extract amount: ₹1234, 1234, ₹1,234.56, 1234.56
  const amountMatch = text.match(/₹?\s*([\d,]+(?:\.\d{1,2})?)/)
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null

  // Description: everything that isn't the amount or ₹ symbol
  let desc = text.replace(/₹/g, '').replace(/[\d,]+(?:\.\d{1,2})?/, '').trim()
  // Clean up leading/trailing punctuation
  desc = desc.replace(/^[\s\-–—:·,]+|[\s\-–—:·,]+$/g, '').trim()

  return { amount, description: desc, type }
}

// Lightweight bottom-sheet quick-log. Intentionally slimmer than
// TransactionFormModal — NL input first, form fields as fallback.
export default function QuickLogSheet({ open, onClose, onSaved, online }) {
  const [categories, setCategories] = useState([])
  const [nlInput, setNlInput] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [transactionType, setTransactionType] = useState('expense')
  const [categoryId, setCategoryId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setError(null)
      setNlInput('')
      api.request('/api/v1/budget_categories').then(d => setCategories(Array.isArray(d) ? d : [])).catch(() => {})
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const reset = () => {
    setNlInput('')
    setDescription('')
    setAmount('')
    setTransactionType('expense')
    setCategoryId('')
  }

  // Parse NL input and update form fields
  const handleNlChange = (val) => {
    setNlInput(val)
    const parsed = parseNaturalInput(val)
    if (parsed) {
      if (parsed.amount !== null && !isNaN(parsed.amount)) setAmount(String(parsed.amount))
      if (parsed.description) setDescription(parsed.description)
      setTransactionType(parsed.type)
    }
  }

  // On Enter in NL input, submit directly if we have amount+description
  const handleNlKeyDown = (e) => {
    if (e.key === 'Enter' && amount && description) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!online || saving || !amount || !description) return
    setSaving(true)
    setError(null)
    try {
      await api.request('/api/v1/transactions', {
        method: 'POST',
        body: JSON.stringify({
          description,
          amount: Number(amount),
          transaction_type: transactionType,
          transaction_date: new Date().toISOString().slice(0, 10),
          budget_category_id: categoryId || null,
          recurring: false,
        }),
      })
      reset()
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(21,20,15,0.4)', zIndex: 130 }} />
      <form onSubmit={handleSubmit} style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 131,
        background: 'var(--paper-card)', borderTop: '1px solid var(--line)',
        borderRadius: '16px 16px 0 0', padding: '20px 20px calc(20px + env(safe-area-inset-bottom))',
        boxShadow: '0 -8px 30px rgba(21,20,15,0.2)', maxWidth: 480, margin: '0 auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>Quick log</p>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', padding: 4 }}>
            ✕
          </button>
        </div>

        {error && (
          <div style={{ background: 'var(--coral-bg)', color: 'var(--coral)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{error}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* NL input — type naturally, e.g. "₹500 lunch" or "earned 50000 salary" */}
          <div>
            <input
              ref={inputRef}
              className="input"
              value={nlInput}
              onChange={(e) => handleNlChange(e.target.value)}
              onKeyDown={handleNlKeyDown}
              placeholder="₹500 lunch, earned 50000 salary…"
              style={{ fontSize: 17, fontWeight: 500 }}
            />
            <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>
              Type naturally — amount and description are detected
            </p>
          </div>

          {/* Editable fields — pre-filled from NL input */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--ink-mute)', marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Amount (₹)</p>
              <input type="number" min="0" step="0.01" className="input" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0" required style={{ fontSize: 18, fontWeight: 600 }} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--ink-mute)', marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Description</p>
              <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Grocery run" required />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: 'var(--ink-mute)', marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Type</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {TYPES.map(t => (
                  <button key={t} type="button" onClick={() => setTransactionType(t)}
                    style={{
                      flex: 1, padding: '6px 10px', borderRadius: 999, border: '1px solid var(--line)',
                      background: transactionType === t ? 'var(--coral)' : 'transparent',
                      color: transactionType === t ? '#fff' : 'var(--ink-soft)', fontSize: 12, cursor: 'pointer', fontWeight: 500,
                    }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: 'var(--ink-mute)', marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Category</p>
              <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ fontSize: 12 }}>
                <option value="">None</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" disabled={saving || !online} className="btn btn-primary"
            style={{ justifyContent: 'center', marginTop: 4, opacity: !online ? 0.5 : undefined, cursor: !online ? 'not-allowed' : undefined }}>
            {saving ? 'Saving…' : online ? 'Log transaction' : 'Offline — edits disabled'}
          </button>
          {!online && (
            <p style={{ fontSize: 11, color: 'var(--ink-faint)', textAlign: 'center' }}>You're offline. Reconnect to log this transaction.</p>
          )}
        </div>
      </form>
    </>
  )
}
