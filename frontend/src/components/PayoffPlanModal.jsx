import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Modal, Field, ConfirmDialog } from './ui'
import { useModalForm } from '../lib/useModalForm'

export default function PayoffPlanModal({ plan, onClose, onSave }) {
  const isEdit = !!plan
  const { form, set, saving, error, handleSubmit } = useModalForm({
    name: plan?.name || '',
    strategy: plan?.strategy || 'avalanche',
    extra_payment: plan?.extra_payment || '',
    debt_ids: plan?.debts?.map(d => d.id) || [],
  }, {
    basePath: '/api/v1/payoff_plans',
    id: plan?.id,
    toBody: (b) => ({
      name: b.name,
      strategy: b.strategy,
      extra_payment: parseFloat(b.extra_payment) || 0,
      debt_ids: b.debt_ids,
    }),
    onSave,
  })
  const handleDelete = async () => {
    setSaving(true)
    try {
      await api.request(`/api/v1/payoff_plans/${plan.id}`, { method: 'DELETE' })
      onSave()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const selectedDebts = debts.filter(d => form.debt_ids.includes(d.id))
  const totalAmount = selectedDebts.reduce((s, d) => s + (+d.amount || 0), 0)

  return (
    <Modal open title={isEdit ? 'Edit Plan' : 'New Payoff Plan'} onClose={onClose} style={{ maxWidth: 520 }}>
      {error && <div className="alert-inline" >{error}</div>}

      <form className="col-g14" onSubmit={handleSubmit} >
        <Field label="Plan Name *">
          <input required className="input" value={form.name} onChange={set('name')} placeholder="e.g. Get Debt Free 2027" />
        </Field>

        <Field label="Strategy">
          <select className="input" value={form.strategy} onChange={set('strategy')}>
            <option value="avalanche">Avalanche — highest interest first</option>
            <option value="snowball">Snowball — smallest balance first</option>
          </select>
        </Field>

        <Field label="Extra Monthly Payment (₹)">
          <input type="number" min="0" step="0.01" className="input" value={form.extra_payment} onChange={set('extra_payment')} placeholder="0" />
        </Field>

        <Field label="Select Debts">
          {debts.length === 0 && <p className="text-12-faint" >No debts found. Add debts first.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
            {debts.map(d => (
              <label key={d.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                borderRadius: 8, cursor: 'pointer', fontSize: 13,
                background: form.debt_ids.includes(d.id) ? 'var(--coral-active-bg)' : 'transparent',
                border: `1px solid ${form.debt_ids.includes(d.id) ? 'var(--coral)' : 'var(--line-soft)'}`,
              }}>
                <input type="checkbox" checked={form.debt_ids.includes(d.id)} onChange={() => toggleDebt(d.id)} style={{ accentColor: 'var(--coral)' }} />
                <span className="flex-1" >{d.name}</span>
                <span className="fin" style={{ color: 'var(--ink-mute)', fontSize: 12 }}>₹{(+d.amount || 0).toLocaleString('en-IN')} @ {d.interest_rate}%</span>
              </label>
            ))}
          </div>
        </Field>

        {selectedDebts.length > 0 && (
          <div style={{ fontSize: 12, color: 'var(--ink-mute)', background: 'var(--line-soft)', padding: '8px 12px', borderRadius: 8 }}>
            {selectedDebts.length} debt{selectedDebts.length > 1 ? 's' : ''} selected · Total: <span className="fin">₹{totalAmount.toLocaleString('en-IN')}</span>
          </div>
        )}

        <div className="flex-g10-mt8" >
          <button type="submit" disabled={saving || form.debt_ids.length === 0} className="btn btn-primary flex-1-center" >
            {saving ? 'Saving…' : isEdit ? 'Update Plan' : 'Create Plan'}
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
        title="Delete plan?"
        message={`Delete plan "${plan?.name}"?`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </Modal>
  )
}
