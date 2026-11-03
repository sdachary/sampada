import { useEffect, useState, useRef, Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import { Reveal, PageTransition } from '../lib/motion-primitives'
import { Check, X, TrendingDown, PiggyBank, RefreshCw, MessageSquare, AlertTriangle, Globe, Users, Cpu, Shield, Lock, Zap, Star, ArrowRight, Target, Crown, Layers, Sparkles } from 'lucide-react'
import { Button } from '../components/ui'

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
    <div id="landing-3d-slot" style={{ width: '100%', maxWidth: 480, aspectRatio: '1/1', margin: '48px auto 0', position: 'relative' }}>
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

// ── Feature data with richer visual identity ──
const FEATURES = [
  {
    id: 'debt',
    icon: TrendingDown,
    iconBg: 'var(--accent-bg)',
    iconColor: 'var(--accent)',
    title: 'Debt payoff tracker',
    body: 'Avalanche or snowball order, a full EMI calendar, and a month-by-month projection to your debt-free date.',
    accent: 'var(--accent)'
  },
  {
    id: 'sip',
    icon: PiggyBank,
    iconBg: 'var(--success-bg)',
    iconColor: 'var(--success)',
    title: 'Dividend SIP planner',
    body: 'Set an income target and timeline. Sampada\'s AI picks 2–3 dividend stocks to match.',
    accent: 'var(--success)'
  },
  {
    id: 'rebalance',
    icon: RefreshCw,
    iconBg: 'rgba(154,103,0,0.12)',
    iconColor: 'var(--warning)',
    title: 'Portfolio rebalancing v2',
    body: 'Buy-only contribution engine with guard rails, reason chips, CSV import, holdings drawer, and V1 compare.',
    accent: 'var(--warning)'
  },
  {
    id: 'nl',
    icon: MessageSquare,
    iconBg: 'rgba(179,64,47,0.12)',
    iconColor: 'var(--danger)',
    title: 'Natural-language entries',
    body: '"I spent ₹500 on groceries" becomes a categorized transaction, no forms.',
    accent: 'var(--danger)'
  },
  {
    id: 'anomaly',
    icon: AlertTriangle,
    iconBg: 'var(--accent-bg)',
    iconColor: 'var(--accent)',
    title: 'Anomaly detection',
    body: 'A 3-sigma algorithm flags spending that breaks your normal pattern, automatically.',
    accent: 'var(--accent)'
  },
  {
    id: 'global',
    icon: Globe,
    iconBg: 'var(--success-bg)',
    iconColor: 'var(--success)',
    title: 'Multi-currency, global markets',
    body: '32 currencies with live rates. NYSE, NASDAQ, LSE, TSE, ASX — plus native NSE/BSE support.',
    accent: 'var(--success)'
  },
  {
    id: 'household',
    icon: Users,
    iconBg: 'rgba(154,103,0,0.12)',
    iconColor: 'var(--warning)',
    title: 'Household sharing',
    body: 'Add family members with role-based access and one shared household dashboard.',
    accent: 'var(--warning)'
  },
  {
    id: 'ai',
    icon: Cpu,
    iconBg: 'rgba(179,64,47,0.12)',
    iconColor: 'var(--danger)',
    title: 'Free AI, by default',
    body: 'Runs on OpenRouter\'s free models or fully local via Ollama. No AI paywall, ever.',
    accent: 'var(--danger)'
  },
]

// ── Trust signals ──
const TRUST_SIGNALS = [
  { icon: Shield, label: 'Apache 2.0', desc: 'Open source, forever free' },
  { icon: Lock, label: 'DPDP compliant', desc: 'Your data, your control' },
  { icon: Zap, label: 'Self-hosted', desc: 'Deploy on your infra' },
  { icon: Star, label: 'No paywalls', desc: 'All features included' },
]

// ── Comparison data (visual cards instead of table) ──
const COMPARE_ITEMS = [
  { feature: 'Self-hosted', sampada: true, ynab: false, mint: false },
  { feature: 'Free, no subscription', sampada: true, ynab: false, mint: 'was free' },
  { feature: 'Debt-first philosophy', sampada: true, ynab: 'partial', mint: false },
  { feature: 'Multi-currency (32)', sampada: true, ynab: false, mint: false },
  { feature: 'NSE / BSE markets', sampada: true, ynab: false, mint: false },
  { feature: 'Natural-language entries', sampada: true, ynab: false, mint: false },
  { feature: 'Free AI included', sampada: true, ynab: false, mint: false },
  { feature: 'Portfolio rebalancing v2', sampada: true, ynab: false, mint: false },
]

function CompareCell({ value }) {
  if (value === true) return <Check size={16} color="var(--success)" strokeWidth={2.5} />
  if (value === false) return <X size={16} color="var(--faint)" strokeWidth={2} />
  return <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{value}</span>
}

function TrustBadge({ icon: Icon, label, desc }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      padding: '24px 20px', background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', transition: 'transform 0.3s var(--ease), box-shadow 0.3s var(--ease), border-color 0.3s var(--ease)',
      cursor: 'default'
    }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Icon size={20} color="var(--accent)" strokeWidth={2} />
      </div>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.4, margin: 0 }}>{desc}</p>
    </div>
  )
}

