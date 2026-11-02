import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/useAuth'
import { echoAmount } from '../lib/amounts'
import InsuranceFormModal from '../components/InsuranceFormModal'
import glossary from '../i18n/en.json'
import { Card, Button, Badge, PageHeader, fmtINR } from '../components/ui'

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
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 64px', display: 'grid', gap: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Welcome to Sampada</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>Set up your money in a few minutes. Skip anytime — you can come back.</p>
      </div>

      {/* 3-number snapshot */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Money in', value: snapshot?.money_in ?? null, hint: 'total income recorded' },
          { label: 'Money out', value: snapshot?.money_out ?? null, hint: 'total expenses recorded' },
          { label: 'Total owed', value: snapshot?.total_owed ?? null, hint: 'across active debts' },
        ].map(s => (
          <Card key={s.label} style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              {s.value === null ? '—' : `${sym}${s.value.toLocaleString('en-IN')}`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{s.hint}</div>
          </Card>
        ))}
      </div>

      {/* debt-first progress */}
      {snapshot && (
        <Card style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>Your debt-first progress</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            {snapshot.total_owed > 0
              ? <>You owe <strong>{echoAmount(snapshot.total_owed, sym)}</strong>. The goal: get this to zero, then build wealth. Pay off debts with the highest interest first.</>
              : <>No active debts — you're at <strong>zero</strong>. Next step is building your investments so net worth grows positive.</>}
          </div>
        </Card>
      )}

      {/* checklist */}
      <div style={{ display: 'grid', gap: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
          Set up checklist ({done.loans && done.investments && done.insurance && done.budget ? '4/4' : `${CHECKLIST_ITEMS.filter(i => done[i.key]).length}/4`})
        </p>
        <div style={{ display: 'grid', gap: 8 }}>
          {CHECKLIST_ITEMS.map(item => {
            const isDone = !!done[item.key]
            const isInsurance = item.key === 'insurance'
            const content = (
              <>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, display: 'block' }}>{item.title}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{isDone ? 'Done' : item.desc}</span>
                </span>
                {isDone && <span style={{ color: 'var(--accent)', fontSize: 14 }}>✓</span>}
              </>
            )
            return isInsurance ? (
              <Button key={item.key} onClick={() => setInsuranceOpen(true)} disabled={isDone} variant={isDone ? 'ghost' : 'primary'} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', textAlign: 'left', width: '100%' }}>
                {content}
              </Button>
            ) : (
              <Link key={item.key} to={item.to}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, border: `1px solid ${isDone ? 'var(--border)' : 'var(--accent)'}`, background: 'var(--surface)', textDecoration: 'none', color: 'inherit' }}>
                {content}
              </Link>
            )
          })}
        </div>
      </div>

      {/* glossary */}
      <div style={{ display: 'grid', gap: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Money terms, in plain language</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(glossary).map(([key, g]) => (
            <Button key={key} onClick={() => setGlossaryTerm(key)} variant="ghost" size="sm" style={{ padding: '6px 14px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--muted)', fontSize: 13 }}>
              {g.label}
            </Button>
          ))}
        </div>
        {glossaryTerm && (
          <Card style={{ padding: '14px 18px' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{glossary[glossaryTerm].plain}</p>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>e.g. {glossary[glossaryTerm].example}</p>
          </Card>
        )}
      </div>

      {/* actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="primary" style={{ flex: 1 }}>
          {remaining.length === 0 ? 'Finish setup' : 'Mark setup complete'}
        </Button>
        <Button variant="ghost" onClick={finish}>Skip for now</Button>
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