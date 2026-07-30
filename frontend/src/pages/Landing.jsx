import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  TrendingDown, PiggyBank, RefreshCw, MessageSquare,
  AlertTriangle, Globe, Users, Cpu, Terminal, Check, X,
} from 'lucide-react'

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]')
    const o = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); o.unobserve(e.target) } })
    }, { threshold: 0.1 })
    els.forEach(el => o.observe(el))
    return () => o.disconnect()
  }, [])
}

const FEATURES = [
  { icon: TrendingDown, title: 'Debt payoff tracker', body: 'Avalanche or snowball order, a full EMI calendar, and a month-by-month projection to your debt-free date.' },
  { icon: PiggyBank, title: 'Dividend SIP planner', body: 'Set an income target and timeline. Sampada\u2019s AI picks 2\u20133 dividend stocks to match.' },
  { icon: RefreshCw, title: 'Portfolio rebalancing', body: 'Modern Portfolio Theory checks your allocation every month and flags what\u2019s off track.' },
  { icon: MessageSquare, title: 'Natural-language entries', body: '\u201cI spent \u20b9500 on groceries\u201d becomes a categorized transaction, no forms.' },
  { icon: AlertTriangle, title: 'Anomaly detection', body: 'A 3-sigma algorithm flags spending that breaks your normal pattern, automatically.' },
  { icon: Globe, title: 'Multi-currency, global markets', body: '32 currencies with live rates. NYSE, NASDAQ, LSE, TSE, ASX \u2014 plus native NSE/BSE support.' },
  { icon: Users, title: 'Household sharing', body: 'Add family members with role-based access and one shared household dashboard.' },
  { icon: Cpu, title: 'Free AI, by default', body: 'Runs on OpenRouter\u2019s free models or fully local via Ollama. No AI paywall, ever.' },
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
  if (value === false) return <X size={15} color="var(--ink-faint)" strokeWidth={2} />
  return <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{value}</span>
}

