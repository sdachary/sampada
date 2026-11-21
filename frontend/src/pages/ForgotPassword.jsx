import { useState } from 'react'
import { Link } from 'react-router-dom'
import { workerAuth } from '../lib/api'
import AuthLayout from './AuthLayout'
import { Input, Button } from '../components/ui'
import Turnstile from '../components/Turnstile'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await workerAuth.magicLinkRequest(email, turnstileToken)
      setSent(true)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (sent) return (
    <AuthLayout variant="success" icon="✉" title="Check your email" subtitle={<>If an account exists for <strong>{email}</strong>, we've sent a sign-in link that expires in 10 minutes.</>}>
      <Link to="/login">
        <Button className="mt-4">Back to sign in</Button>
      </Link>
    </AuthLayout>
  )

  return (
    <AuthLayout
      title="Get a sign-in link"
      subtitle="Enter your email and we'll send you a one-time link."
      error={error}
      foot={<Link className="text-accent font-medium" to="/login">Back to sign in</Link>}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input type="email" placeholder="Email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <Turnstile onToken={setTurnstileToken} />
        <Button type="submit" loading={submitting} className="w-full sm:w-auto mx-auto sm:mx-0">
          {submitting ? 'Sending…' : 'Send sign-in link'}
        </Button>
      </form>
    </AuthLayout>
  )
}