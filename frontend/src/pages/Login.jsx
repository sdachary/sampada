import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import AuthLayout from './AuthLayout'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (user) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account"
      error={error}
      foot={<><span>No account? </span><Link to="/register" style={{ color: 'var(--coral)' }}>Register</Link></>}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input type="email" placeholder="Email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="input" required />
        <div style={{ position: 'relative' }}>
          <input type={showPw ? 'text' : 'password'} placeholder="Password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="input" required style={{ width: '100%' }} />
          <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--ink-mute)', padding: 4 }} aria-label={showPw ? 'Hide password' : 'Show password'}>
            {showPw ? '◔' : '◑'}
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4 }}>
          <Link to="/forgot-password" style={{ fontSize: 12.5, color: 'var(--ink-mute)' }}>Forgot password?</Link>
        </div>
        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ justifyContent: 'center', marginTop: 6 }}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  )
}
