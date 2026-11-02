import { useEffect, useState, useRef, Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import { Reveal, PageTransition } from '../lib/motion-primitives'
import { Check, X, TrendingDown, PiggyBank, RefreshCw, MessageSquare, AlertTriangle, Globe, Users, Cpu } from 'lucide-react'
import { Card, Button, PageHeader, fmtINR } from '../components/ui'

// 3D hero lazy import (Step 9) - loaded after first paint, landing route only
const Hero3D = lazy(() => import('../landing/hero3d/Hero3D').then(m => ({ default: m.Hero3DWithFallback })))
const HeroPoster = lazy(() => import('../landing/hero3d/HeroPoster'))

function Hero3DLoader() {
  const [show3D, setShow3D] = useState(false)
  const [showPoster, setShowPoster] = useState(true)
  const canvasRef = useRef(null)

  // Check hardware capabilities for 3D rendering
  const canRender3D = () => {
    if (typeof window === 'undefined') return false
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) return false

    // Check viewport
    if (window.innerWidth < 768) return false

    // Check reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false

    // Check save-data
    if (navigator.connection?.saveData === true) return false

    // Check hardware concurrency
    if (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4) return false

    return true
  }

  useEffect(() => {
    if (!canRender3D()) return

    // Load 3D after first paint
    const timer = requestIdleCallback
      ? requestIdleCallback(() => setShow3D(true), { timeout: 2000 })
      : setTimeout(() => setShow3D(true), 1000)

    return () => cancelIdleCallback?.(timer) || clearTimeout(timer)
  }, [])

  const handleCanvasReady = () => {
    setShowPoster(false)
  }

  return (
    <div id="landing-3d-slot" style={{ width: '100%', maxWidth: 400, aspectRatio: '1/1', margin: '48px auto 0', position: 'relative' }}>
      {/* Poster - shown immediately */}
      <Suspense fallback={<div style={{ width: '100%', aspectRatio: '1/1', background: 'var(--border-soft)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true" />}>
        <HeroPoster ref={showPoster ? undefined : null} style={{ position: 'absolute', inset: 0, transition: 'opacity 0.6s ease', opacity: showPoster && !show3D ? 1 : 0, pointerEvents: 'none' }} />
      </Suspense>

      {/* 3D canvas - fades in */}
      {show3D && (
        <Suspense fallback={<div style={{ position: 'absolute', inset: 0, background: 'var(--border-soft)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true" />}>
          <Hero3D
            ref={canvasRef}
            onLoad={handleCanvasReady}
            style={{ position: 'absolute', inset: 0, opacity: showPoster ? 0 : 1, transition: 'opacity 0.6s ease' }}
            aria-hidden="true"
          />
        </Suspense>
      )}
    </div>
  )
}

const FEATURES = [
  { icon: 'TrendingDown', title: 'Debt payoff tracker', body: 'Avalanche or snowball order, a full EMI calendar, and a month-by-month projection to your debt-free date.' },
  { icon: 'PiggyBank', title: 'Dividend SIP planner', body: 'Set an income target and timeline. Sampada\'s AI picks 2–3 dividend stocks to match.' },
  { icon: 'RefreshCw', title: 'Portfolio rebalancing', body: 'Modern Portfolio Theory checks your allocation every month and flags what\'s off track.' },
  { icon: 'MessageSquare', title: 'Natural-language entries', body: '"I spent ₹500 on groceries" becomes a categorized transaction, no forms.' },
  { icon: 'AlertTriangle', title: 'Anomaly detection', body: 'A 3-sigma algorithm flags spending that breaks your normal pattern, automatically.' },
  { icon: 'Globe', title: 'Multi-currency, global markets', body: '32 currencies with live rates. NYSE, NASDAQ, LSE, TSE, ASX — plus native NSE/BSE support.' },
  { icon: 'Users', title: 'Household sharing', body: 'Add family members with role-based access and one shared household dashboard.' },
  { icon: 'Cpu', title: 'Free AI, by default', body: 'Runs on OpenRouter\'s free models or fully local via Ollama. No AI paywall, ever.' },
]

const COMPARE_ROWS = [
  ['Self-hosted', true, false, false],
  ['Free, no subscription', true, false, 'was free'],
  ['Debt-first philosophy', true, 'partial', false],
  ['Multi-currency', true, false, false],
  ['NSE / BSE markets', true, false, false],
  ['Natural-language entries', true, false, false],
  ['Free AI included', true, false, false],
]

function CompareCell({ value }) {
  if (value === true) return <Check size={15} color="var(--success)" strokeWidth={2.5} />
  if (value === false) return <X size={15} color="var(--faint)" strokeWidth={2} />
  return <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{value}</span>
}

function Stage({ label, desc, color, pct, index }) {
  return (
    <div style={{ padding: '32px 20px', textAlign: 'center', background: index === 1 ? 'var(--surface)' : 'transparent', borderLeft: index > 0 ? '1px solid var(--border)' : 'none' }}>
      <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Stage {index + 1}</p>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: color, marginBottom: 6 }}>{label}</div>
      <div style={{ height: 3, width: pct, background: color, borderRadius: 2, margin: '0 auto 10px' }} />
      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, maxWidth: 200, margin: '0 auto' }}>{desc}</p>
    </div>
  )
}

const FEATURE_ICONS = {
  TrendingDown,
  PiggyBank,
  RefreshCw,
  MessageSquare,
  AlertTriangle,
  Globe,
  Users,
  Cpu,
}

function FeatureCard({ f }) {
  const Icon = FEATURE_ICONS[f.icon]

  return (
    <Card style={{ padding: '22px 22px' }}>
      <Icon className="mb-12" size={20} color="var(--accent)" strokeWidth={1.75} />
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 6 }}>{f.title}</h3>
      <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55 }}>{f.body}</p>
    </Card>
  )
}

