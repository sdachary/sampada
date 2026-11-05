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
      const res = await api.request('/api/v1/auth/passkeys/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email, credential: credentialJSON })
      })
      // Use the same auth flow as password login
      localStorage.setItem('sampada_token', res.token)
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
    // If conditional mediation is supported, trigger autofill on focus
    if (conditionalSupported && emailRef.current) {
      // The conditional UI is attached to the email field automatically
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account"
      error={error}
      foot={<><span>No account? </span><Link to="/register" style={{ color: 'var(--accent)', fontWeight: 500 }}>Register</Link></>}
    >
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
        <input
          type="text" name="website" value={website} onChange={e => setWebsite(e.target.value)}
          tabIndex={-1} autoComplete="off" aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
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
        <div style={{ position: 'relative' }}>
          <Input
            type={showPw ? 'text' : 'password'}
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--muted)', padding: 4 }} aria-label={showPw ? 'Hide password' : 'Show password'}>
            {showPw ? '◔' : '◑'}
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4 }}>
          <Link to="/forgot-password" style={{ fontSize: 12.5, color: 'var(--muted)' }}>Forgot password?</Link>
        </div>
        <Button type="submit" loading={submitting} style={{ justifySelf: 'center' }}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>

        {passkeySupported && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, color: 'var(--muted)', fontSize: 12.5 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <Button
              variant="secondary"
              type="button"
              onClick={handlePasskeyLogin}
              loading={submitting}
              disabled={submitting}
              style={{ justifySelf: 'center' }}
            >
              {submitting ? 'Signing in…' : 'Use passkey'}
            </Button>
          </>
        )}
      </form>
    </AuthLayout>
  )
}