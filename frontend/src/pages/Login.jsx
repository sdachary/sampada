import { useState, useEffect, useRef } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import AuthLayout from './AuthLayout'
import { Input, Button } from '../components/ui'
import { credentialToJSON, jsonToCredentialOptions, isPasskeySupported, isConditionalMediationSupported } from '../lib/passkeys'
import { workerAuth } from '../lib/api'
import OtpForm from '../components/OtpForm'

export default function Login() {
  const { user, checkAuth } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [passkeySupported, setPasskeySupported] = useState(false)
  const [conditionalSupported, setConditionalSupported] = useState(false)
  const emailRef = useRef(null)

  useEffect(() => {
    isPasskeySupported().then(setPasskeySupported)
    isConditionalMediationSupported().then(setConditionalSupported)
  }, [])

  if (user) return <Navigate to="/dashboard" replace />

  const finish = async () => {
    await checkAuth()
    navigate('/dashboard', { replace: true })
  }

  const handlePasskeyLogin = async () => {
    if (!passkeySupported) return
    setSubmitting(true)
    setError('')
    try {
      const options = await workerAuth.beginLogin(email)
      const publicKey = jsonToCredentialOptions(options)
      const credential = await navigator.credentials.get({
        publicKey,
        mediation: email ? 'required' : 'conditional',
      })
      if (!credential) {
        setSubmitting(false)
        return
      }
      await workerAuth.finishLogin(credentialToJSON(credential), email)
      await finish()
    } catch (err) {
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        setError(err.message || 'Passkey sign-in failed')
      }
      setSubmitting(false)
    }
  }

  const handleEmailChange = (e) => {
    setEmail(e.target.value)
    if (conditionalSupported && emailRef.current) {
      // Conditional mediation is attached to this field automatically.
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in with a passkey or an email code"
      error={error}
      foot={<><span>No account? </span><Link to="/register" className="inline-block py-3.5 -my-3.5 text-accent font-medium">Register</Link></>}
    >
      <div className="space-y-3">
        <Input
          ref={emailRef}
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={handleEmailChange}
          aria-invalid={!!error}
        />

        {passkeySupported && (
          <Button
            variant="secondary"
            type="button"
            onClick={handlePasskeyLogin}
            loading={submitting}
            disabled={submitting || !email}
            className="w-full sm:w-auto mx-auto sm:mx-0"
          >
            Use passkey
          </Button>
        )}

        <div className="flex items-center gap-3 text-muted text-sm">
          <div className="flex-1 h-px bg-border" />
          <span>or</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <OtpForm email={email} mode="signin" onVerified={finish} />
      </div>
    </AuthLayout>
  )
}
