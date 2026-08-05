import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { api, auth as authApi } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { Field } from '../components/ui'

const PROVIDERS = [
  { value: 'zerodha', label: 'Zerodha' },
  { value: 'groww', label: 'Groww' },
  { value: 'angel_one', label: 'Angel One' },
  { value: 'upstox', label: 'Upstox' },
  { value: 'icici', label: 'ICICI Direct' },
  { value: 'hdfc_sec', label: 'HDFC Securities' },
  { value: 'kotak_sec', label: 'Kotak Securities' },
  { value: 'other', label: 'Other' },
]

export default function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    currency: user?.currency || 'INR',
  })
  const [credentials, setCredentials] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [newCred, setNewCred] = useState({ provider: '', label: '', encrypted_value: '' })

  useEffect(() => { fetchCredentials() }, [])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    try {
      await api.request('/api/v1/auth/profile', { method: 'PATCH', body: JSON.stringify(form) })
      setMsg('Profile updated')
      setEditing(false)
    } catch (e) {
      setMsg(e.message)
    }
    setTimeout(() => setMsg(''), 3000)
  }

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/v1/dpdp/full-export', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `sampada-full-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      setMsg('Full export downloaded')
    } catch { setMsg('Export failed') }
    setTimeout(() => setMsg(''), 3000)
  }

  const fetchCredentials = async () => {
    try {
      const data = await api.request('/api/v1/api_credentials')
      setCredentials(data.credentials)
    } catch { /* ignore */ }
  }

  const addCredential = async () => {
    if (!newCred.provider || !newCred.encrypted_value) return
    try {
      await api.request('/api/v1/api_credentials', {
        method: 'POST',
        body: JSON.stringify({ api_credential: newCred }),
      })
      setShowAdd(false)
      setNewCred({ provider: '', label: '', encrypted_value: '' })
      fetchCredentials()
      setMsg('API key added')
    } catch (e) { setMsg(e.message) }
    setTimeout(() => setMsg(''), 3000)
  }

  const deleteCredential = async (id) => {
    try {
      await api.request(`/api/v1/api_credentials/${id}`, { method: 'DELETE' })
      fetchCredentials()
      setMsg('API key removed')
    } catch (e) { setMsg(e.message) }
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div>
      <p className="page-num" style={{ marginBottom: 4 }}>00<em>17</em> / 016</p>
      <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Settings</h1>
      <p style={{ fontSize: 13.5, color: 'var(--ink-mute)', marginBottom: 16 }}>Account preferences and profile.</p>

      {msg && (
        <div className="card" style={{ padding: '10px 16px', marginBottom: 12, fontSize: 13, color: msg.startsWith('Error') || msg.includes('fail') ? 'var(--coral)' : '#2d7d6a' }}>
          {msg}
        </div>
      )}

      <div className="card" style={{ padding: '18px 20px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '-0.01em' }}>Profile</p>
          <button onClick={() => setEditing(!editing)} className="btn btn-ghost" style={{ fontSize: 11.5, padding: '5px 12px' }}>
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="First Name" labelStyle={{ fontSize: 11 }}>
                <input className="input" value={form.first_name} onChange={set('first_name')} />
              </Field>
              <Field label="Last Name" labelStyle={{ fontSize: 11 }}>
                <input className="input" value={form.last_name} onChange={set('last_name')} />
              </Field>
            </div>
            <Field label="Currency" labelStyle={{ fontSize: 11 }}>
              <select className="input" value={form.currency} onChange={set('currency')}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </Field>
            <button onClick={handleSave} className="btn btn-primary" style={{ alignSelf: 'flex-start', fontSize: 13, padding: '8px 20px' }}>Save</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--ink-mute)', marginBottom: 2 }}>Name</p>
              <p style={{ fontSize: 14, fontWeight: 500 }}>{user?.first_name} {user?.last_name}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--ink-mute)', marginBottom: 2 }}>Email</p>
              <p style={{ fontSize: 14, fontWeight: 500 }}>{user?.email}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--ink-mute)', marginBottom: 2 }}>Currency</p>
              <p style={{ fontSize: 14, fontWeight: 500 }}>{user?.currency || 'INR'}</p>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '18px 20px', marginBottom: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.01em' }}>Data & Privacy</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleExport} className="btn btn-ghost" style={{ fontSize: 12.5, padding: '7px 16px' }}>
            Download full export
          </button>
          <a href="/dashboard/privacy" className="btn btn-ghost" style={{ fontSize: 12.5, padding: '7px 16px' }}>
            Privacy controls
          </a>
        </div>
      </div>

      <div className="card" style={{ padding: '18px 20px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '-0.01em' }}>API Keys</p>
          <button onClick={() => setShowAdd(!showAdd)} className="btn btn-ghost" style={{ fontSize: 11.5, padding: '5px 12px' }}>
            {showAdd ? 'Cancel' : 'Add'}
          </button>
        </div>

        {showAdd && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            <select className="input" value={newCred.provider} onChange={e => setNewCred(c => ({ ...c, provider: e.target.value }))}>
              <option value="">Select provider…</option>
              {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <input className="input" placeholder="Label (optional)" value={newCred.label} onChange={e => setNewCred(c => ({ ...c, label: e.target.value }))} />
            <input className="input" placeholder="API key / token" value={newCred.encrypted_value} onChange={e => setNewCred(c => ({ ...c, encrypted_value: e.target.value }))} />
            <button onClick={addCredential} className="btn btn-primary" style={{ alignSelf: 'flex-start', fontSize: 13, padding: '8px 20px' }}>Save</button>
          </div>
        )}

        {credentials.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--ink-mute)' }}>No API keys configured yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {credentials.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg)', borderRadius: 6 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>{c.label || PROVIDERS.find(p => p.value === c.provider)?.label || c.provider}</p>
                  <p style={{ fontSize: 11, color: 'var(--ink-mute)' }}>{c.provider}</p>
                </div>
                <button onClick={() => deleteCredential(c.id)} className="btn" style={{ fontSize: 11, padding: '4px 10px', background: 'transparent', border: '1px solid var(--line)', color: 'var(--coral)' }}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '18px 20px', borderLeft: '3px solid var(--ink-faint)' }}>
        <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, letterSpacing: '-0.01em' }}>Logout</p>
        <p style={{ fontSize: 12, color: 'var(--ink-mute)', marginBottom: 8 }}>Sign out of your account.</p>
        <button onClick={() => { logout(); navigate('/') }}
          className="btn" style={{ fontSize: 12.5, padding: '7px 16px', background: 'transparent', border: '1px solid var(--line)', color: 'var(--coral)' }}>
          Sign out
        </button>
      </div>
    </div>
  )
}
