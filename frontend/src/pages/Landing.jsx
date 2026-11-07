import { Link } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import { Reveal, PageTransition } from '../lib/motion-primitives'
import { Check, X, TrendingDown, PiggyBank, RefreshCw, MessageSquare, AlertTriangle, Globe, Users, Cpu, Lock, Shield, Zap, Star } from 'lucide-react'
import { Button, Card } from '../components/ui'
import HeroVisual from '../landing/hero3d/HeroVisual'

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
    <Card style={{ padding: '20px 20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Icon className="mb-10" size={20} color={f.accent} strokeWidth={1.75} />
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 6 }}>{f.title}</h3>
      <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55, flex: 1 }}>{f.body}</p>
      <div style={{ height: 3, width: '40px', background: f.accent, borderRadius: 2, marginTop: 14, opacity: 0.6 }} />
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
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em', color: 'var(--ink)', textDecoration: 'none' }}>
            <img src="/brand-mark.png" alt="" width={22} height={22} style={{ borderRadius: 6 }} />Sampada
          </Link>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <ThemeToggle />
            <Link to="/login" style={{ fontSize: 13.5, color: 'var(--muted)', textDecoration: 'none' }}>Sign in</Link>
            <PrimaryCTA href="/register">Get started</PrimaryCTA>
          </div>
        </nav>

        {/* Hero - with 3D visual */}
        <section aria-labelledby="hero-heading" style={{ padding: '60px 0 40px', position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'center' }}>
            <Reveal delay={0}>
              <h1 id="hero-heading" style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 16, fontFamily: 'var(--font-display)' }}>
                Zero is better than <em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--accent)' }}>negative</em>.
              </h1>
              <p style={{ fontSize: 16, color: 'var(--muted)', maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.6 }}>
                Debt payoff, AI-guided SIPs, and portfolio rebalancing in one self-hosted app — built to clear what you owe before it grows what you keep.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                <PrimaryCTA href="/register">Get started free</PrimaryCTA>
                <Link to="/dashboard" style={{ textDecoration: 'none' }}>
                  <Button variant="secondary">See how it works</Button>
                </Link>
              </div>
              <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 16, letterSpacing: '0.02em' }}>Open source · Apache 2.0 · Free forever</p>
            </Reveal>
            <Reveal delay={0.1}>
              <div id="landing-hero" style={{ width: '100%', maxWidth: 'clamp(400px, 22vw, 520px)', margin: '0 auto' }}>
                <HeroVisual />
              </div>
            </Reveal>
          </div>
        </section>

        {/* 2. Debt → Zero → Wealth arc */}
        <section aria-labelledby="arc-heading" style={{ padding: '48px 0' }}>
          <Reveal delay={0.1}>
            <h2 id="arc-heading" style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20, textAlign: 'center' }}>
              The journey
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {[
                { label: 'Negative', desc: 'Track everything you owe. See the full picture of your debt.', color: 'var(--accent)', pct: '33%' },
                { label: 'Zero', desc: 'Set a debt-free target. Watch your progress toward zero.', color: 'var(--ink)', pct: '33%' },
                { label: 'Wealth', desc: 'Grow your net worth. Invest, save, and build your future.', color: 'var(--success)', pct: '34%' },
              ].map((s, i) => (
                <div key={s.label} style={{ padding: '24px 16px', textAlign: 'center', background: i === 1 ? 'var(--surface)' : 'transparent', borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Stage {i + 1}</p>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: s.color, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ height: 3, width: s.pct, background: s.color, borderRadius: 2, margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, maxWidth: 200, margin: '0 auto' }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', maxWidth: 420, margin: '12px auto 32px', lineHeight: 1.6 }}>
              Set a goal like <em style={{ fontStyle: 'italic', color: 'var(--faint)' }}>"₹25,000/month passive income by 2030"</em> — Sampada reverse-engineers the SIP amount, stock picks, and rebalance cadence to get there.
            </p>
          </Reveal>
        </section>

        {/* 3. Feature grid */}
        <section aria-labelledby="features-heading" style={{ padding: '56px 0' }}>
          <Reveal delay={0.2}>
            <h2 id="features-heading" style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20, textAlign: 'center' }}>
              Capabilities
            </h2>
            <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)', maxWidth: 460, margin: '0 auto 28px', lineHeight: 1.6 }}>Not a budgeting app. Not an investment dashboard. The full arc, in one place.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={0.2 + i * 0.04}>
                  <FeatureCard f={f} />
                </Reveal>
              ))}
            </div>
          </Reveal>
        </section>

        {/* 4. Why Sampada (comparison table) */}
        <section aria-labelledby="compare-heading" style={{ padding: '48px 0' }}>
          <Reveal delay={0.3}>
            <h2 id="compare-heading" style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20, textAlign: 'center' }}>
              Why Sampada
            </h2>
            <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)', maxWidth: 460, margin: '0 auto 8px', lineHeight: 1.6 }}>Mint shut down in March 2024. YNAB costs ~$15/month. Sampada is neither.</p>

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
        <section aria-labelledby="cta-heading" style={{ padding: '56px 0 40px', textAlign: 'center' }}>
          <Reveal delay={0.4}>
            <h2 id="cta-heading" style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.025em', marginBottom: 10 }}>Hosted. Free. Forever.</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 420, margin: '0 auto 20px', lineHeight: 1.6 }}>
              No installation needed. Sign up at <a href="https://sampada.vayalabs.in" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>sampada.vayalabs.in</a> and start in seconds.
            </p>
            <p style={{ fontSize: 12.5, marginTop: 12 }}>
              <a href="https://github.com/sdachary/sampada" target="_blank" rel="noreferrer" style={{ color: 'var(--faint)', textDecoration: 'none' }}>View source on GitHub →</a>
            </p>
          </Reveal>
        </section>

        {/* 6. Trust badges */}
        <section style={{ padding: '40px 0 40px', textAlign: 'center', borderTop: '1px solid var(--border-soft)' }}>
          <Reveal delay={0.5}>
            <div className="landing-trust-badges" style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}><Lock size={13} strokeWidth={2} /> Apache 2.0</span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={13} strokeWidth={2} /> DPDP compliant</span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={13} strokeWidth={2} /> Self-hosted</span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}><Star size={13} strokeWidth={2} /> No paywalls</span>
            </div>
          </Reveal>
        </section>

        <footer style={{ padding: '16px 0', borderTop: '1px solid var(--border-soft)', fontSize: 12, color: 'var(--faint)', textAlign: 'center' }}>
          Sampada — financial clarity · <a href="/privacy.html" style={{ color: 'var(--faint)', textDecoration: 'none' }}>Privacy</a> · <a href="/terms.html" style={{ color: 'var(--faint)', textDecoration: 'none' }}>Terms</a>
        </footer>
      </div>
    </PageTransition>
  )
}