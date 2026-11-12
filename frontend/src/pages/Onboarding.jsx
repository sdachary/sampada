import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/useAuth'
import { echoAmount } from '../lib/amounts'
import InsuranceFormModal from '../components/InsuranceFormModal'
import glossary from '../i18n/en.json'
import { Card, Button } from '../components/ui'
import { Reveal } from '../lib/motion-primitives'

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
    <div className="max-w-2xl mx-auto px-4 lg:px-0 py-8 lg:py-16 space-y-6">
      <Reveal delay={0}>
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold">Welcome to Sampada</h1>
          <p className="text-muted text-base mt-2">Set up your money in a few minutes. Skip anytime — you can come back.</p>
        </div>
      </Reveal>

      <Reveal delay={50}>
        {/* 3-number snapshot */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {[
            { label: 'Money in', value: snapshot?.money_in ?? null, hint: 'total income recorded' },
            { label: 'Money out', value: snapshot?.money_out ?? null, hint: 'total expenses recorded' },
            { label: 'Total owed', value: snapshot?.total_owed ?? null, hint: 'across active debts' },
          ].map(s => (
            <Card key={s.label} className="card-shell card-core--pad-base">
              <div className="text-2xs font-semibold uppercase tracking-wider text-muted">{s.label}</div>
              <div className="fin font-display text-2xl font-bold mt-1 text-ink">
                {s.value === null ? '—' : `${sym}${s.value.toLocaleString('en-IN')}`}
              </div>
              <div className="text-sm text-muted mt-1">{s.hint}</div>
            </Card>
          ))}
        </div>
      </Reveal>

      <Reveal delay={100}>
        {/* debt-first progress */}
        {snapshot && (
          <Card className="card-shell card-core--pad-lg">
            <div className="text-base font-semibold text-ink mb-2">Your debt-first progress</div>
            <div className="text-sm text-muted leading-relaxed">
              {snapshot.total_owed > 0
                ? <>You owe <strong>{echoAmount(snapshot.total_owed, sym)}</strong>. The goal: get this to zero, then build wealth. Pay off debts with the highest interest first.</>
                : <>No active debts — you're at <strong>zero</strong>. Next step is building your investments so net worth grows positive.</>
              }
            </div>
          </Card>
        )}
      </Reveal>

      <Reveal delay={150}>
        {/* checklist */}
        <div className="space-y-3">
          <p className="text-base font-semibold text-ink">
            Set up checklist ({done.loans && done.investments && done.insurance && done.budget ? '4/4' : `${CHECKLIST_ITEMS.filter(i => done[i.key]).length}/4`})
          </p>
          <div className="space-y-2">
            {CHECKLIST_ITEMS.map((item, index) => {
              const isDone = !!done[item.key]
              const isInsurance = item.key === 'insurance'
              const content = (
                <>
                  <span className="text-2xl">{item.icon}</span>
                  <span className="flex-1">
                    <span className="block text-base font-medium">{item.title}</span>
                    <span className="text-sm text-muted">{isDone ? 'Done' : item.desc}</span>
                  </span>
                  {isDone && <span className="text-accent text-lg">✓</span>}
                </>
              )
              return isInsurance ? (
                <Button
                  key={item.key}
                  onClick={() => setInsuranceOpen(true)}
                  disabled={isDone}
                  variant={isDone ? 'ghost' : 'primary'}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  {content}
                </Button>
              ) : (
                <Link
                  key={item.key}
                  to={item.to}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors duration-fast ${isDone ? 'border-border bg-surface' : 'border-accent bg-surface'}`}
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  {content}
                </Link>
              )
            })}
          </div>
        </div>
      </Reveal>

      <Reveal delay={200}>
        {/* glossary */}
        <div className="space-y-3">
          <p className="text-base font-semibold text-ink">Money terms, in plain language</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(glossary).map(([key, g]) => (
              <Button
                key={key}
                onClick={() => setGlossaryTerm(key)}
                variant="ghost"
                size="sm"
                className="px-3 py-1.5 rounded-full border border-border bg-surface text-muted text-sm"
              >
                {g.label}
              </Button>
            ))}
          </div>
          {glossaryTerm && (
            <Card className="card-shell card-core--pad-base">
              <p className="text-base font-semibold text-ink">{glossary[glossaryTerm].plain}</p>
              <p className="text-sm text-muted mt-1">e.g. {glossary[glossaryTerm].example}</p>
            </Card>
          )}
        </div>
      </Reveal>

      <Reveal delay={250}>
        {/* actions */}
        <div className="flex gap-2">
          <Button variant="primary" className="flex-1">
            {remaining.length === 0 ? 'Finish setup' : 'Mark setup complete'}
          </Button>
          <Button variant="ghost" onClick={finish}>Skip for now</Button>
        </div>
      </Reveal>

      <InsuranceFormModal
        open={insuranceOpen}
        currencySymbol={sym}
        onClose={() => setInsuranceOpen(false)}
        onSave={() => { setInsuranceOpen(false); api.onboardingSnapshot().then(setSnapshot).catch(() => {}) }}
      />
    </div>
  )
}