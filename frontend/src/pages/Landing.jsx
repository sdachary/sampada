import { Link } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import { Reveal } from '../lib/motion-primitives'
import { Check, X, TrendingDown, PiggyBank, RefreshCw, MessageSquare, AlertTriangle, Globe, Users, Cpu, Lock, Shield, Zap, Star, ArrowRight } from 'lucide-react'
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

function Eyebrow({ children }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-[0.2em] text-muted bg-border-soft mb-4">
      {children}
    </span>
  )
}

function FeatureCard({ f, index }) {
  const Icon = f.icon
  // Stagger: base 100ms + index * 80ms for fluid cascade
  const delay = 0.1 + index * 0.08
  return (
    <Reveal delay={delay} y={16} key={f.title}>
      <Card className="card-shell card-shell--interactive card-core--pad-lg h-full flex flex-col group">
        <div className="mb-3 p-2 rounded-xl bg-accent-bg group-hover:scale-105 transition-transform duration-300" style={{ width: 'fit-content' }}>
          <Icon size={22} color={f.accent} strokeWidth={1.5} />
        </div>
        <h3 className="font-display text-base font-semibold tracking-tight mb-2">{f.title}</h3>
        <p className="text-sm text-muted leading-relaxed flex-1">{f.body}</p>
        <div className="mt-4 h-1.5 w-12 rounded-full bg-opacity-60 group-hover:w-20 transition-all duration-500 ease-spring" style={{ background: f.accent }} />
      </Card>
    </Reveal>
  )
}

function PrimaryCTA({ children, href, variant = 'primary', size = 'lg' }) {
  return (
    <Link to={href} className="no-underline">
      <Button 
        variant={variant} 
        size={size}
        trailingIcon={
          <ArrowRight size={18} strokeWidth={2} />
        }
      >
        {children}
      </Button>
    </Link>
  )
}

function SectionHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-12">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="font-display text-2xl lg:text-4xl font-bold tracking-tight mb-4">{title}</h2>
      {subtitle && <p className="text-base lg:text-lg text-muted leading-relaxed">{subtitle}</p>}
    </div>
  )
}

