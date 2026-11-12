import { Link } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import { Reveal } from '../lib/motion-primitives'
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
  return <span className="text-sm text-muted">{value}</span>
}

function FeatureCard({ f, index }) {
  const Icon = f.icon
  return (
    <Reveal delay={0.2 + index * 0.04} key={f.title}>
      <Card className="card-shell card-shell--interactive card-core--pad-base h-full flex flex-col">
        <Icon className="mb-2" size={20} color={f.accent} strokeWidth={1.75} />
        <h3 className="font-display text-base font-semibold tracking-tight mb-1">{f.title}</h3>
        <p className="text-sm text-muted leading-relaxed flex-1">{f.body}</p>
        <div className="mt-3 h-1 w-10 rounded bg-opacity-60" style={{ background: f.accent }} />
      </Card>
    </Reveal>
  )
}

function PrimaryCTA({ children, href }) {
  return (
    <Link to={href} className="no-underline">
      <Button variant="primary">{children}</Button>
    </Link>
  )
}

export default function Landing() {
  return (
    <Reveal>
      <div className="max-w-[960px] mx-auto px-4 lg:px-6">
        {/* Nav */}
        <Reveal delay={0}>
          <nav className="flex justify-between items-center py-4 border-b border-border">
            <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg tracking-tight text-ink no-underline">
              <img src="/brand-mark.png" alt="" width={22} height={22} className="rounded-md" />Sampada
            </Link>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link to="/login" className="text-sm text-muted hover:text-ink transition-colors no-underline">Sign in</Link>
              <PrimaryCTA href="/register">Get started</PrimaryCTA>
            </div>
          </nav>
        </Reveal>

        {/* Hero - with 3D visual */}
        <Reveal delay={100}>
          <section aria-labelledby="hero-heading" className="py-16 lg:py-24 relative">
            <div className="grid gap-8 lg:gap-12 lg:grid-cols-2 items-center">
              <div>
                <h1 id="hero-heading" className="font-display text-3xl lg:text-5xl font-bold tracking-tight leading-tight mb-4">
                  Zero is better than <em className="font-serif italic text-accent">negative</em>.
                </h1>
                <p className="text-base lg:text-lg text-muted max-w-xl mx-auto lg:mx-0 mb-6 leading-relaxed">
                  Debt payoff, AI-guided SIPs, and portfolio rebalancing in one self-hosted app — built to clear what you owe before it grows what you keep.
                </p>
                <div className="flex gap-3 justify-start flex-wrap">
                  <PrimaryCTA href="/register">Get started free</PrimaryCTA>
                  <Link to="/dashboard" className="no-underline">
                    <Button variant="secondary">See how it works</Button>
                  </Link>
                </div>
                <p className="text-xs text-faint mt-4 tracking-wide">Open source · Apache 2.0 · Free forever</p>
              </div>
              <div className="w-full max-w-[520px] mx-auto">
                <div id="landing-hero" className="w-full aspect-square max-w-[520px] mx-auto min-w-[280px]">
                  <HeroVisual />
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* 2. Debt → Zero → Wealth arc */}
        <Reveal delay={200}>
          <section aria-labelledby="arc-heading" className="py-12 lg:py-16">
            <h2 id="arc-heading" className="text-2xs font-semibold uppercase tracking-widest text-muted mb-5 text-center">The journey</h2>
            <div className="grid grid-cols-3 border border-border rounded-lg overflow-hidden">
              {[
                { label: 'Negative', desc: 'Track everything you owe. See the full picture of your debt.', color: 'var(--accent)', pct: '33%' },
                { label: 'Zero', desc: 'Set a debt-free target. Watch your progress toward zero.', color: 'var(--ink)', pct: '33%' },
                { label: 'Wealth', desc: 'Grow your net worth. Invest, save, and build your future.', color: 'var(--success)', pct: '34%' },
              ].map((s, i) => (
                <div key={s.label} className="p-6 lg:p-8 text-center" style={{ background: i === 1 ? 'var(--surface)' : 'transparent', borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <p className="text-2xs font-semibold uppercase tracking-wider text-muted mb-1">Stage {i + 1}</p>
                  <div className="font-display text-xl lg:text-2xl font-semibold tracking-tight mb-2" style={{ color: s.color }}>{s.label}</div>
                  <div className="h-1 w-full max-w-xs mx-auto mb-2 rounded" style={{ width: s.pct, background: s.color }} />
                  <p className="text-sm text-muted leading-relaxed max-w-xs mx-auto">{s.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-muted max-w-xl mx-auto mt-4 leading-relaxed">
              Set a goal like <em className="italic text-faint">"₹25,000/month passive income by 2030"</em> — Sampada reverse-engineers the SIP amount, stock picks, and rebalance cadence to get there.
            </p>
          </section>
        </Reveal>

        {/* 3. Feature grid */}
        <Reveal delay={300}>
          <section aria-labelledby="features-heading" className="py-16 lg:py-20">
            <h2 id="features-heading" className="text-2xs font-semibold uppercase tracking-widest text-muted mb-5 text-center">Capabilities</h2>
            <p className="text-center text-base text-muted max-w-xl mx-auto mb-7 leading-relaxed">Not a budgeting app. Not an investment dashboard. The full arc, in one place.</p>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f, i) => (
                <FeatureCard f={f} index={i} />
              ))}
            </div>
          </section>
        </Reveal>

        {/* 4. Why Sampada (comparison table) */}
        <Reveal delay={400}>
          <section aria-labelledby="compare-heading" className="py-12 lg:py-16">
            <h2 id="compare-heading" className="text-2xs font-semibold uppercase tracking-widest text-muted mb-5 text-center">Why Sampada</h2>
            <p className="text-center text-base text-muted max-w-xl mx-auto mb-2 leading-relaxed">Mint shut down in March 2024. YNAB costs ~$15/month. Sampada is neither.</p>

            <Card className="card-shell card-core--pad-none overflow-x-auto">
              <table className="w-full border-collapse text-sm min-w-[420px]">
                <thead>
                  <tr>
                    <th className="text-left px-4 py-2.5 text-2xs font-semibold uppercase tracking-wider text-faint"></th>
                    <th className="px-4 py-2.5 font-bold text-accent">Sampada</th>
                    <th className="px-4 py-2.5 font-semibold text-muted">YNAB</th>
                    <th className="px-4 py-2.5 font-semibold text-muted">Mint</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map(([label, sampada, ynab, mint]) => (
                    <tr key={label}>
                      <td className="px-4 py-2 border-t border-border-soft text-ink-soft">{label}</td>
                      <td className="px-4 py-2 border-t border-border-soft text-center"><CompareCell value={sampada} /></td>
                      <td className="px-4 py-2 border-t border-border-soft text-center"><CompareCell value={ynab} /></td>
                      <td className="px-4 py-2 border-t border-border-soft text-center"><CompareCell value={mint} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        </Reveal>

        {/* 5. Hosted SaaS */}
        <Reveal delay={500}>
          <section aria-labelledby="cta-heading" className="py-16 lg:py-20 text-center">
            <h2 id="cta-heading" className="font-display text-xl lg:text-2xl font-semibold tracking-tight mb-2">Hosted. Free. Forever.</h2>
            <p className="text-base text-muted max-w-xl mx-auto mb-5 leading-relaxed">
              No installation needed. Sign up at <a href="https://sampada.vayalabs.in" target="_blank" rel="noreferrer" className="text-accent no-underline">sampada.vayalabs.in</a> and start in seconds.
            </p>
            <p className="text-sm mt-3">
              <a href="https://github.com/sdachary/sampada" target="_blank" rel="noreferrer" className="text-faint no-underline hover:text-muted transition-colors">View source on GitHub →</a>
            </p>
          </section>
        </Reveal>

        {/* 6. Trust badges */}
        <Reveal delay={600}>
          <section className="py-10 lg:py-12 text-center border-t border-border-soft">
            <div className="flex gap-4 justify-center flex-wrap">
              <span className="flex items-center gap-2 text-sm text-muted"><Lock size={13} strokeWidth={2} /> Apache 2.0</span>
              <span className="flex items-center gap-2 text-sm text-muted"><Shield size={13} strokeWidth={2} /> DPDP compliant</span>
              <span className="flex items-center gap-2 text-sm text-muted"><Zap size={13} strokeWidth={2} /> Self-hosted</span>
              <span className="flex items-center gap-2 text-sm text-muted"><Star size={13} strokeWidth={2} /> No paywalls</span>
            </div>
          </section>
        </Reveal>

        <footer className="py-4 border-t border-border-soft text-sm text-faint text-center">
          Sampada — financial clarity · <a href="/privacy.html" className="text-faint no-underline hover:text-muted">Privacy</a> · <a href="/terms.html" className="text-faint no-underline hover:text-muted">Terms</a>
        </footer>
      </div>
    </Reveal>
  )
}