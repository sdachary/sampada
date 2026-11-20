import { useState, useEffect, useRef } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import AuthLayout from './AuthLayout'
import { Input, Button } from '../components/ui'
import { credentialToJSON, jsonToCredentialOptions, isPasskeySupported, isConditionalMediationSupported } from '../lib/passkeys'
import { workerAuth } from '../lib/api'
import Turnstile from '../components/Turnstile'

export default function Login() {
  const { user, checkAuth } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [passkeySupported, setPasskeySupported] = useState(false)
  const [conditionalSupported, setConditionalSupported] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [sentLink, setSentLink] = useState(false)
  const emailRef = useRef(null)

  useEffect(() => {
    isPasskeySupported().then(setPasskeySupported)
    isConditionalMediationSupported().then(setConditionalSupported)
  }, [])

  if (user) return <Navigate to="/dashboard" replace />

  const handleMagicLink = async () => {
    setSubmitting(true)
    setError('')
    try {
      await workerAuth.magicLinkRequest(email, turnstileToken)
      setSentLink(true)
    } catch (err) {
      setError(err.message || 'Could not send sign-in link')
    } finally {
      setSubmitting(false)
    }
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
      const credentialJSON = credentialToJSON(credential)
      await workerAuth.finishLogin(credentialJSON, email)
      await checkAuth()
      navigate('/dashboard')
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
      subtitle="Sign in with a passkey or a one-time link"
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
          <>
            <div className="flex items-center gap-3 text-muted text-sm">
              <div className="flex-1 h-px bg-border" />
              <span>or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <Button
              variant="secondary"
              type="button"
              onClick={handlePasskeyLogin}
              loading={submitting}
              disabled={submitting}
              className="w-full sm:w-auto mx-auto sm:mx-0"
            >
              Use passkey
            </Button>
          </>
        )}

        <div className="flex items-center gap-3 text-muted text-sm">
          <div className="flex-1 h-px bg-border" />
          <span>or</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <Turnstile onToken={setTurnstileToken} />
        <Button
          variant="secondary"
          type="button"
          onClick={handleMagicLink}
          loading={submitting}
          disabled={submitting || !email || !turnstileToken}
          className="w-full sm:w-auto mx-auto sm:mx-0"
        >
          Email me a sign-in link
        </Button>
        {sentLink && (
          <p className="text-sm text-accent" role="status">
            If an account exists for that email, a sign-in link is on its way. It expires in 10 minutes.
          </p>
        )}
      </div>
    </AuthLayout>
  )
}
