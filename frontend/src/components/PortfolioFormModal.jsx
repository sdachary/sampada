import { useState } from 'react'
import { api } from '../lib/api'
import { Modal, Field, ConfirmDialog } from './ui'

const GOALS = ['retirement', 'wealth', 'education', 'house', 'emergency', 'other']

export default function PortfolioFormModal({ portfolio, onClose, onSave }) {
  const isEdit = !!portfolio
  const [form, setForm] = useState({
    name: portfolio?.name || '',
    goal: portfolio?.goal || 'wealth',
    risk_tolerance: portfolio?.risk_tolerance != null ? portfolio.risk_tolerance : '',
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
        risk_tolerance: form.risk_tolerance ? parseFloat(form.risk_tolerance) : null,
      }
      if (isEdit) {
        await api.request(`/api/v1/portfolios/${portfolio.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      } else {
        await api.request('/api/v1/portfolios', { method: 'POST', body: JSON.stringify(body) })
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
      await api.request(`/api/v1/portfolios/${portfolio.id}`, { method: 'DELETE' })
      onSave()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal open title={isEdit ? 'Edit Portfolio' : 'Add Portfolio'} onClose={onClose} style={{ maxWidth: 460 }}>
      {error && <div style={{ background: 'var(--coral-bg)', color: 'var(--coral)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Name *">
          <input required className="input" value={form.name} onChange={set('name')} placeholder="e.g. Long-term Equity" />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Goal">
            <select className="input" value={form.goal} onChange={set('goal')}>
              {GOALS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Risk (1–10)">
            <input type="number" min="1" max="10" step="0.5" className="input" value={form.risk_tolerance} onChange={set('risk_tolerance')} placeholder="5" />
          </Field>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
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
