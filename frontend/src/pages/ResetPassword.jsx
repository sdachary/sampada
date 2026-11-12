import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { auth } from '../lib/api'
import AuthLayout from './AuthLayout'
import { Input, Button, Card } from '../components/ui'

const PwToggle = ({ show, setShow }) => (
  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink transition-colors" aria-label={show ? 'Hide password' : 'Show password'}>
    {show ? '◔' : '◑'}
  </button>
)

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
      <Link to="/login">
        <Button style={{ display: 'inline-flex', marginTop: 20, fontSize: 13, padding: '8px 20px' }}>Sign in</Button>
      </Link>
    </AuthLayout>
  )

  return (
    <AuthLayout
      title="Set new password"
      subtitle="Enter your new password below."
      error={error}
      foot={<Link style={{ color: 'var(--accent)', fontWeight: 500 }} to="/login">Back to sign in</Link>}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Input type={showPw ? 'text' : 'password'} placeholder="New password" autoComplete="new-password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required />
          <PwToggle show={showPw} setShow={setShowPw} />
        </div>
        <div className="relative">
          <Input type={showConfirm ? 'text' : 'password'} placeholder="Confirm password" autoComplete="new-password" minLength={8} value={passwordConfirmation} onChange={e => setPasswordConfirmation(e.target.value)} required />
          <PwToggle show={showConfirm} setShow={setShowConfirm} />
        </div>
        <Button type="submit" loading={submitting} className="w-full sm:w-auto mx-auto sm:mx-0">
          {submitting ? 'Resetting…' : 'Reset password'}
        </Button>
      </form>
    </AuthLayout>
  )
}