export default function Landing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  useReveal()

  if (user) { navigate('/dashboard', { replace: true }); return null }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderBottom: '1px solid var(--line)' }}>
        <span style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>Sampada</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link to="/login" style={{ fontSize: 13.5, color: 'var(--ink-mute)' }}>Sign in</Link>
          <Link to="/register" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: 13 }}>Get started</Link>
        </div>
      </nav>

      {/* 1. Hero */}
      <section style={{ padding: '80px 0 56px', textAlign: 'center' }} data-reveal>
        <p className="page-num" style={{ marginBottom: 12 }}>00<em>1</em> / 005</p>
        <h1 className="landing-hero-h1" style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 16 }}>
          Zero is better than <em style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--coral)' }}>negative</em>.
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink-mute)', maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.6 }}>
          Debt payoff, AI-guided SIPs, and portfolio rebalancing in one self-hosted app \u2014 built to clear what you owe before it grows what you keep.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" className="btn btn-primary">Get started free</Link>
          <a href="https://github.com/sdachary/sampada#install-in-one-line" target="_blank" rel="noreferrer" className="btn btn-ghost">Self-host it</a>
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 20, letterSpacing: '0.02em' }}>
          Open source \u00b7 AGPL-3.0 \u00b7 No premium tier
        </p>
      </section>

      {/* 2. Debt → Zero → Wealth arc */}
      <div className="landing-stage-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' }} data-reveal>
        {[
          { label: 'Negative', desc: 'Track everything you owe. See the full picture of your debt.', color: 'var(--coral)', pct: '33%' },
          { label: 'Zero', desc: 'Set a debt-free target. Watch your progress toward zero.', color: 'var(--ink)', pct: '33%' },
          { label: 'Wealth', desc: 'Grow your net worth. Invest, save, and build your future.', color: 'var(--success)', pct: '34%' },
        ].map((s, i) => (
          <div key={s.label}
            style={{ padding: '32px 20px', textAlign: 'center', background: i === 1 ? 'var(--paper-card)' : 'transparent', borderLeft: i > 0 ? '1px solid var(--line)' : 'none' }}>
            <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Stage {i + 1}</div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: s.color, marginBottom: 6 }}>{s.label}</div>
            <div style={{ height: 3, width: s.pct, background: s.color, borderRadius: 2, margin: '0 auto 10px' }} />
            <p style={{ fontSize: 13, color: 'var(--ink-mute)', lineHeight: 1.5, maxWidth: 200, margin: '0 auto' }}>{s.desc}</p>
          </div>
        ))}
      </div>
      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-faint)', maxWidth: 420, margin: '14px auto 40px', lineHeight: 1.6 }} data-reveal>
        Set a goal like <em style={{ fontStyle: 'italic', color: 'var(--ink-mute)' }}>\u201c\u20b925,000/month passive income by 2030\u201d</em> \u2014 Sampada reverse-engineers the SIP amount, stock picks, and rebalance cadence to get there.
      </p>

      {/* 3. Feature grid */}
      <section style={{ padding: '40px 0 60px' }}>
        <p className="page-num" style={{ marginBottom: 6, textAlign: 'center' }} data-reveal>00<em>2</em> / 005</p>
        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--ink-mute)', maxWidth: 460, margin: '0 auto 36px', lineHeight: 1.6 }} data-reveal>
          Not a budgeting app. Not an investment dashboard. The full arc, in one place.
        </p>
        <div className="landing-feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="card" style={{ padding: '22px 22px' }} data-reveal>
                <Icon size={20} color="var(--coral)" strokeWidth={1.75} style={{ marginBottom: 12 }} />
                <h3 style={{ fontFamily: 'var(--sans)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 13.5, color: 'var(--ink-mute)', lineHeight: 1.55 }}>{f.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* 4. Why Sampada */}
      <section style={{ padding: '20px 0 60px' }}>
        <p className="page-num" style={{ marginBottom: 6, textAlign: 'center' }} data-reveal>00<em>3</em> / 005</p>
        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--ink-mute)', maxWidth: 460, margin: '0 auto 8px', lineHeight: 1.6 }} data-reveal>
          Mint shut down in March 2024. YNAB costs ~$15/month. Sampada is neither.
        </p>
        <div className="card" style={{ padding: '8px 4px', overflowX: 'auto' }} data-reveal>
          <table className="landing-compare-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 420 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}></th>
                <th style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 700, color: 'var(--coral)' }}>Sampada</th>
                <th style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-mute)' }}>YNAB</th>
                <th style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-mute)' }}>Mint</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map(([label, sampada, ynab, mint]) => (
                <tr key={label}>
                  <td style={{ padding: '9px 14px', borderTop: '1px solid var(--line-soft)', color: 'var(--ink-soft)' }}>{label}</td>
                  <td style={{ padding: '9px 14px', borderTop: '1px solid var(--line-soft)', textAlign: 'center' }}><CompareCell value={sampada} /></td>
                  <td style={{ padding: '9px 14px', borderTop: '1px solid var(--line-soft)', textAlign: 'center' }}><CompareCell value={ynab} /></td>
                  <td style={{ padding: '9px 14px', borderTop: '1px solid var(--line-soft)', textAlign: 'center' }}><CompareCell value={mint} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Self-host */}
      <section style={{ padding: '20px 0 60px', textAlign: 'center' }} data-reveal>
        <p className="page-num" style={{ marginBottom: 12 }}>00<em>4</em> / 005</p>
        <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', marginBottom: 10 }}>Your server. Your data.</h2>
        <p style={{ fontSize: 14, color: 'var(--ink-mute)', maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.6 }}>
          Sampada is standalone \u2014 no external services required. Run it on your own machine in one line.
        </p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 20px',
          background: 'var(--ink)', color: 'var(--paper)', borderRadius: 'var(--radius-sm)',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, maxWidth: '100%', overflowX: 'auto',
        }}>
          <Terminal size={15} style={{ flexShrink: 0, opacity: 0.7 }} />
          <code style={{ whiteSpace: 'nowrap' }}>curl -fsSL raw.githubusercontent.com/sdachary/sampada/main/installer/install.sh | bash</code>
        </div>
        <p style={{ fontSize: 12.5, marginTop: 14 }}>
          <a href="https://github.com/sdachary/sampada" target="_blank" rel="noreferrer" style={{ color: 'var(--ink-mute)' }}>View source on GitHub \u2192</a>
        </p>
      </section>

      {/* 6. CTA */}
      <section style={{ padding: '50px 0 70px', textAlign: 'center', borderTop: '1px solid var(--line-soft)' }} data-reveal>
        <p className="page-num" style={{ marginBottom: 12 }}>00<em>5</em> / 005</p>
        <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', marginBottom: 10 }}>
          Start your journey.
        </h2>
        <p style={{ fontSize: 14, color: 'var(--ink-mute)', marginBottom: 24 }}>From debt to freedom, one rupee at a time.</p>
        <Link to="/register" className="btn btn-primary">Get started</Link>
      </section>

      <footer style={{ padding: '20px 0', borderTop: '1px solid var(--line-soft)', fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center' }}>
        Sampada &mdash; financial clarity
      </footer>
    </div>
  )
}