// ── Double-Bezel Card Wrapper ──
function DoubleBezelCard({ children, className = '', style = {}, interactive = false, ...props }) {
  return (
    <div
      className={className}
      style={{
        // Outer shell
        background: 'var(--bg-deep)',
        border: '1px solid var(--border)',
        borderRadius: 'calc(var(--radius-md) + 4px)',
        padding: '2px', // The bezel width
        boxShadow: interactive ? 'none' : 'none',
        transition: 'box-shadow 0.3s var(--ease), transform 0.3s var(--ease)',
        ...style
      }}
      onMouseEnter={interactive ? e => { e.currentTarget.style.boxShadow = 'var(--shadow-hover)'; e.currentTarget.style.transform = 'translateY(-4px)' } : undefined}
      onMouseLeave={interactive ? e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' } : undefined}
      {...props}
    >
      {/* Inner core */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        position: 'relative',
        // Subtle inner highlight
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15)'
      }}>
        {children}
      </div>
    </div>
  )
}

// ── Feature Card with Double-Bezel ──
function FeatureCard({ feature }) {
  const Icon = feature.icon
  return (
    <DoubleBezelCard interactive style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Icon with colored background */}
        <div style={{
          width: 48, height: 48, borderRadius: '12px',
          background: feature.iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
          transition: 'transform 0.3s var(--ease), box-shadow 0.3s var(--ease)'
        }}>
          <Icon size={22} color={feature.iconColor} strokeWidth={1.75} />
        </div>

        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: '-0.015em',
          color: 'var(--ink)',
          marginBottom: 10,
          lineHeight: 1.3
        }}>
          {feature.title}
        </h3>

        <p style={{
          fontSize: 13.5,
          color: 'var(--muted)',
          lineHeight: 1.6,
          margin: 0,
          flex: 1
        }}>
          {feature.body}
        </p>

        {/* Subtle accent bar at bottom */}
        <div style={{
          height: 3, width: '40px', background: feature.accent,
          borderRadius: 2, marginTop: 16, opacity: 0.6,
          transition: 'width 0.4s var(--ease), opacity 0.3s var(--ease)'
        }} />
      </div>
    </DoubleBezelCard>
  )
}

// ── Comparison Card ──
function CompareCard({ item, index }) {
  return (
    <DoubleBezelCard style={{ padding: '20px 24px', minHeight: '72px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
        <span style={{
          fontSize: 11.5, fontWeight: 600, color: 'var(--faint)',
          letterSpacing: '0.06em', textTransform: 'uppercase', minWidth: '36px', textAlign: 'right'
        }}>
          {index + 1}
        </span>
        <span style={{ fontSize: 14.5, color: 'var(--ink)', fontWeight: 500, maxWidth: '280px' }}>
          {item.feature}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--success-bg)', borderRadius: 'var(--radius-pill)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--success)' }}>Sampada</span>
          <CompareCell value={item.sampada} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--border-soft)', borderRadius: 'var(--radius-pill)' }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)' }}>YNAB</span>
          <CompareCell value={item.ynab} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--border-soft)', borderRadius: 'var(--radius-pill)' }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)' }}>Mint</span>
          <CompareCell value={item.mint} />
        </div>
      </div>
    </DoubleBezelCard>
  )
}

