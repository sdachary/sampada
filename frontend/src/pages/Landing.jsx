import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-revealeveal]')
    const o = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); o.unobserve(e.target) } })
    }, { threshold: 0.1 })
    els.forEach(el => o.observe(el))
    return () => o.disconnect()
  }, [])
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
      <section style={{ padding: '80px 0 60px', textAlign: 'center' }} data-reveal>
        <p className="page-num" style={{ marginBottom: 12 }}>00<em>1</em> / 004</p>
        <h1 style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 16 }}>
          Your finances,<br />in <em style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--coral)' }}>one</em> clear picture
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink-mute)', maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.6 }}>
          Sampada tracks your debts, investments, and net worth — so you always know where you stand.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/register" className="btn btn-primary">Start free</Link>
          <Link to="/login" className="btn btn-ghost">Sign in</Link>
        </div>
      </section>

      {/* 2. Debt → Zero → Wealth arc */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, marginBottom: 40, border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
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

      {/* 3. Alternating features (3, not 4) */}
      <section style={{ padding: '40px 0 60px' }}>
        <p className="page-num" style={{ marginBottom: 6, textAlign: 'center' }}>00<em>2</em> / 004</p>
        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--ink-mute)', maxWidth: 420, margin: '0 auto 40px', lineHeight: 1.6 }}>
          Three numbers that matter. One place to see them all.
        </p>
        {[
          { title: 'Debt-first philosophy', body: 'Sampada puts debt front and center because interest is the biggest drag on your wealth. Know every loan, its rate, and the fastest way out.', side: 'left' },
          { title: 'Free, not freemium', body: 'No paid tiers, no credit score upsells, no premium features behind a paywall. The whole app is free.', side: 'right' },
          { title: 'Multi-currency, multi-household', body: 'Track investments and expenses across currencies, manage shared finances with family, all in one ledger.', side: 'left' },
        ].map((f, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: f.side === 'right' ? 'row-reverse' : 'row',
            gap: 32, alignItems: 'center', marginBottom: i < 2 ? 28 : 0,
            padding: '24px 0',
          }} data-reveal>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontFamily: 'var(--sans)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--ink-mute)', lineHeight: 1.6, maxWidth: 380 }}>{f.body}</p>
            </div>
            <div style={{
              flex: 1, height: 120, borderRadius: 'var(--radius)',
              background: 'linear-gradient(135deg, var(--line-soft), var(--line))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 40, color: 'var(--ink-faint)',
            }}>{(i + 1) * 100}</div>
          </div>
        ))}
      </section>

      {/* 4. CTA */}
      <section style={{ padding: '50px 0 70px', textAlign: 'center', borderTop: '1px solid var(--line-soft)' }}>
        <p className="page-num" style={{ marginBottom: 12 }}>00<em>3</em> / 004</p>
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
