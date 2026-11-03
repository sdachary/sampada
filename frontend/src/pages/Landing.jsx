import { useEffect, useState, useRef, Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import { Reveal, PageTransition } from '../lib/motion-primitives'
import { Check, X, TrendingDown, PiggyBank, RefreshCw, MessageSquare, AlertTriangle, Globe, Users, Cpu, Lock, Shield, Zap, Star, Sparkles } from 'lucide-react'
import { Button, Card } from '../components/ui'

// 3D hero lazy import (Step 9) - loaded after first paint, landing route only
const Hero3D = lazy(() => import('../landing/hero3d/Hero3D').then(m => ({ default: m.Hero3DWithFallback })))
const HeroPoster = lazy(() => import('../landing/hero3d/HeroPoster'))

function Hero3DLoader() {
  const [show3D, setShow3D] = useState(false)
  const [showPoster, setShowPoster] = useState(true)
  const [can3D, setCan3D] = useState(null)
  const canvasRef = useRef(null)

  const canRender3D = () => {
    if (typeof window === 'undefined') return false
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) return false
    if (window.innerWidth < 768) return false
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    if (navigator.connection?.saveData === true) return false
    if (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4) return false
    return true
  }

  useEffect(() => {
    const supported = canRender3D()
    setCan3D(supported)
    if (!supported) return
    const timer = requestIdleCallback
      ? requestIdleCallback(() => setShow3D(true), { timeout: 2000 })
      : setTimeout(() => setShow3D(true), 1000)
    return () => cancelIdleCallback?.(timer) || clearTimeout(timer)
  }, [])

  const handleCanvasReady = () => { setShowPoster(false) }

  return (
    <div id="landing-3d-slot" style={{ width: '100%', maxWidth: 400, aspectRatio: '1/1', margin: '48px auto 0', position: 'relative' }}>
      {can3D === false && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', background: 'var(--border-soft)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Sparkles size={32} color="var(--accent)" strokeWidth={2} />
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 280, margin: 0, lineHeight: 1.5 }}>
            3D hero requires WebGL2, hardware acceleration, and a viewport ≥768px.
            <br /><br />
            Showing static poster instead.
          </p>
        </div>
      )}
      <Suspense fallback={<div style={{ width: '100%', aspectRatio: '1/1', background: 'var(--border-soft)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true" />}>
        <HeroPoster ref={showPoster ? undefined : null} style={{ position: 'absolute', inset: 0, transition: 'opacity 0.6s ease', opacity: showPoster && !show3D ? 1 : 0, pointerEvents: 'none' }} />
      </Suspense>
      {show3D && (
        <Suspense fallback={<div style={{ position: 'absolute', inset: 0, background: 'var(--border-soft)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true" />}>
          <Hero3D ref={canvasRef} onLoad={handleCanvasReady} style={{ position: 'absolute', inset: 0, opacity: showPoster ? 0 : 1, transition: 'opacity 0.6s ease' }} aria-hidden="true" />
        </Suspense>
      )}
    </div>
  )
}

const FEATURES = [
  { icon: TrendingDown, accent: 'var(--accent)', title: 'Debt payoff tracker', body: 'Avalanche or snowball order, a full EMI calendar, and a month-by-month projection to your debt-free date.' },
  { icon: PiggyBank, accent: 'var(--success)', title: 'Dividend SIP planner', body: 'Set an income target and timeline. Sampada\'s AI picks 2–3 dividend stocks to match.' },
  { icon: RefreshCw, accent: 'var(--warning)', title: 'Portfolio rebalancing v2', body: 'Buy-only contribution engine with guard rails, reason chips, CSV import, holdings drawer, and V1 compare.' },
  { icon: MessageSquare, accent: 'var(--accent)', title: 'Natural-language entries', body: '"I spent ₹500 on groceries" becomes a categorized transaction, no forms.' },
  { icon: AlertTriangle, accent: 'var(--danger)', title: 'Anomaly detection', body: 'A 3-sigma algorithm flags spending that breaks your normal pattern, automatically.' },
  { icon: Globe, accent: 'var(--success)', title: 'Multi-currency, global markets', body: '32 currencies with live rates. NYSE, NASDAQ, LSE, TSE, ASX — plus native NSE/BSE support.' },
  { icon: Users, accent: 'var(--warning)', title: 'Household sharing', body: 'Add family members with role-based access and one shared household dashboard.' },
  { icon: Cpu, accent: 'var(--danger)', title: 'Free AI, by default', body: 'Runs on OpenRouter\'s free models or fully local via Ollama. No AI paywall, ever.' },
]

const COMPARE_ROWS = [
  ['Self-hosted', true, false, false],
  ['Free, no subscription', true, false, 'was free'],
  ['Debt-first philosophy', true, 'partial', false],
  ['Multi-currency (32)', true, false, false],
  ['NSE / BSE markets', true, false, false],
  ['Natural-language entries', true, false, false],
  ['Free AI included', true, false, false],
  ['Portfolio rebalancing v2', true, false, false],
]

function CompareCell({ value }) {
  if (value === true) return <Check size={15} color="var(--success)" strokeWidth={2.5} />
  if (value === false) return <X size={15} color="var(--faint)" strokeWidth={2} />
  return <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{value}</span>
}

function FeatureCard({ f }) {
  const Icon = f.icon
  return (
    <Card style={{ padding: '22px 22px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Icon className="mb-12" size={20} color={f.accent} strokeWidth={1.75} />
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 6 }}>{f.title}</h3>
      <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55, flex: 1 }}>{f.body}</p>
      <div style={{ height: 3, width: '40px', background: f.accent, borderRadius: 2, marginTop: 16, opacity: 0.6 }} />
    </Card>
  )
}

function PrimaryCTA({ children, href }) {
  return (
    <Link to={href} style={{ textDecoration: 'none' }}>
      <Button variant="primary">{children}</Button>
    </Link>
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
            <PrimaryCTA href="/register">Get started</PrimaryCTA>
          </div>
        </nav>

        {/* 1. Hero */}
        <section aria-labelledby="hero-heading" style={{ padding: '100px 0 80px', textAlign: 'center' }}>
          <Reveal delay={0}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-pill)', marginBottom: 24 }}>
              <Sparkles size={12} color="var(--accent)" strokeWidth={2} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Now with Rebalance v2</span>
            </div>

            <h1 id="hero-heading" style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 16, fontFamily: 'var(--font-display)' }}>
              Zero is better than <em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--accent)' }}>negative</em>.
            </h1>
            <p style={{ fontSize: 16, color: 'var(--muted)', maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.6 }}>
              Debt payoff, AI-guided SIPs, and portfolio rebalancing in one self-hosted app — built to clear what you owe before it grows what you keep.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <PrimaryCTA href="/register"><Button>Get started free</Button></PrimaryCTA>
              <Link to="/dashboard" style={{ textDecoration: 'none' }}>
                <Button variant="secondary">See how it works</Button>
              </Link>
            </div>
            <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 20, letterSpacing: '0.02em' }}>Open source · Apache 2.0 · Free forever</p>
          </Reveal>

          <Reveal delay={0.15}>
            <Hero3DLoader />
          </Reveal>
        </section>

        {/* 2. Debt → Zero → Wealth arc */}
        <section aria-labelledby="arc-heading" style={{ padding: '80px 0' }}>
          <Reveal delay={0.1}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {[
                { label: 'Negative', desc: 'Track everything you owe. See the full picture of your debt.', color: 'var(--accent)', pct: '33%' },
                { label: 'Zero', desc: 'Set a debt-free target. Watch your progress toward zero.', color: 'var(--ink)', pct: '33%' },
                { label: 'Wealth', desc: 'Grow your net worth. Invest, save, and build your future.', color: 'var(--success)', pct: '34%' },
              ].map((s, i) => (
                <div key={s.label} style={{ padding: '32px 20px', textAlign: 'center', background: i === 1 ? 'var(--surface)' : 'transparent', borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Stage {i + 1}</p>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: s.color, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ height: 3, width: s.pct, background: s.color, borderRadius: 2, margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, maxWidth: 200, margin: '0 auto' }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', maxWidth: 420, margin: '14px auto 40px', lineHeight: 1.6 }}>
              Set a goal like <em style={{ fontStyle: 'italic', color: 'var(--faint)' }}>"₹25,000/month passive income by 2030"</em> — Sampada reverse-engineers the SIP amount, stock picks, and rebalance cadence to get there.
            </p>
          </Reveal>
        </section>

        {/* 3. Feature grid */}
        <section aria-labelledby="features-heading" style={{ padding: '100px 0 80px' }}>
          <Reveal delay={0.2}>
            <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)', maxWidth: 460, margin: '0 auto 36px', lineHeight: 1.6 }}>Not a budgeting app. Not an investment dashboard. The full arc, in one place.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={0.2 + i * 0.05}>
                  <FeatureCard f={f} />
                </Reveal>
              ))}
            </div>
          </Reveal>
        </section>

        {/* 4. Why Sampada (comparison — table on desktop, cards on mobile) */}
        <section aria-labelledby="compare-heading" style={{ padding: '80px 0' }}>
          <Reveal delay={0.3}>
            <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)', maxWidth: 460, margin: '0 auto 8px', lineHeight: 1.6 }}>Mint shut down in March 2024. YNAB costs ~$15/month. Sampada is neither.</p>

            {/* Desktop: Table */}
            <div style={{ display: 'none' }} className="landing-compare-table-desktop">
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
            </div>

            {/* Mobile: Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="landing-compare-cards-mobile">
              {COMPARE_ROWS.map(([label, sampada, ynab, mint]) => (
                <Card key={label} style={{ padding: '16px 20px' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>{label}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'var(--success-bg)', borderRadius: 'var(--radius-pill)', fontSize: 12, fontWeight: 600 }}>
                      <span style={{ color: 'var(--success)' }}>Sampada</span>
                      <CompareCell value={sampada} />
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'var(--border-soft)', borderRadius: 'var(--radius-pill)', fontSize: 12, fontWeight: 500 }}>
                      <span style={{ color: 'var(--muted)' }}>YNAB</span>
                      <CompareCell value={ynab} />
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'var(--border-soft)', borderRadius: 'var(--radius-pill)', fontSize: 12, fontWeight: 500 }}>
                      <span style={{ color: 'var(--muted)' }}>Mint</span>
                      <CompareCell value={mint} />
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </Reveal>
        </section>

        {/* 5. Hosted SaaS */}
        <section aria-labelledby="cta-heading" style={{ padding: '80px 0 60px', textAlign: 'center' }}>
          <Reveal delay={0.4}>
            <h2 id="cta-heading" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', marginBottom: 10 }}>Hosted. Free. Forever.</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.6 }}>
              No installation needed. Sign up at <a href="https://sampada.vayalabs.in" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>sampada.vayalabs.in</a> and start in seconds.
            </p>
            <p style={{ fontSize: 12.5, marginTop: 14 }}>
              <a href="https://github.com/sdachary/sampada" target="_blank" rel="noreferrer" style={{ color: 'var(--faint)', textDecoration: 'none' }}>View source on GitHub →</a>
            </p>
          </Reveal>
        </section>

        {/* 6. Trust badges */}
        <section style={{ padding: '60px 0 60px', textAlign: 'center', borderTop: '1px solid var(--border-soft)' }}>
          <Reveal delay={0.5}>
            <div className="landing-trust-badges" style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}><Lock size={13} strokeWidth={2} /> Apache 2.0</span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={13} strokeWidth={2} /> DPDP compliant</span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={13} strokeWidth={2} /> Self-hosted</span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}><Star size={13} strokeWidth={2} /> No paywalls</span>
            </div>
          </Reveal>
        </section>

        <footer style={{ padding: '20px 0', borderTop: '1px solid var(--border-soft)', fontSize: 12, color: 'var(--faint)', textAlign: 'center' }}>
          Sampada — financial clarity · <a href="/privacy.html" style={{ color: 'var(--faint)', textDecoration: 'none' }}>Privacy</a> · <a href="/terms.html" style={{ color: 'var(--faint)', textDecoration: 'none' }}>Terms</a>
        </footer>
      </div>
    </PageTransition>
  )
}