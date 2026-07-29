import { useState } from 'react'
import { api } from '../lib/api'
import { Modal, Field, ConfirmDialog } from './ui'

const CATEGORIES = ['credit_card', 'loan', 'personal', 'mortgage', 'education', 'other']
const STATUSES = ['active', 'paid_default', 'paid_off', 'frozen']

export default function DebtFormModal({ debt, onClose, onSave }) {
  const isEdit = !!debt
  const [form, setForm] = useState({
    name: debt?.name || '',
    category: debt?.category || 'loan',
    amount: debt?.amount || '',
    interest_rate: debt?.interest_rate || '',
    emi_amount: debt?.emi_amount || '',
    status: debt?.status || 'active',
    paid_amount: debt?.paid_amount || '',
    started_at: debt?.started_at || '',
    notes: debt?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(false)

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = {
        ...form,
        amount: parseFloat(form.amount) || 0,
        interest_rate: form.interest_rate ? parseFloat(form.interest_rate) : null,
        emi_amount: form.emi_amount ? parseFloat(form.emi_amount) : null,
        paid_amount: parseFloat(form.paid_amount) || 0,
      }
      if (isEdit) {
        await api.request(`/api/v1/debts/${debt.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      } else {
        await api.request('/api/v1/debts', { method: 'POST', body: JSON.stringify(body) })
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
      await api.request(`/api/v1/debts/${debt.id}`, { method: 'DELETE' })
      onSave()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal open title={isEdit ? 'Edit Debt' : 'Add Debt'} onClose={onClose} style={{ maxWidth: 480 }}>
      {error && <div style={{ background: 'var(--coral-bg)', color: 'var(--coral)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Name *">
          <input required className="input" value={form.name} onChange={set('name')} placeholder="e.g. Home Loan" />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Category">
            <select className="input" value={form.category} onChange={set('category')}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={set('status')}>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Amount (₹) *">
            <input required type="number" min="0" step="0.01" className="input" value={form.amount} onChange={set('amount')} placeholder="0" />
          </Field>
          <Field label="Interest Rate (%)">
            <input type="number" min="0" step="0.1" className="input" value={form.interest_rate} onChange={set('interest_rate')} placeholder="0" />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="EMI (₹/mo)">
            <input type="number" min="0" step="0.01" className="input" value={form.emi_amount} onChange={set('emi_amount')} placeholder="0" />
          </Field>
          <Field label="Already Paid (₹)">
            <input type="number" min="0" step="0.01" className="input" value={form.paid_amount} onChange={set('paid_amount')} placeholder="0" />
          </Field>
        </div>

        <Field label="Started Date">
          <input type="date" className="input" value={form.started_at} onChange={set('started_at')} />
        </Field>

        <Field label="Notes">
          <textarea className="input" rows="3" value={form.notes} onChange={set('notes')} placeholder="Optional notes..." style={{ resize: 'vertical' }} />
        </Field>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? 'Saving…' : isEdit ? 'Update Debt' : 'Add Debt'}
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
        title="Delete debt?"
        message={`Delete "${debt?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </Modal>
  )
}
