import { useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '../lib/api'
import AuthLayout from './AuthLayout'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await auth.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (sent) return (
    <AuthLayout variant="success" icon="✉" title="Check your email" subtitle={<>If an account exists for <strong>{email}</strong>, we've sent a password reset link.</>}>
      <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: 20, fontSize: 13, padding: '8px 20px' }}>Back to sign in</Link>
    </AuthLayout>
  )

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Enter your email and we'll send you a link."
      error={error}
      foot={<Link to="/login" style={{ color: 'var(--coral)' }}>Back to sign in</Link>}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input type="email" placeholder="Email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="input" required />
        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ justifyContent: 'center', marginTop: 6 }}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthLayout>
  )
}