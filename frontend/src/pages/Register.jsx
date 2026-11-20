import { useState, useEffect } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import { workerAuth } from '../lib/api'
import AuthLayout from './AuthLayout'
import { Input, Button } from '../components/ui'
import OtpForm from '../components/OtpForm'
import { credentialToJSON, jsonToCredentialOptions, isPasskeySupported } from '../lib/passkeys'

export default function Register() {
  const { user, checkAuth } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' })
  const [attested, setAttested] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    isPasskeySupported().then(setSupported)
  }, [])

  if (user) return <Navigate to="/dashboard" replace />

  const finish = async () => {
    await checkAuth()
    navigate('/dashboard', { replace: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!attested) return setError('I confirm I am 18 years of age or older')
    setSubmitting(true)
    setError('')
    try {
      const options = await workerAuth.beginRegister({
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        adultAttested: true,
      })
      const publicKey = jsonToCredentialOptions(options)
      const credential = await navigator.credentials.create({ publicKey })
      if (!credential) {
        setSubmitting(false)
        return
      }
      await workerAuth.finishRegister(credentialToJSON(credential), form.email)
      await finish()
    } catch (err) {
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        setError(err.message)
      }
      setSubmitting(false)
    }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <AuthLayout
      title="Create account"
      subtitle="A passkey or an email code. No password to remember."
      error={error}
      foot={<><span>Already have one? </span><Link to="/login" className="inline-block py-3 text-accent font-medium">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
          <Input placeholder="First name" autoComplete="given-name" value={form.firstName} onChange={set('firstName')} required />
          <Input placeholder="Last name" autoComplete="family-name" value={form.lastName} onChange={set('lastName')} required />
        </div>
        <Input type="email" placeholder="Email" autoComplete="email" value={form.email} onChange={set('email')} required />
        <label className="flex items-center gap-2 min-h-11 text-sm text-muted cursor-pointer">
          <input type="checkbox" checked={attested} onChange={e => setAttested(e.target.checked)} required className="w-4 h-4" />
          <span>I confirm I am 18 years of age or older</span>
        </label>
        <p className="text-xs text-muted">
          By creating an account you acknowledge our <Link to="/privacy" className="text-accent font-medium">Privacy Policy</Link>.
        </p>
        {supported && (
          <Button type="submit" loading={submitting} disabled={!attested} className="w-full sm:w-auto mx-auto sm:mx-0">
            {submitting ? 'Creating account…' : 'Create account with passkey'}
          </Button>
        )}
      </form>

      <div className="flex items-center gap-3 text-muted text-sm mt-4">
        <div className="flex-1 h-px bg-border" />
        <span>or</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <OtpForm
        email={form.email}
        firstName={form.firstName}
        lastName={form.lastName}
        attested={attested}
        mode="signup"
        onVerified={finish}
      />
    </AuthLayout>
  )
}
