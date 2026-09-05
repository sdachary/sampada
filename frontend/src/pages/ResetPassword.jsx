import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { auth } from '../lib/api'
import AuthLayout from './AuthLayout'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
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
    setSubmitting(true)
    setError('')
    try {
      await auth.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (done) return (
    <AuthLayout variant="success" icon="✓" title="Password reset" subtitle="Your password has been updated successfully.">
      <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: 20, fontSize: 13, padding: '8px 20px' }}>Sign in</Link>
    </AuthLayout>
  )

  const PwToggle = ({ show, setShow }) => (
    <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--ink-mute)', padding: 4 }} aria-label={show ? 'Hide password' : 'Show password'}>
      {show ? '◔' : '◑'}
    </button>
  )

  return (
    <AuthLayout
      title="Set new password"
      subtitle="Enter your new password below."
      error={error}
      foot={<Link to="/login" style={{ color: 'var(--coral)' }}>Back to sign in</Link>}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ position: 'relative' }}>
          <input type={showPw ? 'text' : 'password'} placeholder="New password" autoComplete="new-password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} className="input" required style={{ width: '100%' }} />
          <PwToggle show={showPw} setShow={setShowPw} />
        </div>
        <div style={{ position: 'relative' }}>
          <input type={showConfirm ? 'text' : 'password'} placeholder="Confirm password" autoComplete="new-password" minLength={8} value={passwordConfirmation} onChange={e => setPasswordConfirmation(e.target.value)} className="input" required style={{ width: '100%' }} />
          <PwToggle show={showConfirm} setShow={setShowConfirm} />
        </div>
        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ justifyContent: 'center', marginTop: 6 }}>
          {submitting ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
    </AuthLayout>
  )
}