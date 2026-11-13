import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { fmtINR } from '../lib/amounts'
import { Button, Card, Progress, Skeleton, EmptyState, PageHeader, Badge } from '../components/ui'
import { Reveal } from '../lib/motion-primitives'

export default function Journey() {
  const [journey, setJourney] = useState(null)
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.request('/api/v1/journey'),
      api.request('/api/v1/journey/progress'),
    ]).then(([j, p]) => { setJourney(j); setProgress(p) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <Reveal delay={0}>
      <div className="space-y-2">
        {[1,2,3,4].map(i => <Skeleton key={i} className="skeleton-card h-20" />)}
      </div>
    </Reveal>
  )

  if (!journey) return (
    <div className="space-y-4">
      <Reveal delay={0}>
        <PageHeader
          title="Your Journey"
          num="012 / 016"
        >
          <p className="text-sm text-muted">Your path to financial freedom.</p>
        </PageHeader>
      </Reveal>
      <Reveal delay={50}>
        <EmptyState
          icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-border" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>}
          title="Start your financial journey"
          action="Start your journey"
          onAction={() => window.location.href = '/dashboard/onboarding'}
        >
          Track your first debt or investment to see your journey unfold.
        </EmptyState>
      </Reveal>
    </div>
  )

  const d = journey.debt || {}
  const nw = journey.net_worth || {}
  const p = progress || {}
  const dp = p.debt_progress || {}
  const sp = p.sip_progress || {}
  const nwp = p.net_worth_progress || {}
  const milestones = journey.milestones || p?.milestones || []

  return (
    <div className="space-y-5">
      <Reveal delay={0}>
        <PageHeader
          title="Your Journey"
          num="012 / 016"
        >
          <p className="text-sm text-muted">Your path to financial freedom.</p>
        </PageHeader>
      </Reveal>

      <Reveal delay={50}>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="card-shell card-core--pad-base">
            <p className="label-caps">Net Worth</p>
            <p className={`fin font-display text-xl font-semibold ${(+nw.net_worth || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
              {fmtINR(+nw.net_worth || 0)}
            </p>
            <p className="text-sm text-muted">Assets: {fmtINR(+nw.assets || 0)} · Liab: {fmtINR(+nw.liabilities || 0)}</p>
          </Card>
          <Card className="card-shell card-core--pad-base">
            <p className="label-caps">Total Debt</p>
            <p className="fin font-display text-xl font-semibold text-danger">{fmtINR(+d.total_debt || 0)}</p>
            {d.total_emi && <p className="text-sm text-muted">EMI: {fmtINR(+d.total_emi)}/mo</p>}
          </Card>
          <Card className="card-shell card-core--pad-base">
            <p className="label-caps">SIP Progress</p>
            <p className="fin font-display text-xl font-semibold text-success">{sp.progress || 0}%</p>
            <p className="text-sm text-muted">Goal: {fmtINR(+sp.monthly_goal || 0)}/mo</p>
          </Card>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <p className="text-lg font-semibold text-ink mb-3">Goals</p>
      </Reveal>

      <Reveal delay={150}>
        <Card className="card-shell card-core--pad-lg">
          <div className="flex justify-between items-start mb-1">
            <span className="text-base font-medium">Net Worth Target</span>
            <span className="fin text-sm text-muted">{fmtINR(+nwp.current || 0)} / {fmtINR(+nwp.target || 0)}</span>
          </div>
          <Progress value={nwp.progress_pct || 0} variant="success" />
          <p className="text-xs text-faint mt-2">{nwp.progress_pct || 0}% of ₹50L goal</p>
        </Card>
      </Reveal>

      <Reveal delay={200}>
        <Card className="card-shell card-core--pad-lg">
          <div className="flex justify-between items-start mb-1">
            <span className="text-base font-medium">Debt Reduction</span>
            <span className="fin text-sm text-muted">{fmtINR(+dp.paid_debt || 0)} / {fmtINR(+dp.original_debt || 0)}</span>
          </div>
          <Progress value={dp.reduction_pct || 0} variant="danger" />
          <p className="text-xs text-faint mt-2">{dp.reduction_pct || 0}% paid off · {fmtINR(+dp.total_debt || 0)} remaining</p>
        </Card>
      </Reveal>

      <Reveal delay={250}>
        <Card className="card-shell card-core--pad-lg">
          <div className="flex justify-between items-start mb-1">
            <span className="text-base font-medium">Monthly SIP Goal</span>
            <span className="fin text-sm text-muted">{sp.progress || 0}%</span>
          </div>
          <Progress value={sp.progress || 0} variant="success" />
          <p className="text-xs text-faint mt-2">Goal: {fmtINR(+sp.monthly_goal || 0)}/mo</p>
        </Card>
      </Reveal>

      <Reveal delay={300}>
        {milestones.length > 0 && (
          <div className="space-y-2">
            <p className="text-lg font-semibold text-ink mb-2">Milestones</p>
            {milestones.map((m, i) => (
              <Reveal key={i} delay={i * 30}>
                <Card className="card-shell card-core--pad-base border-l-3 border-l-success">
                  <p className="text-base font-medium text-ink">{m.title || m.name}</p>
                  {m.date && <p className="text-sm text-muted">{m.date}</p>}
                </Card>
              </Reveal>
            ))}
          </div>
        )}
      </Reveal>

      <Reveal delay={350}>
        {p?.net_worth_trajectory?.length > 0 && (
          <div className="space-y-3">
            <p className="text-lg font-semibold text-ink">Net Worth Trajectory</p>
            <Card className="card-shell card-core--pad-lg">
              <div className="space-y-1">
                {p.net_worth_trajectory.slice(0, 12).map((pt, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-border-soft last:border-0">
                    <span className="text-muted">{pt.date || pt.month}</span>
                    <span className="fin font-medium">{fmtINR(+pt.net_worth || 0)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </Reveal>
    </div>
  )
}