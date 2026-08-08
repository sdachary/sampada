import { useState } from 'react'
import { api } from '../lib/api'
import { Modal, Field } from './ui'
import { echoAmount } from '../lib/amounts'

const POLICY_TYPES = ['health', 'term_life', 'vehicle', 'other']
const FREQUENCIES = ['monthly', 'quarterly', 'yearly']

export default function InsuranceFormModal({ open, policy, onClose, onSave, currencySymbol }) {
  const isEdit = !!policy
  const [form, setForm] = useState({
    policy_type: policy?.policy_type || 'health',
    provider_name: policy?.provider_name || '',
    premium_amount: policy?.premium_amount || '',
    premium_frequency: policy?.premium_frequency || 'yearly',
    coverage_amount: policy?.coverage_amount || '',
    renewal_date: policy?.renewal_date || '',
    notes: policy?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))
  const sym = currencySymbol || '₹'
  const premium = parseFloat(form.premium_amount)
  const canEcho = !Number.isNaN(premium) && premium > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = {
        ...form,
        premium_amount: premium || 0,
        coverage_amount: form.coverage_amount ? parseFloat(form.coverage_amount) : null,
      }
      if (isEdit) {
        await api.request(`/api/v1/insurance_policies/${policy.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      } else {
        await api.request('/api/v1/insurance_policies', { method: 'POST', body: JSON.stringify(body) })
      }
      onSave()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title={isEdit ? 'Edit Policy' : 'Add Insurance'} onClose={onClose} style={{ maxWidth: 480 }}>
      {error && <div style={{ background: 'var(--coral-bg)', color: 'var(--coral)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Type">
            <select className="input" value={form.policy_type} onChange={set('policy_type')}>
              {POLICY_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </Field>
          <Field label="Premium frequency">
            <select className="input" value={form.premium_frequency} onChange={set('premium_frequency')}>
              {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Provider *">
          <input required className="input" value={form.provider_name} onChange={set('provider_name')} placeholder="e.g. HDFC Ergo, LIC" />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label={`Premium (${sym}) *`}>
            <input required type="number" min="0" step="0.01" className="input" value={form.premium_amount} onChange={set('premium_amount')} placeholder="0" />
          </Field>
          <Field label={`Coverage (${sym})`}>
            <input type="number" min="0" step="0.01" className="input" value={form.coverage_amount} onChange={set('coverage_amount')} placeholder="0" />
          </Field>
        </div>

        {canEcho && (
          <div style={{ background: 'var(--paper-card)', border: '1px solid var(--line)', padding: '10px 14px', borderRadius: 8, fontSize: 13, color: 'var(--ink-mute)' }}>
            That's {echoAmount(premium, sym)}.
          </div>
        )}

        <Field label="Renewal date">
          <input type="date" className="input" value={form.renewal_date} onChange={set('renewal_date')} />
        </Field>

        <Field label="Notes">
          <textarea className="input" rows="2" value={form.notes} onChange={set('notes')} placeholder="Optional notes..." style={{ resize: 'vertical' }} />
        </Field>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? 'Saving…' : isEdit ? 'Update Policy' : 'Add Policy'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
