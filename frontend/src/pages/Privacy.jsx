import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Card, Button, Input, Select, Textarea, EmptyState, PageHeader, Badge, ToastHost, toast } from '../components/ui'

const DPO_EMAIL = 'grievance@acharylab.app'

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
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHeader
        title="Privacy"
        num="018 / 016"
      >
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Your data, your control (DPDP compliance).</p>
      </PageHeader>

      {msg && (
        <Card style={{ padding: '10px 16px', fontSize: 13, color: isErr ? 'var(--accent)' : 'var(--success)' }}>
          {msg}
        </Card>
      )}

      <Card style={{ padding: '20px' }}>
        <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, letterSpacing: '-0.01em' }}>Consent Management</p>
        {features.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>Loading…</p>
        )}
        {features.map(f => (
          <div key={f} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-soft)' }}>
            <span style={{ fontSize: 13, textTransform: 'capitalize' }}>{f.replace(/_/g, ' ')}</span>
            <Button
              onClick={() => toggleConsent(f)}
              variant={consent[f] ? 'success' : 'ghost'}
              size="sm"
            >
              {consent[f] ? 'Granted' : 'Revoked'}
            </Button>
          </div>
        ))}
      </Card>

      <Card style={{ padding: '20px' }}>
        <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, letterSpacing: '-0.01em' }}>Data & Erasure</p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
          Request deletion of your account and all associated data. You can download everything first with a full export,
          then cancel within 48 hours.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button onClick={handleErasure} style={{ background: 'var(--accent)', color: '#fff' }}>
            Request account erasure
          </Button>
          <a href="/privacy.html" style={{ textDecoration: 'none' }}>
            <Button variant="ghost">Read the privacy notice</Button>
          </a>
        </div>
      </Card>

      {pending.length > 0 && (
        <Card style={{ padding: '14px 18px', borderLeft: '3px solid var(--warning)' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Pending Erasure Requests</p>
          {pending.map(e => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border-soft)' }}>
              <div>
                <p style={{ fontSize: 11.5, color: 'var(--muted)' }}>Deletes on {new Date(e.scheduled_for).toLocaleString()}</p>
                <p>Reference <code style={{ fontSize: 11, background: 'var(--bg)', padding: '1px 6px', borderRadius: 4 }}>{e.cancel_token}</code></p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => cancelDeletion(e.cancel_token)}>
                Cancel deletion
              </Button>
            </div>
          ))}
        </Card>
      )}

      <Card style={{ padding: '20px' }}>
        <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, letterSpacing: '-0.01em' }}>Raise a Grievance</p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
          Anything we got wrong with your data? We respond within 72 hours and resolve within 90 days. You can also write
          to our Grievance Officer at <a style={{ color: 'var(--accent)' }} href={`mailto:${DPO_EMAIL}`}>{DPO_EMAIL}</a>.
        </p>
        {reference && (
          <p style={{ fontSize: 12, color: 'var(--success)', marginBottom: 10 }}>
            Reference for your last grievance: <strong>{reference}</strong>
          </p>
        )}
        <form onSubmit={submitGrievance} style={{ display: 'grid', gap: 12 }}>
          <Select
            value={grievance.grievance_type}
            onChange={e => setGrievance(g => ({ ...g, grievance_type: e.target.value }))}
            options={GRIEVANCE_TYPES.map(t => ({ value: t.value, label: t.label }))}
            placeholder="What is this about?"
            required
          />
          <Textarea
            value={grievance.description}
            onChange={e => setGrievance(g => ({ ...g, description: e.target.value }))}
            placeholder="Tell us what happened"
            rows={3}
            required
          />
          <Input
            type="email"
            value={grievance.email}
            onChange={e => setGrievance(g => ({ ...g, email: e.target.value }))}
            placeholder="Contact email (optional — defaults to your account email)"
          />
          <Button type="submit" loading={sending} disabled={sending}>
            {sending ? 'Submitting…' : 'Submit grievance'}
          </Button>
        </form>
      </Card>

      <ToastHost />
    </div>
  )
}