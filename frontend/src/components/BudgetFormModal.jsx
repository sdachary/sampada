import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { ResponsiveModal, Field, ConfirmDialog } from './ui'
import { useModalForm } from '../lib/useModalForm'

const PERIODS = ['monthly', 'quarterly', 'yearly']

export default function BudgetFormModal({ budget, onClose, onSave }) {
  const isEdit = !!budget
  const [categories, setCategories] = useState([])

  const { form, set, saving, error, handleSubmit, handleDelete } = useModalForm({
    budget_category_id: budget?.budget_category_id || '',
    monthly_limit: budget?.monthly_limit || '',
    currency_code: budget?.currency_code || 'INR',
    period: budget?.period || 'monthly',
    start_date: budget?.start_date || '',
    end_date: budget?.end_date || '',
    notes: budget?.notes || '',
    household_id: budget?.household_id || '',
  }, {
    basePath: '/api/v1/budgets',
    id: budget?.id,
    toBody: (b) => ({
      ...b,
      monthly_limit: parseFloat(b.monthly_limit) || 0,
    }),
    onSave,
  })

  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    api.request('/api/v1/budget_categories').then(d => setCategories(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  return (
    <ResponsiveModal className="max-w-480" open title={isEdit ? 'Edit Budget' : 'Add Budget'} onClose={onClose} >
      {error && <div className="alert-inline" >{error}</div>}

      <form className="col-g14" onSubmit={handleSubmit} >
        <Field label="Category *">
          <select required className="input" value={form.budget_category_id} onChange={set('budget_category_id')}>
            <option value="">Select category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>

        <div className="grid-2" >
          <Field label="Monthly Limit (₹) *">
            <input required type="number" min="0" step="0.01" className="input" value={form.monthly_limit} onChange={set('monthly_limit')} placeholder="0" />
          </Field>
          <Field label="Currency">
            <input className="input" value={form.currency_code} onChange={set('currency_code')} placeholder="INR" />
          </Field>
        </div>

        <div className="grid-2" >
          <Field label="Period">
            <select className="input" value={form.period} onChange={set('period')}>
              {PERIODS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Start Date">
            <input type="date" className="input" value={form.start_date} onChange={set('start_date')} />
          </Field>
        </div>

        <div className="grid-2" >
          <Field label="End Date (optional)">
            <input type="date" className="input" value={form.end_date} onChange={set('end_date')} />
          </Field>
          <Field label="Household (optional)">
            <input className="input" value={form.household_id} onChange={set('household_id')} placeholder="Household ID" />
          </Field>
        </div>

        <Field label="Notes">
          <textarea className="input resize-v" rows="3" value={form.notes} onChange={set('notes')} placeholder="Optional notes..."  />
        </Field>

        <div className="flex-g10-mt8" >
          <button type="submit" disabled={saving} className="btn btn-primary flex-1-center" >
            {saving ? 'Saving…' : isEdit ? 'Update Budget' : 'Add Budget'}
          </button>
          {isEdit && (
            <button type="button" onClick={() => setConfirming(true)} disabled={saving} className="btn btn--outline btn--sm border-accent text-accent hover:bg-accent-bg">
              Delete
            </button>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={confirming}
        title="Delete budget?"
        message={`Delete this budget? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </ResponsiveModal>
  )
}