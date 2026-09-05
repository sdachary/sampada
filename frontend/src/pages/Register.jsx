import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import AuthLayout from './AuthLayout'

const MIN_PASSWORD_LENGTH = 8

function passwordStrength(pw) {
  if (!pw) return 0
  let score = 0
  if (pw.length >= MIN_PASSWORD_LENGTH) score += 1
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1
  if (/\d/.test(pw)) score += 1
  if (/[^A-Za-z0-9]/.test(pw)) score += 1
  return score
}

const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong']

export default function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', password_confirmation: '', first_name: '', last_name: '' })
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState(false)
  const [ai, setAi] = useState({ provider: '', api_key: '' })
  const [aiSaving, setAiSaving] = useState(false)
  const [aiMsg, setAiMsg] = useState('')

  if (user && !registered) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < MIN_PASSWORD_LENGTH) return setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
    if (form.password !== form.password_confirmation) return setError('Passwords do not match')
    setSubmitting(true)
    setError('')
    try {
      await register(form)
      setRegistered(true)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
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
    <AuthLayout
      title="Create account"
      subtitle="Start your financial journey"
      error={error}
      after={registered && (
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
      foot={<><span>Already have one? </span><Link to="/login" style={{ color: 'var(--coral)' }}>Sign in</Link></>}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input type="text" placeholder="First name" autoComplete="given-name" value={form.first_name} onChange={set('first_name')} className="input" />
          <input type="text" placeholder="Last name" autoComplete="family-name" value={form.last_name} onChange={set('last_name')} className="input" />
        </div>
        <input type="email" placeholder="Email" autoComplete="email" value={form.email} onChange={set('email')} className="input" required />
        <div style={{ position: 'relative' }}>
          <input type={showPw ? 'text' : 'password'} placeholder="Password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} value={form.password} onChange={set('password')} className="input" required style={{ width: '100%' }} />
          <PwToggle show={showPw} setShow={setShowPw} />
        </div>
        {form.password && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, display: 'flex', gap: 3 }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i <= passwordStrength(form.password) ? ['var(--coral)', 'var(--coral)', 'var(--sun)', 'var(--emerald)'][passwordStrength(form.password) - 1] : 'var(--line)' }} />
                ))}
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--ink-mute)', minWidth: 36, textAlign: 'right' }}>{STRENGTH_LABEL[passwordStrength(form.password)]}</span>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--ink-mute)', marginTop: 5 }}>Use at least {MIN_PASSWORD_LENGTH} characters with a mix of uppercase, lowercase, numbers, and symbols.</p>
          </div>
        )}
        <div style={{ position: 'relative' }}>
          <input type={showConfirm ? 'text' : 'password'} placeholder="Confirm password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} value={form.password_confirmation} onChange={set('password_confirmation')} className="input" required style={{ width: '100%' }} />
          <PwToggle show={showConfirm} setShow={setShowConfirm} />
        </div>
        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ justifyContent: 'center', marginTop: 6 }}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  )
}
