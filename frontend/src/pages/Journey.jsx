import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { fmtINR } from '../lib/amounts'
import { Button, Card, Progress, Skeleton, EmptyState, PageHeader, Badge } from '../components/ui'

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
    <div style={{ display: 'grid', gap: 8 }}>
      {[1,2,3,4].map(i => <Skeleton key={i} style={{ height: 80, marginBottom: 8, borderRadius: 'var(--radius-md)' }} />)}
    </div>
  )

  if (!journey) return (
    <div style={{ display: 'grid', gap: 16 }}>
      <PageHeader
        title="Your Journey"
        num="012 / 016"
      >
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Your path to financial freedom.</p>
      </PageHeader>
      <EmptyState
        icon={<span aria-hidden="true" style={{ fontSize: 48, color: 'var(--border)' }}>→</span>}
        title="Start your financial journey"
        action="Start your journey"
        onAction={() => window.location.href = '/dashboard/onboarding'}
      >
        Track your first debt or investment to see your journey unfold.
      </EmptyState>
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
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHeader
        title="Your Journey"
        num="012 / 016"
      >
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Your path to financial freedom.</p>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <Card style={{ padding: '16px' }}>
          <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Net Worth</p>
          <p className="fin" style={{ fontSize: 20, fontWeight: 600, color: (+nw.net_worth || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {fmtINR(+nw.net_worth || 0)}
          </p>
          <p style={{ fontSize: 11, color: 'var(--muted)' }}>Assets: {fmtINR(+nw.assets || 0)} · Liab: {fmtINR(+nw.liabilities || 0)}</p>
        </Card>
        <Card style={{ padding: '16px' }}>
          <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Total Debt</p>
          <p className="fin" style={{ fontSize: 20, fontWeight: 600, color: 'var(--danger)' }}>{fmtINR(+d.total_debt || 0)}</p>
          {d.total_emi && <p style={{ fontSize: 11, color: 'var(--muted)' }}>EMI: {fmtINR(+d.total_emi)}/mo</p>}
        </Card>
        <Card style={{ padding: '16px' }}>
          <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>SIP Progress</p>
          <p className="fin" style={{ fontSize: 20, fontWeight: 600, color: 'var(--success)' }}>{sp.progress || 0}%</p>
          <p style={{ fontSize: 11, color: 'var(--muted)' }}>Goal: {fmtINR(+sp.monthly_goal || 0)}/mo</p>
        </Card>
      </div>

      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Goals</p>

      <Card style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Net Worth Target</span>
          <span className="fin" style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtINR(+nwp.current || 0)} / {fmtINR(+nwp.target || 0)}</span>
        </div>
        <Progress value={nwp.progress_pct || 0} variant="success" />
        <p style={{ fontSize: 11, color: 'var(--faint)', marginTop: 8 }}>{nwp.progress_pct || 0}% of ₹50L goal</p>
      </Card>

      <Card style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Debt Reduction</span>
          <span className="fin" style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtINR(+dp.paid_debt || 0)} / {fmtINR(+dp.original_debt || 0)}</span>
        </div>
        <Progress value={dp.reduction_pct || 0} variant="danger" />
        <p style={{ fontSize: 11, color: 'var(--faint)', marginTop: 8 }}>{dp.reduction_pct || 0}% paid off · {fmtINR(+dp.total_debt || 0)} remaining</p>
      </Card>

      <Card style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Monthly SIP Goal</span>
          <span className="fin" style={{ fontSize: 12, color: 'var(--muted)' }}>{sp.progress || 0}%</span>
        </div>
        <Progress value={sp.progress || 0} variant="success" />
        <p style={{ fontSize: 11, color: 'var(--faint)', marginTop: 8 }}>Goal: {fmtINR(+sp.monthly_goal || 0)}/mo</p>
      </Card>

      {milestones.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Milestones</p>
          {milestones.map((m, i) => (
            <Card key={i} style={{ padding: '12px 16px', borderLeft: '3px solid var(--success)' }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{m.title || m.name}</p>
              {m.date && <p style={{ fontSize: 11, color: 'var(--muted)' }}>{m.date}</p>}
            </Card>
          ))}
        </div>
      )}

      {p?.net_worth_trajectory?.length > 0 && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Net Worth Trajectory</p>
          <Card style={{ padding: '16px' }}>
            {p.net_worth_trajectory.slice(0, 12).map((pt, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: i < 11 ? '1px solid var(--border-soft)' : 'none' }}>
                <span style={{ color: 'var(--muted)' }}>{pt.date || pt.month}</span>
                <span className="fin" style={{ fontWeight: 500 }}>{fmtINR(+pt.net_worth || 0)}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}