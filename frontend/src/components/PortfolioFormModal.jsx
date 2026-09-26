import { useState } from 'react'
import { api } from '../lib/api'
import { Modal, Field, ConfirmDialog } from './ui'
import { useModalForm } from '../lib/useModalForm'

const GOALS = ['retirement', 'wealth', 'education', 'house', 'emergency', 'other']

export default function PortfolioFormModal({ portfolio, onClose, onSave }) {
  const isEdit = !!portfolio
  const { form, set, saving, error, handleSubmit } = useModalForm({
    name: portfolio?.name || '',
    goal: portfolio?.goal || 'wealth',
    risk_tolerance: portfolio?.risk_tolerance != null ? portfolio.risk_tolerance : '',
  }, {
    basePath: '/api/v1/portfolios',
    id: portfolio?.id,
    toBody: (b) => ({
      ...b,
      risk_tolerance: b.risk_tolerance ? parseFloat(b.risk_tolerance) : null,
    }),
    onSave,
  })
  const handleDelete = async () => {
    setSaving(true)
    try {
      await api.request(`/api/v1/portfolios/${portfolio.id}`, { method: 'DELETE' })
      onSave()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal open title={isEdit ? 'Edit Portfolio' : 'Add Portfolio'} onClose={onClose} style={{ maxWidth: 460 }}>
      {error && <div className="alert-inline" >{error}</div>}

      <form className="col-g14" onSubmit={handleSubmit} >
        <Field label="Name *">
          <input required className="input" value={form.name} onChange={set('name')} placeholder="e.g. Long-term Equity" />
        </Field>

        <div className="grid-2" >
          <Field label="Goal">
            <select className="input" value={form.goal} onChange={set('goal')}>
              {GOALS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Risk (1–10)">
            <input type="number" min="1" max="10" step="0.5" className="input" value={form.risk_tolerance} onChange={set('risk_tolerance')} placeholder="5" />
          </Field>
        </div>

        <div className="flex-g10-mt8" >
          <button type="submit" disabled={saving} className="btn btn-primary flex-1-center" >
            {saving ? 'Saving…' : isEdit ? 'Update Portfolio' : 'Add Portfolio'}
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
        title="Delete portfolio?"
        message={`Delete "${portfolio?.name}"? Its investments will also be removed. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </Modal>
  )
}