export default function Landing() {
  return (
    <div className="max-w-[1024px] mx-auto px-4 lg:px-6">
      {/* Nav - floating island */}
      <Reveal delay={0} y={8}>
        <nav className="flex justify-between items-center py-6 lg:py-8">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl lg:text-2xl tracking-tight text-ink no-underline">
            <img src="/brand-mark.png" alt="" width={24} height={24} className="rounded-md" />Sampada
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/login" className="text-sm text-muted hover:text-ink transition-colors no-underline hidden sm:inline">Sign in</Link>
            <PrimaryCTA href="/register" size="base">Get started</PrimaryCTA>
          </div>
        </nav>
      </Reveal>

      {/* Hero - Editorial Split Layout */}
      <Reveal delay={100} y={20}>
        <section aria-labelledby="hero-heading" className="py-20 lg:py-32 relative">
          <div className="grid gap-12 lg:gap-16 lg:grid-cols-2 items-center">
            <div className="text-center lg:text-left">
              <Eyebrow>Personal Finance OS</Eyebrow>
              <h1 id="hero-heading" className="font-display text-4xl lg:text-6xl lg:leading-[1.05] font-bold tracking-tight mb-6">
                Zero is better than <em className="font-serif italic text-accent">negative</em>.
              </h1>
              <p className="text-lg lg:text-xl text-muted max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                Debt payoff, AI-guided SIPs, and portfolio rebalancing in one self-hosted app — built to clear what you owe before it grows what you keep.
              </p>
              <div className="flex gap-4 justify-center lg:justify-start flex-wrap">
                <PrimaryCTA href="/register">Get started free</PrimaryCTA>
                <Link to="/dashboard" className="no-underline">
                  <Button variant="secondary" size="lg">See how it works</Button>
                </Link>
              </div>
              <p className="text-xs text-faint mt-6 tracking-wide">Open source · Apache 2.0 · Free forever</p>
            </div>
            <div className="w-full max-w-[560px] mx-auto">
              <div className="w-full max-w-[560px] mx-auto min-w-[300px]" style={{ aspectRatio: '1 / 1' }}>
                <HeroVisual />
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* 2. Debt → Zero → Wealth arc - Z-Axis Cascade */}
      <Reveal delay={200} y={20}>
        <section aria-labelledby="arc-heading" className="py-20 lg:py-28">
          <SectionHeader 
            eyebrow="The Journey" 
            title="From Debt to Wealth" 
            subtitle="Three stages. One clear path. Sampada guides you through each phase."
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { label: 'Negative', desc: 'Track everything you owe. See the full picture of your debt.', color: 'var(--accent)', pct: '33%', icon: TrendingDown },
              { label: 'Zero', desc: 'Set a debt-free target. Watch your progress toward zero.', color: 'var(--ink)', pct: '33%', icon: PiggyBank },
              { label: 'Wealth', desc: 'Grow your net worth. Invest, save, and build your future.', color: 'var(--success)', pct: '34%', icon: RefreshCw },
            ].map((s, i) => (
              <Reveal key={s.label} delay={0.15 + i * 0.08} y={16}>
                <Card className="card-shell card-shell--interactive card-core--pad-xl h-full relative overflow-hidden group">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500" style={{ background: s.color }} />
                  <div className="relative z-10 text-center">
                    <div className="mb-4 p-3 rounded-2xl bg-accent-bg group-hover:scale-105 transition-transform duration-300" style={{ width: 'fit-content', margin: '0 auto' }}>
                      <s.icon size={28} color={s.color} strokeWidth={1.5} />
                    </div>
                    <p className="text-2xs font-semibold uppercase tracking-wider text-muted mb-2">Stage {i + 1}</p>
                    <div className="font-display text-2xl lg:text-3xl font-semibold tracking-tight mb-4" style={{ color: s.color }}>{s.label}</div>
                    <div className="h-1.5 w-full max-w-xs mx-auto mb-4 rounded-full bg-border-soft relative overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000 ease-spring" style={{ width: s.pct, background: s.color }} />
                    </div>
                    <p className="text-sm text-muted leading-relaxed max-w-xs mx-auto">{s.desc}</p>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
          <p className="text-center text-base text-muted max-w-xl mx-auto mt-8 leading-relaxed">
            Set a goal like <em className="italic text-faint">"₹25,000/month passive income by 2030"</em> — Sampada reverse-engineers the SIP amount, stock picks, and rebalance cadence to get there.
          </p>
        </section>
      </Reveal>

      {/* 3. Feature grid - Asymmetrical Bento */}
      <Reveal delay={300} y={20}>
        <section aria-labelledby="features-heading" className="py-20 lg:py-28">
          <SectionHeader 
            eyebrow="Capabilities" 
            title="Not a budgeting app. Not an investment dashboard." 
            subtitle="The full arc, in one place."
          />
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2 max-w-5xl mx-auto">
            {/* Large featured card - spans 2 columns on desktop */}
            <Reveal delay={0.1} y={16}>
              <Card className="card-shell card-shell--interactive card-core--pad-xl h-full flex flex-col lg:col-span-2 lg:row-span-1 group relative overflow-hidden">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500" style={{ background: 'var(--accent)' }} />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="mb-4 p-3 rounded-2xl bg-accent-bg" style={{ width: 'fit-content' }}>
                    <MessageSquare size={28} color="var(--accent)" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display text-xl lg:text-2xl font-semibold tracking-tight mb-3">Natural-language entries</h3>
                  <p className="text-base text-muted leading-relaxed flex-1 mb-6">"I spent ₹500 on groceries" becomes a categorized transaction, no forms. Type naturally, let AI categorize.</p>
                  <div className="mt-auto pt-4 border-t border-border-soft">
                    <div className="flex items-center gap-3 text-sm text-muted">
                      <span className="flex-1 h-px bg-border" />
                      <span className="font-medium text-ink">Try it in the app</span>
                      <ArrowRight size={16} color="var(--accent)" strokeWidth={2} />
                    </div>
                  </div>
                </div>
              </Card>
            </Reveal>
            
            {/* Remaining cards in bento layout */}
            {FEATURES.slice(0, 6).map((f, i) => (
              <FeatureCard key={f.title} f={f} index={i} />
            ))}
          </div>
        </section>
      </Reveal>

      {/* 4. Why Sampada (comparison table) */}
      <Reveal delay={400} y={20}>
        <section aria-labelledby="compare-heading" className="py-20 lg:py-28 bg-bg-elevated/50 rounded-3xl -mx-4 lg:mx-0 px-4 lg:px-0">
          <SectionHeader 
            eyebrow="Why Sampada" 
            title="Mint shut down. YNAB costs ~$15/month." 
            subtitle="Sampada is neither. Self-hosted, free forever, no paywalls."
          />
          <div className="overflow-x-auto max-w-4xl mx-auto">
            <Card className="card-shell card-core--pad-none">
              <table className="w-full border-collapse text-sm min-w-[520px]">
                <thead>
                  <tr className="border-b border-border-soft">
                    <th className="text-left px-6 py-4 text-2xs font-semibold uppercase tracking-wider text-faint"></th>
                    <th className="px-6 py-4 font-bold text-accent text-center">Sampada</th>
                    <th className="px-6 py-4 font-semibold text-muted text-center">YNAB</th>
                    <th className="px-6 py-4 font-semibold text-muted text-center">Mint</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map(([label, sampada, ynab, mint], i) => (
                    <tr key={label} className={i % 2 === 0 ? 'bg-bg/50' : ''}>
                      <td className="px-6 py-4 border-t border-border-soft text-ink-soft font-medium">{label}</td>
                      <td className="px-6 py-4 border-t border-border-soft text-center"><CompareCell value={sampada} /></td>
                      <td className="px-6 py-4 border-t border-border-soft text-center"><CompareCell value={ynab} /></td>
                      <td className="px-6 py-4 border-t border-border-soft text-center"><CompareCell value={mint} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </section>
      </Reveal>

      {/* 5. Hosted SaaS - Editorial CTA */}
      <Reveal delay={500} y={20}>
        <section aria-labelledby="cta-heading" className="py-20 lg:py-32 text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-accent-bg/50 to-transparent opacity-30 rounded-3xl" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <Eyebrow>Hosted Option</Eyebrow>
            <h2 id="cta-heading" className="font-display text-3xl lg:text-5xl font-semibold tracking-tight mb-4">Hosted. Free. Forever.</h2>
            <p className="text-lg text-muted max-w-xl mx-auto mb-8 leading-relaxed">
              No installation needed. Sign up at <a href="https://sampada.vayalabs.in" target="_blank" rel="noreferrer" className="text-accent no-underline font-medium hover:underline">sampada.vayalabs.in</a> and start in seconds.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <PrimaryCTA href="/register">Create free account</PrimaryCTA>
              <Link to="https://github.com/sdachary/sampada" target="_blank" rel="noreferrer" className="no-underline">
                <Button variant="ghost" size="lg">View source on GitHub →</Button>
              </Link>
            </div>
          </div>
        </section>
      </Reveal>

      {/* 6. Trust badges - Premium presentation */}
      <Reveal delay={600} y={16}>
        <section className="py-16 lg:py-20 text-center border-t border-border-soft">
          <div className="flex gap-4 lg:gap-8 justify-center flex-wrap max-w-4xl mx-auto px-4">
            {[
              { icon: Lock, label: 'Apache 2.0', desc: 'Open source license' },
              { icon: Shield, label: 'DPDP compliant', desc: 'Data protection ready' },
              { icon: Zap, label: 'Self-hosted', desc: 'Your data, your server' },
              { icon: Star, label: 'No paywalls', desc: 'Every feature free' },
            ].map(({ icon: Icon, label, desc }, i) => (
              <Reveal key={label} delay={0.1 + i * 0.06} y={12}>
                <div className="flex flex-col items-center gap-2 p-6 lg:p-8 rounded-2xl bg-bg-elevated/50 border border-border-soft hover:border-accent/50 transition-all duration-300 min-w-[180px]">
                  <div className="p-3 rounded-xl bg-accent-bg" style={{ width: 'fit-content' }}>
                    <Icon size={24} color="var(--accent)" strokeWidth={1.5} />
                  </div>
                  <div className="font-display text-base font-semibold tracking-tight">{label}</div>
                  <p className="text-xs text-muted">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </Reveal>

      <footer className="py-8 border-t border-border-soft text-sm text-faint text-center">
        Sampada — financial clarity · <a href="/privacy.html" className="text-faint no-underline hover:text-muted">Privacy</a> · <a href="/terms.html" className="text-faint no-underline hover:text-muted">Terms</a>
      </footer>
    </div>
  )
}