// ── Button with trailing icon (Button-in-Button pattern) ──
function PrimaryCTA({ children, href, ...props }) {
  return (
    <Link to={href} style={{ textDecoration: 'none' }}>
      <Button variant="primary" style={{
        position: 'relative',
        overflow: 'visible',
        paddingRight: '56px',
        ...props
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {children}
          <span style={{
            position: 'absolute', right: '0', top: '0', bottom: '0',
            width: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.08)', borderRadius: '999px',
            marginRight: '6px', marginTop: '6px', marginBottom: '6px',
            transition: 'transform 0.3s var(--ease), background 0.2s var(--ease)'
          }}>
            <ArrowRight size={16} color="var(--ink)" strokeWidth={2.5} />
          </span>
        </span>
      </Button>
    </Link>
  )
}

function SecondaryCTA({ children, href, ...props }) {
  return (
    <Link to={href} style={{ textDecoration: 'none' }}>
      <Button variant="secondary" {...props}>{children}</Button>
    </Link>
  )
}

export default function Landing() {
  return (
    <PageTransition>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 24px' }}>
        {/* ── Navigation ── */}
        <header style={{ position: 'relative', zIndex: 10 }}>
          <nav style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '24px 0', borderBottom: '1px solid var(--border)'
          }} aria-label="Main navigation">
            <Link to="/" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18,
              letterSpacing: '-0.02em', color: 'var(--ink)', textDecoration: 'none'
            }} aria-label="Sampada home">
              <img src="/brand-mark.png" alt="" width={24} height={24} style={{ borderRadius: 8 }} />Sampada
            </Link>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <ThemeToggle />
              <Link to="/login" style={{ fontSize: 13.5, color: 'var(--ink)', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
              <PrimaryCTA href="/register">Get started</PrimaryCTA>
            </div>
          </nav>
        </header>

        <main id="main-content">
        {/* ── 1. HERO ── */}
        <section aria-labelledby="hero-heading" style={{ padding: '120px 0 80px', textAlign: 'center', position: 'relative' }}>
          <Reveal y={20} delay={0}>
            {/* Eyebrow badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', background: 'var(--surface)', border: '1px solid var(--accent)',
              borderRadius: 'var(--radius-pill)', marginBottom: 24
            }}>
              <Sparkles size={12} color="var(--accent)" strokeWidth={2} />
              <span style={{
                fontSize: 11.5, fontWeight: 600, color: 'var(--ink)',
                letterSpacing: '0.08em', textTransform: 'uppercase'
              }}>
                Now with Rebalance v2
              </span>
            </div>

            {/* Main Headline */}
            <h1 id="hero-heading" style={{
              fontSize: 'clamp(40px, 6vw, 64px)',
              fontWeight: 700,
              letterSpacing: '-0.035em',
              lineHeight: 1.08,
              marginBottom: 20,
              fontFamily: 'var(--font-display)',
              color: 'var(--ink)',
              maxWidth: '800px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              Zero is better than{' '}
              <em style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                color: 'var(--accent)',
                background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-soft) 100%)',
                backgroundClip: 'text',
                '-webkit-background-clip': 'text',
                '-webkit-text-fill-color': 'transparent'
              }}>
                negative
              </em>.
            </h1>

            {/* Subheadline */}
            <p style={{
              fontSize: 'clamp(17px, 2.2vw, 20px)',
              color: 'var(--muted)',
              maxWidth: '580px',
              margin: '0 auto 36px',
              lineHeight: 1.65,
              fontWeight: 400
            }}>
              Debt payoff, AI-guided SIPs, and portfolio rebalancing v2 in one self-hosted app —
              built to clear what you owe before it grows what you keep.
            </p>

            {/* CTA Group */}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
              <PrimaryCTA href="/register" style={{ minWidth: '220px' }}>
                Start free →
              </PrimaryCTA>
              <SecondaryCTA href="/login" style={{ minWidth: '160px' }}>
                View demo
              </SecondaryCTA>
            </div>

            {/* Trust badges row */}
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', opacity: 0.8 }}>
              <span style={{ fontSize: 12.5, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={13} strokeWidth={2} /> Apache 2.0
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={13} strokeWidth={2} /> DPDP compliant
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={13} strokeWidth={2} /> Self-hosted
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Star size={13} strokeWidth={2} /> No paywalls
              </span>
            </div>
          </Reveal>

          {/* 3D hero slot with lazy-loaded canvas + poster fallback */}
          <Reveal y={30} delay={0.15}>
            <Hero3DLoader />
          </Reveal>

          {/* Scroll indicator */}
          <Reveal y={10} delay={0.4}>
            <div style={{
              marginTop: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 8, color: 'var(--ink)', fontSize: 11.5, letterSpacing: '0.05em', opacity: 0.5
            }}>
              <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>Scroll to explore</span>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ animation: 'bounce 2s ease-in-out infinite' }}>
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </div>
          </Reveal>

          <style jsx>{`
            @keyframes bounce {
              0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
              40% { transform: translateY(-8px); }
              60% { transform: translateY(-4px); }
            }
          `}</style>
        </section>

        {/* ── 2. THE ARC: Debt → Zero → Wealth (Z-Axis Cascade) ── */}
        <section aria-labelledby="arc-heading" style={{ padding: '100px 0 80px', position: 'relative' }}>
          <Reveal y={20} delay={0}>
            <div style={{ textAlign: 'center', marginBottom: '56px', maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto' }}>
              <p style={{
                fontSize: 11.5, fontWeight: 600, color: 'var(--muted)',
                letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12
              }}>
                The journey
              </p>
              <h2 id="arc-heading" style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 4vw, 40px)',
                fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15,
                color: 'var(--ink)', marginBottom: 14
              }}>
                From debt to wealth, in three stages
              </h2>
              <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.65 }}>
                Sampada guides you through the full arc — track, eliminate, then grow.
              </p>
            </div>
          </Reveal>

          <Reveal y={30} delay={0.1}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24,
              position: 'relative'
            }}>
              {/* Connecting line behind cards */}
              <div style={{
                position: 'absolute', top: '50%', left: '10%', right: '10%',
                height: 2, background: 'linear-gradient(90deg, var(--accent) 33%, var(--ink) 33%, var(--ink) 66%, var(--success) 66%)',
                transform: 'translateY(-50%)', borderRadius: 2, zIndex: 0, opacity: 0.3
              }} />

              {[
                {
                  label: 'Negative',
                  number: '01',
                  desc: 'Track every loan, EMI, and credit card. See the full picture of what you owe.',
                  color: 'var(--accent)',
                  icon: Target,
                  progress: 33,
                  delay: 0.15
                },
                {
                  label: 'Zero',
                  number: '02',
                  desc: 'Set a debt-free target. Watch your progress with avalanche or snowball payoff.',
                  color: 'var(--ink)',
                  icon: Crown,
                  progress: 66,
                  delay: 0.25
                },
                {
                  label: 'Wealth',
                  number: '03',
                  desc: 'Grow your net worth. AI-guided SIPs and rebalancing v2 build your future.',
                  color: 'var(--success)',
                  icon: Layers,
                  progress: 100,
                  delay: 0.35
                }
              ].map((stage, i) => (
                <Reveal key={stage.label} y={30} delay={stage.delay}>
                  <div style={{
                    position: 'relative', zIndex: 1,
                    // Staggered vertical offset for cascade effect
                    transform: i === 1 ? 'translateY(-24px)' : i === 2 ? 'translateY(12px)' : 'none',
                    transition: 'transform 0.6s var(--ease)'
                  }}>
                    <DoubleBezelCard interactive style={{ padding: '32px 28px', minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        {/* Stage number */}
                        <span style={{
                          fontFamily: 'var(--font-serif)', fontSize: 13, fontStyle: 'italic',
                          color: stage.color, fontWeight: 500, marginBottom: 8, letterSpacing: '0.02em'
                        }}>
                          Stage {stage.number}
                        </span>

                        {/* Icon */}
                        <div style={{
                          width: 56, height: 56, borderRadius: '14px',
                          background: `${stage.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          marginBottom: 20, border: `1px solid ${stage.color}33`
                        }}>
                          <stage.icon size={26} color={stage.color} strokeWidth={1.75} />
                        </div>

                        {/* Stage label */}
                        <h3 style={{
                          fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700,
                          letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 10
                        }}>
                          {stage.label}
                        </h3>

                        {/* Progress ring/bar */}
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Progress</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: stage.color, fontVariantNumeric: 'tabular-nums' }}>{stage.progress}%</span>
                          </div>
                          <div style={{ height: 8, background: 'var(--border-soft)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${stage.progress}%`,
                              background: `linear-gradient(90deg, ${stage.color} 0%, ${stage.color}dd 100%)`,
                              borderRadius: 4, transition: 'width 1.2s cubic-bezier(0.2, 0, 0, 1)',
                              transformOrigin: 'left'
                            }} />
                          </div>
                        </div>

                        {/* Description */}
                        <p style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.65, flex: 1, margin: 0 }}>
                          {stage.desc}
                        </p>

                        {/* Accent indicator */}
                        <div style={{
                          height: 3, width: '60px', background: stage.color,
                          borderRadius: 2, marginTop: 20, opacity: 0.7
                        }} />
                      </div>
                    </DoubleBezelCard>
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>

          {/* Mobile cascade reset */}
          <style jsx>{`
            @media (max-width: 768px) {
              .landing-arc-card { transform: none !important; }
            }
          `}</style>
        </section>

        {/* ── 3. FEATURES (Editorial Split Layout) ── */}
        <section aria-labelledby="features-heading" style={{ padding: '100px 0 80px' }}>
          <Reveal y={20} delay={0}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'start' }}>
              {/* Left: Editorial headline */}
              <div style={{ paddingRight: '24px' }}>
                <p style={{
                  fontSize: 11.5, fontWeight: 600, color: 'var(--muted)',
                  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12
                }}>
                  Capabilities
                </p>
                <h2 id="features-heading" style={{
                  fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 36px)',
                  fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15,
                  color: 'var(--ink)', marginBottom: 16
                }}>
                  Not a budgeting app.<br />Not an investment dashboard.<br />The full arc, in one place.
                </h2>
                <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 24 }}>
                  Every feature serves the philosophy: debt first, then wealth. No feature exists in isolation.
                </p>

                {/* Quick stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 32 }}>
                  <div style={{ padding: '20px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>8</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>Core modules</div>
                  </div>
                  <div style={{ padding: '20px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--success)', lineHeight: 1 }}>32</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>Currencies</div>
                  </div>
                  <div style={{ padding: '20px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--warning)', lineHeight: 1 }}>413</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>RSpec examples</div>
                  </div>
                  <div style={{ padding: '20px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>0</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>Paywalls</div>
                  </div>
                </div>
              </div>

              {/* Right: Feature grid (horizontal scroll on desktop, stack on mobile) */}
              <div style={{ position: 'relative' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16,
                  padding: '4px' // for scrollbar space
                }}>
                  {FEATURES.map((feature, index) => (
                    <Reveal key={feature.id} y={20} delay={0.1 + index * 0.06}>
                      <FeatureCard feature={feature} />
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {/* Mobile: stack the editorial split */}
          <style jsx>{`
            @media (max-width: 900px) {
              .landing-features-split { grid-template-columns: 1fr !important; gap: 48px !important; }
              .landing-features-split > div:first-child { padding-right: 0 !important; }
            }
          `}</style>
        </section>

        {/* ── 4. COMPARISON (Visual Cards) ── */}
        <section aria-labelledby="compare-heading" style={{ padding: '100px 0 80px', background: 'var(--bg-warm)', margin: '0 -24px', paddingLeft: '24px', paddingRight: '24px' }}>
          <Reveal y={20} delay={0}>
            <div style={{ textAlign: 'center', marginBottom: '56px', maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto' }}>
              <p style={{
                fontSize: 11.5, fontWeight: 600, color: 'var(--muted)',
                letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12
              }}>
                Why Sampada
              </p>
              <h2 id="compare-heading" style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 4vw, 40px)',
                fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15,
                color: 'var(--ink)', marginBottom: 14
              }}>
                Mint shut down. YNAB costs ~$15/mo.<br />
                <span style={{ color: 'var(--accent)' }}>Sampada is neither.</span>
              </h2>
              <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.65 }}>
                Free forever, self-hosted, and built on a philosophy — not a pricing page.
              </p>
            </div>
          </Reveal>

          <Reveal y={30} delay={0.1}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16,
              maxWidth: '960px', margin: '0 auto'
            }}>
              {COMPARE_ITEMS.map((item, index) => (
                <CompareCard key={item.feature} item={item} index={index} />
              ))}
            </div>
          </Reveal>
        </section>

        {/* ── 5. TRUST SIGNALS ── */}
        <section aria-labelledby="trust-heading" style={{ padding: '100px 0 80px' }}>
          <Reveal y={20} delay={0}>
            <div style={{ textAlign: 'center', marginBottom: '56px', maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto' }}>
              <p style={{
                fontSize: 11.5, fontWeight: 600, color: 'var(--muted)',
                letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12
              }}>
                Trust
              </p>
              <h2 id="trust-heading" style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 4vw, 40px)',
                fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15,
                color: 'var(--ink)', marginBottom: 14
              }}>
                Built for you, not investors
              </h2>
              <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.65 }}>
                No venture capital. No data mining. No surveillance capitalism. Just code you can audit.
              </p>
            </div>
          </Reveal>

          <Reveal y={30} delay={0.1}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {TRUST_SIGNALS.map((signal, index) => (
                <Reveal key={signal.label} y={20} delay={0.15 + index * 0.06}>
                  <TrustBadge {...signal} />
                </Reveal>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ── 6. FINAL CTA ── */}
        <section aria-labelledby="cta-heading" style={{ padding: '120px 0 100px', textAlign: 'center', borderTop: '1px solid var(--border-soft)', position: 'relative' }}>
          {/* Subtle background accent */}
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: '600px', height: '600px',
            background: 'radial-gradient(ellipse at center, var(--accent-bg) 0%, transparent 70%)',
            pointerEvents: 'none', zIndex: 0
          }} />

          <Reveal y={20} delay={0} style={{ position: 'relative', zIndex: 1 }}>
            <p style={{
              fontSize: 11.5, fontWeight: 600, color: 'var(--muted)',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16
            }}>
              Ready to begin
            </p>
            <h2 id="cta-heading" style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.1,
              color: 'var(--ink)', marginBottom: 16, maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto'
            }}>
              Start your journey from debt to wealth.
            </h2>
            <p style={{ fontSize: 17, color: 'var(--muted)', maxWidth: '480px', margin: '0 auto 32px', lineHeight: 1.65 }}>
              One rupee at a time. Free forever. Self-hosted on your terms.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <PrimaryCTA href="/register" style={{ minWidth: '240px', fontSize: 16, padding: '14px 32px' }}>
                Get started free →
              </PrimaryCTA>
              <SecondaryCTA href="https://github.com/sdachary/sampada" target="_blank" rel="noreferrer" style={{ minWidth: '180px' }}>
                View on GitHub
              </SecondaryCTA>
            </div>
          </Reveal>
        </section>

        {/* ── FOOTER ── */}
        </main>
        <footer style={{ padding: '48px 0 32px', borderTop: '1px solid var(--border-soft)', marginTop: '0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/brand-mark.png" alt="" width={22} height={22} style={{ borderRadius: 6 }} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>Sampada</span>
            </div>
            <nav aria-label="Footer navigation">
              <div style={{ display: 'flex', gap: 24 }}>
                <a href="https://github.com/sdachary/sampada" target="_blank" rel="noreferrer" style={{ color: 'var(--ink)', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>GitHub</a>
                <a href="/privacy.html" style={{ color: 'var(--ink)', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>Privacy</a>
                <a href="/terms.html" style={{ color: 'var(--ink)', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>Terms</a>
              </div>
            </nav>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--faint)', textAlign: 'center', margin: 0 }}>
            Sampada (संपदा) means wealth in Sanskrit. The name is aspirational — but you have to get to zero first.
          </p>
        </footer>
      </div>
    </PageTransition>
  )
}