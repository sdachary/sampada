import { useState, useEffect, useRef } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import AuthLayout from './AuthLayout'
import { Input, Button } from '../components/ui'
import { credentialToJSON, jsonToCredentialOptions, isPasskeySupported, isConditionalMediationSupported } from '../lib/passkeys'
import { api } from '../lib/api'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [website, setWebsite] = useState('')
  const [showPw, setShowPw] = useState(false)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await login(email, password, website)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  const handlePasskeyLogin = async () => {
    if (!passkeySupported) return
    setSubmitting(true)
    setError('')
    try {
      const { options } = await api.request(`/api/v1/auth/passkeys/auth/options?email=${encodeURIComponent(email)}`)
      const publicKey = jsonToCredentialOptions(options)
      const credential = await navigator.credentials.get({
        publicKey,
        mediation: email ? 'required' : 'conditional'
      })
      if (!credential) {
        setSubmitting(false)
        return
      }
      const credentialJSON = credentialToJSON(credential)
      const _res = await api.request('/api/v1/auth/passkeys/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email, credential: credentialJSON })
      })
      navigate('/dashboard')
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        // User dismissed the dialog - silent
      } else {
        setError(err.message || 'Passkey sign-in failed')
      }
      setSubmitting(false)
    }
  }

  const handleEmailChange = (e) => {
    setEmail(e.target.value)
    if (conditionalSupported && emailRef.current) {
      // The conditional UI is attached to the email field automatically
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account"
      error={error}
      foot={<><span>No account? </span><Link to="/register" className="text-accent font-medium">Register</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text" name="website" value={website} onChange={e => setWebsite(e.target.value)}
          tabIndex={-1} autoComplete="off" aria-hidden="true"
          className="absolute -left-9999 w-1 h-1 opacity-0"
        />
        <Input
          ref={emailRef}
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={handleEmailChange}
          required
        />
        <div className="relative">
          <Input
            type={showPw ? 'text' : 'password'}
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink transition-colors" aria-label={showPw ? 'Hide password' : 'Show password'}>
            {showPw ? '◔' : '◑'}
          </button>
        </div>
        <div className="flex justify-end mt-n2">
          <Link to="/forgot-password" className="text-sm text-muted hover:text-ink transition-colors">Forgot password?</Link>
        </div>
        <Button type="submit" loading={submitting} className="w-full sm:w-auto mx-auto sm:mx-0">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>

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
              {submitting ? 'Signing in…' : 'Use passkey'}
            </Button>
          </>
        )}
      </form>
    </AuthLayout>
  )
}