import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import { api } from '../lib/api'
import AuthLayout from './AuthLayout'
import { Input, Select, Button, Card, Badge } from '../components/ui'
import { Reveal } from '../lib/motion-primitives'

const MIN_PASSWORD_LENGTH = 8

function passwordStrength(pw) {
  if (!pw) return 0
  let score = 0
  if (pw.length >= MIN_PASSWORD_LENGTH) score += 1
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1
  if (/\d/.test(pw)) score += 1
  if (/[^A-Za-z0-9]/.test(pw)) score += 1
  return score
}

const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLORS = ['var(--accent)', 'var(--accent)', 'var(--warning)', 'var(--success)']

const PwToggle = ({ show, setShow }) => (
  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink transition-colors" aria-label={show ? 'Hide password' : 'Show password'}>
    {show ? '◔' : '◑'}
  </button>
)

export default function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', password_confirmation: '', first_name: '', last_name: '' })
  const [website, setWebsite] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState(false)

  if (user && !registered) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < MIN_PASSWORD_LENGTH) return setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
    if (form.password !== form.password_confirmation) return setError('Passwords do not match')
    setSubmitting(true)
    setError('')
    try {
      await register({ ...form, website })
      setRegistered(true)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  const skipAi = () => navigate('/dashboard')

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <AuthLayout
      title="Create account"
      subtitle="Start your financial journey"
      error={error}
      after={registered && (
        <Reveal delay={0}>
          <Card className="card-shell card-shell--elevated card-core--pad-xl border-l-3 border-l-success mt-4">
            <h2 className="text-base font-semibold tracking-tight mb-1">Welcome to Sampada!</h2>
            <p className="text-sm text-muted mb-4">
              Your account is ready. You can enable the AI assistant anytime from Settings → AI Assistant.
            </p>
            <Button onClick={skipAi} className="w-full">Continue to dashboard</Button>
          </Card>
        </Reveal>
      )}
      foot={<><span>Already have one? </span><Link to="/login" className="text-accent font-medium">Sign in</Link></>}
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
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
            <Input placeholder="First name" autoComplete="given-name" value={form.first_name} onChange={set('first_name')} />
            <Input placeholder="Last name" autoComplete="family-name" value={form.last_name} onChange={set('last_name')} />
          </div>
        </Reveal>
        <Reveal delay={100}>
          <Input type="email" placeholder="Email" autoComplete="email" value={form.email} onChange={set('email')} required />
        </Reveal>
        <Reveal delay={150}>
          <div className="relative">
            <Input type={showPw ? 'text' : 'password'} placeholder="Password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} value={form.password} onChange={set('password')} required />
            <PwToggle show={showPw} setShow={setShowPw} />
          </div>
        </Reveal>
        {form.password && (
          <Reveal delay={200}>
            <div>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-1.5 flex-1 rounded-full transition-colors duration-fast" style={{ background: i <= passwordStrength(form.password) ? STRENGTH_COLORS[passwordStrength(form.password) - 1] : 'var(--border)' }} />
                  ))}
                </div>
                <span className="text-xs text-muted min-w-[36px] text-right">{STRENGTH_LABEL[passwordStrength(form.password)]}</span>
              </div>
              <p className="text-xs text-muted mt-1">Use at least {MIN_PASSWORD_LENGTH} characters with a mix of uppercase, lowercase, numbers, and symbols.</p>
            </div>
          </Reveal>
        )}
        <Reveal delay={250}>
          <div className="relative">
            <Input type={showConfirm ? 'text' : 'password'} placeholder="Confirm password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} value={form.password_confirmation} onChange={set('password_confirmation')} required />
            <PwToggle show={showConfirm} setShow={setShowConfirm} />
          </div>
        </Reveal>
        <Reveal delay={300}>
          <Button type="submit" loading={submitting} className="w-full sm:w-auto mx-auto sm:mx-0">
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>
        </Reveal>
      </form>
    </AuthLayout>
  )
}