import { useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '../lib/api'
import AuthLayout from './AuthLayout'
import { Input, Button, Card } from '../components/ui'
import { Reveal } from '../lib/motion-primitives'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await auth.forgotPassword(email, website)
      setSent(true)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (sent) return (
    <AuthLayout variant="success" icon="✉" title="Check your email" subtitle={<>If an account exists for <strong>{email}</strong>, we've sent a password reset link.</>}>
      <Link to="/login">
        <Button style={{ display: 'inline-flex', marginTop: 20, fontSize: 13, padding: '8px 20px' }}>Back to sign in</Button>
      </Link>
    </AuthLayout>
  )

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Enter your email and we'll send you a link."
      error={error}
      foot={<Link style={{ color: 'var(--accent)', fontWeight: 500 }} to="/login">Back to sign in</Link>}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Reveal delay={0}>
          <input
            type="text" name="website" value={website} onChange={e => setWebsite(e.target.value)}
            tabIndex={-1} autoComplete="off" aria-hidden="true"
            className="absolute -left-9999 w-1 h-1 opacity-0"
          />
        </Reveal>
        <Reveal delay={50}>
          <Input type="email" placeholder="Email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </Reveal>
        <Reveal delay={100}>
          <Button type="submit" loading={submitting} className="w-full sm:w-auto mx-auto sm:mx-0">
            {submitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </Reveal>
      </form>
    </AuthLayout>
  )
}