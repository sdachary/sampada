import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { echoAmount } from '../lib/amounts'
import InsuranceFormModal from '../components/InsuranceFormModal'
import glossary from '../i18n/en.json'

const CHECKLIST_ITEMS = [
  { key: 'loans', title: 'Loans & EMIs', desc: 'Add what you owe', to: '/dashboard/debts', icon: '🏦' },
  { key: 'investments', title: 'Investments & Portfolio', desc: 'Track what you own', to: '/dashboard/portfolios', icon: '📈' },
  { key: 'insurance', title: 'Insurance', desc: 'Add your policies', icon: '🛡️' },
  { key: 'budget', title: 'Set a Budget', desc: 'Plan your monthly spending', to: '/dashboard/budgets', icon: '💸' },
]

export default function Onboarding() {
  const { setOnboarded } = useAuth()
  const navigate = useNavigate()
  const [snapshot, setSnapshot] = useState(null)
  const [insuranceOpen, setInsuranceOpen] = useState(false)
  const [glossaryTerm, setGlossaryTerm] = useState(null)

  useEffect(() => {
    api.onboardingSnapshot().then(setSnapshot).catch(() => {})
  }, [])

  const finish = async () => {
    try { await api.onboardingComplete() } catch {}
    setOnboarded(true)
    navigate('/dashboard')
  }

  const sym = snapshot?.currency_symbol || '₹'
  const done = snapshot?.checklist || {}
  const remaining = CHECKLIST_ITEMS.filter(i => !done[i.key])

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 64px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Welcome to Sampada</h1>
        <p style={{ color: 'var(--ink-mute)', fontSize: 14, marginTop: 6 }}>Set up your money in a few minutes. Skip anytime — you can come back.</p>
      </div>

      {/* 3-number snapshot */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28,
      }}>
        {[
          { label: 'Money in', value: snapshot?.money_in ?? null, hint: 'total income recorded' },
          { label: 'Money out', value: snapshot?.money_out ?? null, hint: 'total expenses recorded' },
          { label: 'Total owed', value: snapshot?.total_owed ?? null, hint: 'across active debts' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--paper-card)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6, color: 'var(--ink)' }}>
              {s.value === null ? '—' : `${sym}${s.value.toLocaleString('en-IN')}`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-mute)', marginTop: 4 }}>{s.hint}</div>
          </div>
        ))}
      </div>

      {/* debt-first progress */}
      {snapshot && (
        <div style={{ background: 'var(--paper-card)', border: '1px solid var(--line)', borderRadius: 12, padding: '18px 20px', marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Your debt-first progress</div>
          <div style={{ fontSize: 13, color: 'var(--ink-mute)', lineHeight: 1.6 }}>
            {snapshot.total_owed > 0
              ? <>You owe <strong>{echoAmount(snapshot.total_owed, sym)}</strong>. The goal: get this to zero, then build wealth. Pay off debts with the highest interest first.</>
              : <>No active debts — you're at <strong>zero</strong>. Next step is building your investments so net worth grows positive.</>}
          </div>
        </div>
      )}

      {/* checklist */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Set up checklist ({done.loans && done.investments && done.insurance && done.budget ? '4/4' : `${CHECKLIST_ITEMS.filter(i => done[i.key]).length}/4`})</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CHECKLIST_ITEMS.map(item => {
            const isDone = !!done[item.key]
            const isInsurance = item.key === 'insurance'
            const content = (
              <>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, display: 'block' }}>{item.title}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>{isDone ? 'Done' : item.desc}</span>
                </span>
                {isDone && <span style={{ color: 'var(--coral)', fontSize: 14 }}>✓</span>}
              </>
            )
            return isInsurance ? (
              <button key={item.key} onClick={() => setInsuranceOpen(true)} disabled={isDone}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, border: `1px solid ${isDone ? 'var(--line)' : 'var(--coral)'}`, background: 'var(--paper-card)', textAlign: 'left', cursor: isDone ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                {content}
              </button>
            ) : (
              <Link key={item.key} to={item.to}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, border: `1px solid ${isDone ? 'var(--line)' : 'var(--coral)'}`, background: 'var(--paper-card)', textDecoration: 'none', color: 'inherit' }}>
                {content}
              </Link>
            )
          })}
        </div>
      </div>

      {/* glossary */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Money terms, in plain language</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(glossary).map(([key, g]) => (
            <button key={key} onClick={() => setGlossaryTerm(key)}
              style={{ padding: '6px 14px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--paper-card)', color: 'var(--ink-mute)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {g.label}
            </button>
          ))}
        </div>
        {glossaryTerm && (
          <div style={{ background: 'var(--paper-card)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px 18px', marginTop: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{glossary[glossaryTerm].plain}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-mute)', marginTop: 4 }}>e.g. {glossary[glossaryTerm].example}</div>
          </div>
        )}
      </div>

      {/* actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={finish} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
          {remaining.length === 0 ? 'Finish setup' : 'Mark setup complete'}
        </button>
        <button onClick={finish}
          style={{ padding: '10px 20px', borderRadius: 999, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-mute)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
          Skip for now
        </button>
      </div>

      <InsuranceFormModal
        open={insuranceOpen}
        currencySymbol={sym}
        onClose={() => setInsuranceOpen(false)}
        onSave={() => { setInsuranceOpen(false); api.onboardingSnapshot().then(setSnapshot).catch(() => {}) }}
      />
    </div>
  )
}
