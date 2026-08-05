import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', password_confirmation: '', first_name: '', last_name: '' })
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')

  if (user) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.password_confirmation) return setError('Passwords do not match')
    try {
      await register(form)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
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
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-mute)', marginTop: 20 }}>
          Already have one? <Link to="/login" style={{ color: 'var(--coral)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
