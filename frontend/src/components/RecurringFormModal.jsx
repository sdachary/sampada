import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { ResponsiveModal, Field, ConfirmDialog } from './ui'
import { useModalForm } from '../lib/useModalForm'

const FREQS = ['monthly', 'weekly', 'daily', 'yearly', 'quarterly']

export default function RecurringFormModal({ expense, prefill, onClose, onSave, onSubmit }) {
  const isEdit = !!expense
  const initial = expense || prefill || {}
  const [categories, setCategories] = useState([])

  const { form, set, saving, error, handleSubmit, handleDelete } = useModalForm({
    name: initial.name || '',
    amount: initial.amount || '',
    frequency: initial.frequency || 'monthly',
    category: initial.category || '',
    next_due_date: initial.next_due_date || '',
    auto_debit: initial.auto_debit || false,
    notes: initial.notes || '',
  }, {
    basePath: '/api/v1/recurring_expenses',
    id: expense?.id,
    toBody: (b) => ({
      ...b,
      amount: parseFloat(b.amount) || 0,
    }),
    onSave,
    submit: onSubmit,
  })

  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    api.request('/api/v1/budget_categories').then(d => setCategories(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  return (
    <ResponsiveModal className="max-w-480" open title={isEdit ? 'Edit Recurring Expense' : 'Add Recurring Expense'} onClose={onClose} >
      {error && <div className="alert-inline" >{error}</div>}

      <form className="col-g14" onSubmit={handleSubmit} >
        <Field label="Name *">
          <input required className="input" value={form.name} onChange={set('name')} placeholder="e.g. Netflix, Rent, EMI" />
        </Field>

        <div className="grid-2" >
          <Field label="Amount (₹) *">
            <input required type="number" min="0" step="0.01" className="input" value={form.amount} onChange={set('amount')} placeholder="0" />
          </Field>
          <Field label="Frequency">
            <select className="input" value={form.frequency} onChange={set('frequency')}>
              {FREQS.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Category">
          <select className="input" value={form.category} onChange={set('category')}>
            <option value="">Select category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>

        <div className="grid-2" >
          <Field label="Next Due Date *">
            <input required type="date" className="input" value={form.next_due_date} onChange={set('next_due_date')} />
          </Field>
          <Field label="Auto Debit">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" className="input" style={{ width: 'auto' }} checked={form.auto_debit} onChange={(e) => set('auto_debit')(e.target.checked)} />
              <span>Yes</span>
            </label>
          </Field>
        </div>

        <Field label="Notes">
          <textarea className="input resize-v" rows="3" value={form.notes} onChange={set('notes')} placeholder="Optional notes..."  />
        </Field>

        <div className="flex-g10-mt8" >
          <button type="submit" disabled={saving} className="btn btn-primary flex-1-center" >
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Add'}
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
        title="Delete recurring expense?"
        message={`Delete this recurring expense? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </ResponsiveModal>
  )
}
