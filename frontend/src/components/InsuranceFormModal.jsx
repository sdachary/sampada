import { useModalForm } from '../lib/useModalForm'
import { Modal, Field } from './ui'
import { echoAmount } from '../lib/amounts'

const POLICY_TYPES = ['health', 'term_life', 'vehicle', 'other']
const FREQUENCIES = ['monthly', 'quarterly', 'yearly']

export default function InsuranceFormModal({ open, policy, onClose, onSave, currencySymbol }) {
  const isEdit = !!policy
  const { form, set, saving, error, handleSubmit } = useModalForm({
    policy_type: policy?.policy_type || 'health',
    provider_name: policy?.provider_name || '',
    premium_amount: policy?.premium_amount || '',
    premium_frequency: policy?.premium_frequency || 'yearly',
    coverage_amount: policy?.coverage_amount || '',
    renewal_date: policy?.renewal_date || '',
    notes: policy?.notes || '',
  }, {
    basePath: '/api/v1/insurance_policies',
    id: policy?.id,
    toBody: (b) => ({
      ...b,
      premium_amount: parseFloat(b.premium_amount) || 0,
      coverage_amount: b.coverage_amount ? parseFloat(b.coverage_amount) : null,
    }),
    onSave,
  })
  const sym = currencySymbol || '₹'
  const premium = parseFloat(form.premium_amount)
  const canEcho = !Number.isNaN(premium) && premium > 0

  return (
    <Modal className="max-w-480" open={open} title={isEdit ? 'Edit Policy' : 'Add Insurance'} onClose={onClose} >
      {error && <div className="alert-inline" >{error}</div>}

      <form className="col-g14" onSubmit={handleSubmit} >
        <div className="grid-2" >
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

        <div className="grid-2" >
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
          <textarea className="input resize-v" rows="2" value={form.notes} onChange={set('notes')} placeholder="Optional notes..."  />
        </Field>

        <div className="flex-g10-mt8" >
          <button type="submit" disabled={saving} className="btn btn-primary flex-1-center" >
            {saving ? 'Saving…' : isEdit ? 'Update Policy' : 'Add Policy'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
