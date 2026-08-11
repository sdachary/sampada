import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const TYPES = ['expense', 'income']

// Lightweight bottom-sheet quick-log. Intentionally slimmer than
// TransactionFormModal — just Description, Amount, a type toggle and an
// optional category. Posts to the same endpoint the modal uses.
export default function QuickLogSheet({ open, onClose, onSaved, online }) {
  const [categories, setCategories] = useState([])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [transactionType, setTransactionType] = useState('expense')
  const [categoryId, setCategoryId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setError(null)
      api.request('/api/v1/budget_categories').then(d => setCategories(Array.isArray(d) ? d : [])).catch(() => {})
    }
  }, [open])

  const reset = () => {
    setDescription('')
    setAmount('')
    setTransactionType('expense')
    setCategoryId('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!online || saving) return
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
          <div>
            <p style={{ fontSize: 11, color: 'var(--ink-mute)', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Amount (₹) *</p>
            <input autoFocus type="number" min="0" step="0.01" className="input" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="0" required style={{ fontSize: 22, fontWeight: 600 }} />
          </div>

          <div>
            <p style={{ fontSize: 11, color: 'var(--ink-mute)', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Description *</p>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Grocery run" required />
          </div>

          <div>
            <p style={{ fontSize: 11, color: 'var(--ink-mute)', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Type</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {TYPES.map(t => (
                <button key={t} type="button" onClick={() => setTransactionType(t)}
                  style={{
                    flex: 1, padding: '8px 14px', borderRadius: 999, border: '1px solid var(--line)',
                    background: transactionType === t ? 'var(--coral)' : 'transparent',
                    color: transactionType === t ? '#fff' : 'var(--ink-soft)', fontSize: 13, cursor: 'pointer', fontWeight: 500,
                  }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p style={{ fontSize: 11, color: 'var(--ink-mute)', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Category</p>
            <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">None</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <button type="submit" disabled={saving || !online} className="btn btn-primary"
            style={{ justifyContent: 'center', marginTop: 6, opacity: !online ? 0.5 : undefined, cursor: !online ? 'not-allowed' : undefined }}>
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
