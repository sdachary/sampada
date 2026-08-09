import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Modal, Field, ConfirmDialog } from './ui'

const TYPES = ['expense', 'income']
const FREQS = ['monthly', 'weekly', 'daily', 'yearly', 'quarterly']

export default function TransactionFormModal({ transaction, onClose, onSave }) {
  const isEdit = !!transaction
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    description: transaction?.description || '',
    amount: transaction?.amount || '',
    transaction_type: transaction?.transaction_type || 'expense',
    transaction_date: transaction?.transaction_date || new Date().toISOString().slice(0, 10),
    budget_category_id: transaction?.budget_category_id || '',
    merchant: transaction?.merchant || '',
    notes: transaction?.notes || '',
    recurring: transaction?.recurring || false,
    recurring_frequency: transaction?.recurring_frequency || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    api.request('/api/v1/budget_categories').then(d => setCategories(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = {
        ...form,
        amount: parseFloat(form.amount) || 0,
        budget_category_id: form.budget_category_id || null,
        recurring: form.recurring_frequency ? true : false,
      }
      if (isEdit) {
        await api.request(`/api/v1/transactions/${transaction.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      } else {
        await api.request('/api/v1/transactions', { method: 'POST', body: JSON.stringify(body) })
      }
      onSave()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await api.request(`/api/v1/transactions/${transaction.id}`, { method: 'DELETE' })
      onSave()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal open title={isEdit ? 'Edit Transaction' : 'Add Transaction'} onClose={onClose} style={{ maxWidth: 480 }}>
      {error && <div style={{ background: 'var(--coral-bg)', color: 'var(--coral)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Description *">
          <input required className="input" value={form.description} onChange={set('description')} placeholder="e.g. Grocery run" />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Amount (₹) *">
            <input required type="number" min="0" step="0.01" className="input" value={form.amount} onChange={set('amount')} placeholder="0" />
          </Field>
          <Field label="Type">
            <select className="input" value={form.transaction_type} onChange={set('transaction_type')}>
              {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Date *">
            <input required type="date" className="input" value={form.transaction_date} onChange={set('transaction_date')} />
          </Field>
          <Field label="Category">
            <select className="input" value={form.budget_category_id} onChange={set('budget_category_id')}>
              <option value="">None</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Merchant">
          <input className="input" value={form.merchant} onChange={set('merchant')} placeholder="Optional" />
        </Field>

        <Field label="Recurring Frequency">
          <select className="input" value={form.recurring_frequency} onChange={set('recurring_frequency')}>
            <option value="">One-time</option>
            {FREQS.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
          </select>
        </Field>

        <Field label="Notes">
          <textarea className="input" rows="2" value={form.notes} onChange={set('notes')} placeholder="Optional notes..." style={{ resize: 'vertical' }} />
        </Field>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? 'Saving…' : isEdit ? 'Update Transaction' : 'Add Transaction'}
          </button>
          {isEdit && (
            <button type="button" onClick={() => setConfirming(true)} disabled={saving}
              style={{ padding: '10px 20px', borderRadius: 999, border: '1px solid var(--coral)', background: 'transparent', color: 'var(--coral)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              Delete
            </button>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={confirming}
        title="Delete transaction?"
        message={`Delete "${transaction?.description}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </Modal>
  )
}
