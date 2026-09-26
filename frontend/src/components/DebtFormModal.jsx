import { useState } from 'react'
import { Modal, Field, ConfirmDialog } from './ui'
import { useModalForm } from '../lib/useModalForm'

const CATEGORIES = ['credit_card', 'loan', 'personal', 'mortgage', 'education', 'other']
const STATUSES = ['active', 'paid_default', 'paid_off', 'frozen']

export default function DebtFormModal({ debt, onClose, onSave }) {
  const isEdit = !!debt
  const { form, set, saving, error, handleSubmit } = useModalForm({
    name: debt?.name || '',
    category: debt?.category || 'loan',
    amount: debt?.amount || '',
    interest_rate: debt?.interest_rate || '',
    emi_amount: debt?.emi_amount || '',
    status: debt?.status || 'active',
    paid_amount: debt?.paid_amount || '',
    started_at: debt?.started_at || '',
    notes: debt?.notes || '',
  }, {
    basePath: '/api/v1/debts',
    id: debt?.id,
    toBody: (b) => ({
      ...b,
      amount: parseFloat(b.amount) || 0,
      interest_rate: b.interest_rate ? parseFloat(b.interest_rate) : null,
      emi_amount: b.emi_amount ? parseFloat(b.emi_amount) : null,
      paid_amount: parseFloat(b.paid_amount) || 0,
    }),
    onSave,
  })
  const [confirming, setConfirming] = useState(false)

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
    <Modal className="max-w-480" open title={isEdit ? 'Edit Debt' : 'Add Debt'} onClose={onClose} >
      {error && <div className="alert-inline" >{error}</div>}

      <form className="col-g14" onSubmit={handleSubmit} >
        <Field label="Name *">
          <input required className="input" value={form.name} onChange={set('name')} placeholder="e.g. Home Loan" />
        </Field>

        <div className="grid-2" >
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

        <div className="grid-2" >
          <Field label="Amount (₹) *">
            <input required type="number" min="0" step="0.01" className="input" value={form.amount} onChange={set('amount')} placeholder="0" />
          </Field>
          <Field label="Interest Rate (%)">
            <input type="number" min="0" step="0.1" className="input" value={form.interest_rate} onChange={set('interest_rate')} placeholder="0" />
          </Field>
        </div>

        <div className="grid-2" >
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
          <textarea className="input resize-v" rows="3" value={form.notes} onChange={set('notes')} placeholder="Optional notes..."  />
        </Field>

        <div className="flex-g10-mt8" >
          <button type="submit" disabled={saving} className="btn btn-primary flex-1-center" >
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
