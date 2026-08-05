import { useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await auth.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    }
  }

  if (sent) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
      <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <div className="card" style={{ padding: 32 }}>
          <p style={{ fontSize: 28, marginBottom: 12 }}>✉</p>
          <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Check your email</h1>
          <p style={{ fontSize: 13.5, color: 'var(--ink-mute)', lineHeight: 1.6 }}>
            If an account exists for <strong>{email}</strong>, we've sent a password reset link.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: 20, fontSize: 13, padding: '8px 20px' }}>Back to sign in</Link>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Sampada</Link>
        </div>
        <div className="card" style={{ padding: 32 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Reset password</h1>
          <p style={{ fontSize: 13.5, color: 'var(--ink-mute)', marginBottom: 24 }}>Enter your email and we'll send you a link.</p>
          {error && <p style={{ fontSize: 13, color: 'var(--coral)', marginBottom: 16 }}>{error}</p>}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="input" required />
            <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', marginTop: 6 }}>Send reset link</button>
          </form>
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-mute)', marginTop: 20 }}>
          <Link to="/login" style={{ color: 'var(--coral)' }}>Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}