export default function Landing() {
  return (
    <PageTransition>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em', color: 'var(--ink)', textDecoration: 'none' }}>
            <img src="/brand-mark.png" alt="" width={22} height={22} style={{ borderRadius: 6 }} />Sampada
          </Link>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <ThemeToggle />
            <Link to="/login" style={{ fontSize: 13.5, color: 'var(--muted)', textDecoration: 'none' }}>Sign in</Link>
            <Link to="/register">
              <Button>Get started</Button>
            </Link>
          </div>
        </nav>

        {/* 1. Hero */}
        <section style={{ padding: '80px 0 56px', textAlign: 'center' }}>
          <Reveal>
            <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>001 / 005</p>
            <h1 style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 16, fontFamily: 'var(--font-display)' }}>
              Zero is better than <em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--accent)' }}>negative</em>.
            </h1>
            <p style={{ fontSize: 16, color: 'var(--muted)', maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.6 }}>
              Debt payoff, AI-guided SIPs, and portfolio rebalancing in one self-hosted app — built to clear what you owe before it grows what you keep.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/register">
                <Button>Get started free</Button>
              </Link>
            </div>
            <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 20, letterSpacing: '0.02em' }}>
              Open source · Apache 2.0 · Free forever
            </p>
          </Reveal>

          {/* 3D hero slot with lazy-loaded canvas + poster fallback */}
          <Hero3DLoader />
        </section>

        {/* 2. Debt → Zero → Wealth arc */}
        <Reveal delay={0.1}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {[
              { label: 'Negative', desc: 'Track everything you owe. See the full picture of your debt.', color: 'var(--accent)', pct: '33%' },
              { label: 'Zero', desc: 'Set a debt-free target. Watch your progress toward zero.', color: 'var(--ink)', pct: '33%' },
              { label: 'Wealth', desc: 'Grow your net worth. Invest, save, and build your future.', color: 'var(--success)', pct: '34%' },
            ].map((s, i) => (
              <Stage key={s.label} {...s} index={i} />
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.2}>
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', maxWidth: 420, margin: '14px auto 40px', lineHeight: 1.6 }}>
            Set a goal like <em style={{ fontStyle: 'italic', color: 'var(--faint)' }}>"₹25,000/month passive income by 2030"</em> — Sampada reverse-engineers the SIP amount, stock picks, and rebalance cadence to get there.
          </p>
        </Reveal>

        {/* 3. Feature grid */}
        <section style={{ padding: '40px 0 60px' }}>
          <Reveal>
            <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6, textAlign: 'center' }}>002 / 005</p>
            <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)', maxWidth: 460, margin: '0 auto 36px', lineHeight: 1.6 }}>
              Not a budgeting app. Not an investment dashboard. The full arc, in one place.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
              {FEATURES.map((f) => (
                <Reveal key={f.title} delay={0.1}>
                  <FeatureCard f={f} />
                </Reveal>
              ))}
            </div>
          </Reveal>
        </section>

        {/* 4. Why Sampada (comparison) */}
        <section style={{ padding: '20px 0 60px' }}>
          <Reveal>
            <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6, textAlign: 'center' }}>003 / 005</p>
            <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)', maxWidth: 460, margin: '0 auto 8px', lineHeight: 1.6 }}>
              Mint shut down in March 2024. YNAB costs ~$15/month. Sampada is neither.
            </p>
            <Card style={{ padding: '8px 4px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 420 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--faint)' }}></th>
                    <th style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 700, color: 'var(--accent)' }}>Sampada</th>
                    <th style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>YNAB</th>
                    <th style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Mint</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map(([label, sampada, ynab, mint]) => (
                    <tr key={label}>
                      <td style={{ padding: '9px 14px', borderTop: '1px solid var(--border-soft)', color: 'var(--ink-soft)' }}>{label}</td>
                      <td style={{ padding: '9px 14px', borderTop: '1px solid var(--border-soft)', textAlign: 'center' }}><CompareCell value={sampada} /></td>
                      <td style={{ padding: '9px 14px', borderTop: '1px solid var(--border-soft)', textAlign: 'center' }}><CompareCell value={ynab} /></td>
                      <td style={{ padding: '9px 14px', borderTop: '1px solid var(--border-soft)', textAlign: 'center' }}><CompareCell value={mint} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </Reveal>
        </section>

        {/* 5. Hosted SaaS */}
        <section style={{ padding: '20px 0 60px', textAlign: 'center' }}>
          <Reveal>
            <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>004 / 005</p>
            <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', marginBottom: 10 }}>Hosted. Free. Forever.</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.6 }}>
              No installation needed. Sign up at <a href="https://sampada.vayalabs.in" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>sampada.vayalabs.in</a> and start in seconds.
            </p>
            <p style={{ fontSize: 12.5, marginTop: 14 }}>
              <a href="https://github.com/sdachary/sampada" target="_blank" rel="noreferrer" style={{ color: 'var(--faint)', textDecoration: 'none' }}>View source on GitHub →</a>
            </p>
          </Reveal>
        </section>

        {/* 6. CTA */}
        <section style={{ padding: '50px 0 70px', textAlign: 'center', borderTop: '1px solid var(--border-soft)' }}>
          <Reveal>
            <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>005 / 005</p>
            <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', marginBottom: 10 }}>
              Start your journey.
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>From debt to freedom, one rupee at a time.</p>
            <Link to="/register">
              <Button>Get started</Button>
            </Link>
          </Reveal>
        </section>

        <footer style={{ padding: '20px 0', borderTop: '1px solid var(--border-soft)', fontSize: 12, color: 'var(--faint)', textAlign: 'center' }}>
          Sampada — financial clarity ·{' '}
          <a href="/privacy.html" style={{ color: 'var(--faint)', textDecoration: 'none' }}>Privacy</a>{' '}
          ·{' '}
          <a href="/terms.html" style={{ color: 'var(--faint)', textDecoration: 'none' }}>Terms</a>
        </footer>
      </div>
    </PageTransition>
  )
}