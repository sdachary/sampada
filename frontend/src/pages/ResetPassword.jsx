import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { auth } from '../lib/api'

export default function ResetPassword() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const t = searchParams.get('token')
    const err = searchParams.get('error')
    if (err) setError(err === 'INVALID_TOKEN' ? 'Invalid or expired reset link' : err)
    if (t) setToken(t)
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== passwordConfirmation) return setError('Passwords do not match')
    try {
      await auth.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err.message)
    }
  }

  if (done) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
      <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <div className="card" style={{ padding: 32 }}>
          <p style={{ fontSize: 28, marginBottom: 12 }}>✓</p>
          <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Password reset</h1>
          <p style={{ fontSize: 13.5, color: 'var(--ink-mute)', lineHeight: 1.6 }}>Your password has been updated successfully.</p>
          <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: 20, fontSize: 13, padding: '8px 20px' }}>Sign in</Link>
        </div>
      </div>
    </div>
  )

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
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Set new password</h1>
          <p style={{ fontSize: 13.5, color: 'var(--ink-mute)', marginBottom: 24 }}>Enter your new password below.</p>
          {error && <p style={{ fontSize: 13, color: 'var(--coral)', marginBottom: 16 }}>{error}</p>}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} className="input" required style={{ width: '100%' }} />
              <PwToggle show={showPw} setShow={setShowPw} />
            </div>
            <div style={{ position: 'relative' }}>
              <input type={showConfirm ? 'text' : 'password'} placeholder="Confirm password" value={passwordConfirmation} onChange={e => setPasswordConfirmation(e.target.value)} className="input" required style={{ width: '100%' }} />
              <PwToggle show={showConfirm} setShow={setShowConfirm} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', marginTop: 6 }}>Reset password</button>
          </form>
        </div>
      </div>
    </div>
  )
}