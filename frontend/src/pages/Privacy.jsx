import { useState, useEffect } from 'react'

const DPDP = {
  async getConsent() {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/v1/dpdp/consent', { headers: { Authorization: `Bearer ${token}` } })
    return res.json()
  },
  async setConsent(feature, granted) {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/v1/dpdp/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ feature, granted }),
    })
    return res.json()
  },
  async requestErasure(exportData) {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/v1/dpdp/erasure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ export_data: exportData }),
    })
    return res.json()
  },
}

export default function Privacy() {
  const [consent, setConsent] = useState({})
  const [msg, setMsg] = useState('')
  const [erasures, setErasures] = useState([])

  useEffect(() => {
    DPDP.getConsent().then(d => setConsent(d.consent || {})).catch(() => {})
  }, [])

  const toggleConsent = async (feature) => {
    const current = !!consent[feature]
    const res = await DPDP.setConsent(feature, !current)
    if (res.success) {
      setConsent(prev => ({ ...prev, [feature]: !current }))
      setMsg(`${feature} consent ${!current ? 'granted' : 'revoked'}`)
    } else {
      setMsg(`Failed to update ${feature}`)
    }
    setTimeout(() => setMsg(''), 3000)
  }

  const handleErasure = async () => {
    const res = await DPDP.requestErasure(true)
    if (res.success) {
      setErasures(prev => [...prev, { cancel_token: res.cancel_token, scheduled_for: res.scheduled_for }])
      setMsg('Deletion request submitted. You have 48 hours to cancel.')
    } else {
      setMsg(res.error || 'Erasure request failed')
    }
    setTimeout(() => setMsg(''), 5000)
  }

  const features = Object.keys(consent).length > 0 ? Object.keys(consent) : ['data_sharing', 'marketing']

  return (
    <div>
      <p className="page-num" style={{ marginBottom: 4 }}>00<em>18</em> / 016</p>
      <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Privacy</h1>
      <p style={{ fontSize: 13.5, color: 'var(--ink-mute)', marginBottom: 16 }}>Your data, your control (DPDP compliance).</p>

      {msg && (
        <div className="card" style={{ padding: '10px 16px', marginBottom: 12, fontSize: 13, color: msg.includes('Error') || msg.includes('Failed') ? 'var(--coral)' : 'var(--emerald)' }}>
          {msg}
        </div>
      )}

      <div className="card" style={{ padding: '18px 20px', marginBottom: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, letterSpacing: '-0.01em' }}>Consent Management</p>
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

      <div className="card" style={{ padding: '18px 20px', marginBottom: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: '-0.01em' }}>Data & Erasure</p>
        <p style={{ fontSize: 12, color: 'var(--ink-mute)', marginBottom: 10 }}>Request deletion of your account and all associated data.</p>
        <button onClick={handleErasure} className="btn" style={{ fontSize: 12.5, padding: '7px 16px', background: 'var(--coral)', color: '#fff' }}>
          Request account erasure
        </button>
      </div>

      {erasures.length > 0 && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: 12, borderLeft: '3px solid #d4a017' }}>
          <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Pending Erasure Requests</p>
          {erasures.map((e, i) => (
            <div key={i} style={{ fontSize: 11.5, color: 'var(--ink-mute)', marginBottom: 4 }}>
              <p>Scheduled: {e.scheduled_for}</p>
              <p>Cancel token: <code style={{ fontSize: 11, background: 'var(--paper-warm)', padding: '1px 6px', borderRadius: 4 }}>{e.cancel_token}</code></p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
