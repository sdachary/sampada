import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'

export default function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', password_confirmation: '', first_name: '', last_name: '' })
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState(false)
  const [ai, setAi] = useState({ provider: '', api_key: '' })
  const [aiSaving, setAiSaving] = useState(false)
  const [aiMsg, setAiMsg] = useState('')

  if (user && !registered) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.password_confirmation) return setError('Passwords do not match')
    try {
      await register(form)
      setRegistered(true)
    } catch (err) {
      setError(err.message)
    }
  }

  const skipAi = () => navigate('/dashboard')

  const saveAi = async (e) => {
    e.preventDefault()
    if (!ai.provider || !ai.api_key) return
    setAiSaving(true)
    try {
      await api.request('/api/v1/ai_settings', {
        method: 'PUT',
        body: JSON.stringify({ provider: ai.provider, api_key: ai.api_key }),
      })
      navigate('/dashboard')
    } catch (err) {
      setAiMsg(err.message)
      setAiSaving(false)
    }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const PwToggle = ({ show, setShow }) => (
    <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--ink-mute)', padding: 4 }} aria-label={show ? 'Hide password' : 'Show password'}>
      {show ? '◔' : '◑'}
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Sampada</Link>
        </div>
        <div className="card" style={{ padding: 32 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Create account</h1>
          <p style={{ fontSize: 13.5, color: 'var(--ink-mute)', marginBottom: 24 }}>Start your financial journey</p>
          {error && <p style={{ fontSize: 13, color: 'var(--coral)', marginBottom: 16 }}>{error}</p>}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input type="text" placeholder="First name" value={form.first_name} onChange={set('first_name')} className="input" />
              <input type="text" placeholder="Last name" value={form.last_name} onChange={set('last_name')} className="input" />
            </div>
            <input type="email" placeholder="Email" value={form.email} onChange={set('email')} className="input" required />
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={set('password')} className="input" required style={{ width: '100%' }} />
              <PwToggle show={showPw} setShow={setShowPw} />
            </div>
            <div style={{ position: 'relative' }}>
              <input type={showConfirm ? 'text' : 'password'} placeholder="Confirm password" value={form.password_confirmation} onChange={set('password_confirmation')} className="input" required style={{ width: '100%' }} />
              <PwToggle show={showConfirm} setShow={setShowConfirm} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', marginTop: 6 }}>Create account</button>
          </form>
        </div>

        {registered && (
          <div className="card" style={{ padding: 24, marginTop: 16, borderLeft: '3px solid var(--emerald)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 4 }}>Optional: enable AI assistant</h2>
            <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', marginBottom: 14 }}>
              Add a Gemini, Grok, or OpenAI-compatible API key to chat with your finances. Skip to start with it disabled.
            </p>
            {aiMsg && <p style={{ fontSize: 12, color: 'var(--coral)', marginBottom: 10 }}>{aiMsg}</p>}
            <form onSubmit={saveAi} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select className="input" value={ai.provider} onChange={e => setAi(a => ({ ...a, provider: e.target.value }))}>
                <option value="">Select provider…</option>
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
                <option value="grok">xAI Grok</option>
                <option value="openrouter">OpenRouter</option>
              </select>
              <input type="password" className="input" placeholder="API key" value={ai.api_key} onChange={e => setAi(a => ({ ...a, api_key: e.target.value }))} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={!ai.provider || !ai.api_key || aiSaving} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: 13, padding: '9px 0' }}>
                  {aiSaving ? 'Saving…' : 'Enable & continue'}
                </button>
                <button type="button" onClick={skipAi} className="btn" style={{ background: 'transparent', border: '1px solid var(--line)', fontSize: 13, padding: '9px 18px' }}>Skip</button>
              </div>
            </form>
          </div>
        )}
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-mute)', marginTop: 20 }}>
          Already have one? <Link to="/login" style={{ color: 'var(--coral)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
