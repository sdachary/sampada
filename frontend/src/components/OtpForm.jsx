// Email OTP: request a six-digit code, then verify it into a live session.
import { useEffect, useState } from 'react'
import { workerAuth } from '../lib/api'
import { Button, Input } from './ui'
import Turnstile from './Turnstile'

function CountdownRing({ seconds, total = 60 }) {
  const radius = 9
  const circumference = 2 * Math.PI * radius
  return (
    <span className="inline-flex items-center gap-2" role="timer" aria-label={`Resend available in ${seconds} seconds`}>
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <circle cx="11" cy="11" r={radius} fill="none" stroke="var(--line)" strokeWidth="2.5" />
        <circle
          cx="11" cy="11" r={radius} fill="none" stroke="var(--accent)" strokeWidth="2.5"
          strokeLinecap="round" strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - seconds / total)}
          transform="rotate(-90 11 11)"
        />
      </svg>
      <span className="fin tabular-nums">{seconds}s</span>
    </span>
  )
}

export default function OtpForm({ email, firstName = '', lastName = '', attested = false, mode = 'signin', onVerified }) {
  const [step, setStep] = useState('request')
  const [code, setCode] = useState('')
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((n) => n - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const request = async () => {
    if (!email || !email.includes('@')) return setError('Enter a valid email first')
    if (mode === 'signup' && !attested) return setError('Confirm you are 18 or older')
    setBusy(true)
    setError('')
    try {
      await workerAuth.otpRequest({
        email,
        turnstileToken: token,
        firstName: mode === 'signup' ? firstName : undefined,
        lastName: mode === 'signup' ? lastName : undefined,
        adultAttested: mode === 'signup' ? attested : false,
      })
      setStep('code')
      setNotice('Code sent. It expires in 10 minutes.')
      setCooldown(60)
    } catch (err) {
      setError(err.message || 'Could not send code')
    } finally {
      setBusy(false)
    }
  }

  const verify = async (e) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) return setError('Enter the six-digit code')
    setBusy(true)
    setError('')
    try {
      const result = await workerAuth.otpVerify(email, code)
      await onVerified?.(result)
    } catch (err) {
      setError(err.message || 'Invalid or expired code')
      setBusy(false)
    }
  }

  if (step === 'request') {
    return (
      <div className="space-y-3 pt-1">
        <Turnstile onToken={setToken} />
        <Button
          type="button"
          variant="secondary"
          onClick={request}
          loading={busy}
          disabled={busy || !email || (!!siteKey && !token)}
          className="w-full sm:w-auto mx-auto sm:mx-0"
        >
          {mode === 'signup' ? 'Create account with email code' : 'Email me a sign-in code'}
        </Button>
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      </div>
    )
  }

  return (
    <form onSubmit={verify} className="space-y-3 pt-1">
      <p className="text-sm text-muted" role="status">{notice}</p>
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="6-digit code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        aria-label="Six-digit sign-in code"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={busy} disabled={busy || code.length !== 6}>
          Verify and continue
        </Button>
        <button
          type="button"
          onClick={request}
          disabled={busy || cooldown > 0}
          className="text-sm text-accent font-medium disabled:text-muted disabled:cursor-not-allowed py-2"
        >
          {cooldown > 0 ? <CountdownRing seconds={cooldown} /> : 'Resend code'}
        </button>
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </form>
  )
}
