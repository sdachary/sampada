import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const DPO_EMAIL = 'grievance@acharylab.app'

// Mirrors Grievance::TYPES — the server rejects any other value.
const GRIEVANCE_TYPES = [
  { value: 'access', label: 'Access my data' },
  { value: 'correction', label: 'Correct my data' },
  { value: 'erasure', label: 'Erase my data' },
  { value: 'consent', label: 'Consent or withdrawal' },
  { value: 'breach', label: 'Report a breach' },
  { value: 'marketing', label: 'Marketing / spam' },
  { value: 'other', label: 'Something else' },
]

export default function Privacy() {
  const [consent, setConsent] = useState({})
  const [msg, setMsg] = useState('')
  const [isErr, setIsErr] = useState(false)
  const [pending, setPending] = useState([])
  const [grievance, setGrievance] = useState({ grievance_type: '', description: '', email: '' })
  const [reference, setReference] = useState('')
  const [sending, setSending] = useState(false)

  const loadPending = () =>
    api.request('/api/v1/dpdp/deletion-requests')
      .then(d => setPending(d.deletion_requests || []))
      .catch(() => {})

  useEffect(() => {
    api.request('/api/v1/dpdp/consent').then(d => setConsent(d.consent || {})).catch(() => {})
    loadPending()
  }, [])

  const flash = (text, ms = 3000, error = false) => {
    setIsErr(error)
    setMsg(text)
    setTimeout(() => setMsg(''), ms)
  }

  const toggleConsent = async (feature) => {
    const current = !!consent[feature]
    try {
      const res = await api.request('/api/v1/dpdp/consent', {
        method: 'POST',
        body: JSON.stringify({ feature, granted: !current }),
      })
      if (!res.success) throw new Error('update rejected')
      setConsent(prev => ({ ...prev, [feature]: !current }))
      flash(`${feature.replace(/_/g, ' ')} consent ${!current ? 'granted' : 'revoked'}`)
    } catch {
      flash(`Failed to update ${feature}`, 3000, true)
    }
  }

  const handleErasure = async () => {
    try {
      const res = await api.request('/api/v1/dpdp/erasure', {
        method: 'POST',
        body: JSON.stringify({ export_data: true }),
      })
      await loadPending()
      flash(res.message || 'Deletion request submitted. You have 48 hours to cancel.', 5000)
    } catch (e) {
      flash(e.message || 'Erasure request failed', 5000, true)
    }
  }

  const cancelDeletion = async (token) => {
    try {
      await api.request('/api/v1/dpdp/cancel-deletion', {
        method: 'POST',
        body: JSON.stringify({ cancel_token: token }),
      })
      await loadPending()
      flash('Deletion request cancelled')
    } catch (e) {
      flash(e.message || 'Could not cancel the request', 3000, true)
    }
  }

  const submitGrievance = async (e) => {
    e.preventDefault()
    setSending(true)
    try {
      const res = await api.request('/api/v1/dpdp/grievance', {
        method: 'POST',
        body: JSON.stringify({
          grievance_type: grievance.grievance_type,
          description: grievance.description,
          email: grievance.email || undefined,
        }),
      })
      setReference(res.reference_number)
      setGrievance({ grievance_type: '', description: '', email: '' })
      flash(`Grievance ${res.reference_number} received. We respond within ${res.expected_response}.`, 6000)
    } catch (err) {
      flash(err.message || 'Could not submit grievance', 3000, true)
    }
    setSending(false)
  }

  const features = Object.keys(consent)

  return (
    <div>
      <p className="page-num mb-4" >00<em>18</em> / 016</p>
      <h1 className="page-title" >Privacy</h1>
      <p className="text-13-5-muted-sm" >Your data, your control (DPDP compliance).</p>

      {msg && (
        <div className="card" style={{ padding: '10px 16px', marginBottom: 12, fontSize: 13, color: isErr ? 'var(--coral)' : 'var(--emerald)' }}>
          {msg}
        </div>
      )}

      <div className="card card-pad-lg" >
        <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, letterSpacing: '-0.01em' }}>Consent Management</p>
        {features.length === 0 && (
          <p className="text-12-muted" >Loading…</p>
        )}
        {features.map(f => (
          <div key={f} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line-soft)' }}>
            <span style={{ fontSize: 13, textTransform: 'capitalize' }}>{f.replace(/_/g, ' ')}</span>
            <button onClick={() => toggleConsent(f)}
              style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid var(--line)', background: consent[f] ? 'var(--emerald)' : 'transparent', color: consent[f] ? '#fff' : 'var(--ink-soft)', fontSize: 12, cursor: 'pointer', transition: 'all 0.2s' }}>
              {consent[f] ? 'Granted' : 'Revoked'}
            </button>
          </div>
        ))}
      </div>

      <div className="card card-pad-lg" >
        <p className="h-600-12 mb-6" >Data & Erasure</p>
        <p className="text-12-muted mb-10" >
          Request deletion of your account and all associated data. You can download everything first with a full export,
          then cancel within 48 hours.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleErasure} className="btn" style={{ fontSize: 12.5, padding: '7px 16px', background: 'var(--coral)', color: '#fff' }}>
            Request account erasure
          </button>
          <a href="/privacy.html" className="btn btn-ghost" style={{ fontSize: 12.5, padding: '7px 16px', textDecoration: 'none' }}>
            Read the privacy notice
          </a>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: 12, borderLeft: '3px solid #d4a017' }}>
          <p className="h-600-12 mb-6" >Pending Erasure Requests</p>
          {pending.map(e => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--line-soft)' }}>
              <div className="text-11-5-muted" >
                <p>Deletes on {new Date(e.scheduled_for).toLocaleString()}</p>
                <p>Reference <code style={{ fontSize: 11, background: 'var(--paper-warm)', padding: '1px 6px', borderRadius: 4 }}>{e.cancel_token}</code></p>
              </div>
              <button onClick={() => cancelDeletion(e.cancel_token)} className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 14px' }}>
                Cancel deletion
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card card-pad-lg" >
        <p className="h-600-12 mb-6" >Raise a Grievance</p>
        <p className="text-12-muted mb-10" >
          Anything we got wrong with your data? We respond within 72 hours and resolve within 90 days. You can also write
          to our Grievance Officer at <a className="text-coral" href={`mailto:${DPO_EMAIL}`} >{DPO_EMAIL}</a>.
        </p>
        {reference && (
          <p style={{ fontSize: 12, color: 'var(--emerald)', marginBottom: 10 }}>
            Reference for your last grievance: <strong>{reference}</strong>
          </p>
        )}
        <form className="col-g10" onSubmit={submitGrievance} >
          <select className="input" required value={grievance.grievance_type}
            onChange={e => setGrievance(g => ({ ...g, grievance_type: e.target.value }))}>
            <option value="">What is this about?</option>
            {GRIEVANCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <textarea className="input" required rows={3} placeholder="Tell us what happened"
            value={grievance.description}
            onChange={e => setGrievance(g => ({ ...g, description: e.target.value }))} />
          <input className="input" type="email" placeholder="Contact email (optional — defaults to your account email)"
            value={grievance.email}
            onChange={e => setGrievance(g => ({ ...g, email: e.target.value }))} />
          <button type="submit" disabled={sending} className="btn btn-primary" style={{ justifyContent: 'center', fontSize: 12.5, padding: '8px 18px' }}>
            {sending ? 'Submitting…' : 'Submit grievance'}
          </button>
        </form>
      </div>
    </div>
  )
}
