import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { fmtINR } from '../lib/amounts'

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
    <div>
      {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 80, marginBottom: 8, borderRadius: 'var(--radius)' }} />)}
    </div>
  )

  if (!journey) return (
    <div>
      <p className="page-num mb-4" >00<em>12</em> / 016</p>
      <h1 className="page-title" >Your Journey</h1>
      <p style={{ fontSize: 13.5, color: 'var(--ink-mute)', marginBottom: 20 }}>Your path to financial freedom.</p>
      <div className="empty-state">
        <span className="emoji">→</span>
        <p>Start your financial journey</p>
        <p className="text-12-faint" >Track your first debt or investment to see your journey unfold.</p>
      </div>
    </div>
  )

  const d = journey.debt || {}
  const s = journey.sip || {}
  const nw = journey.net_worth || {}
  const p = progress || {}
  const dp = p.debt_progress || {}
  const sp = p.sip_progress || {}
  const nwp = p.net_worth_progress || {}
  const milestones = journey.milestones || p?.milestones || []

  return (
    <div>
      <p className="page-num mb-4" >00<em>12</em> / 016</p>
      <h1 className="page-title" >Your Journey</h1>
      <p className="text-13-5-muted-sm" >Your path to financial freedom.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
        <div className="card card-pad-16" >
          <p className="label-caps-sm mb-4" >Net Worth</p>
          <p className="fin" style={{ fontSize: 20, fontWeight: 600, color: (+nw.net_worth || 0) >= 0 ? 'var(--emerald)' : 'var(--coral)' }}>
            {fmtINR(+nw.net_worth || 0)}
          </p>
          <p className="text-11-muted" >Assets: {fmtINR(+nw.assets || 0)} · Liab: {fmtINR(+nw.liabilities || 0)}</p>
        </div>
        <div className="card card-pad-16" >
          <p className="label-caps-sm mb-4" >Total Debt</p>
          <p className="fin amt-20-out" >{fmtINR(+d.total_debt || 0)}</p>
          {d.total_emi && <p className="text-11-muted" >EMI: {fmtINR(+d.total_emi)}/mo</p>}
        </div>
        <div className="card card-pad-16" >
          <p className="label-caps-sm mb-4" >SIP Progress</p>
          <p className="fin" style={{ fontSize: 20, fontWeight: 600, color: 'var(--emerald)' }}>{sp.progress || 0}%</p>
          <p className="text-11-muted" >Goal: {fmtINR(+sp.monthly_goal || 0)}/mo</p>
        </div>
      </div>

      {/* Goal Progress Bars */}
      <h2 className="h-600-14-ls" >Goals</h2>

      <div className="card card-pad-16-mb8" >
        <div className="spread-mb4" >
          <span className="h-500-13" >Net Worth Target</span>
          <span className="fin text-12-muted" >{fmtINR(+nwp.current || 0)} / {fmtINR(+nwp.target || 0)}</span>
        </div>
        <div className="progress h-8" >
          <div className="progress-fill green" style={{ width: `${nwp.progress_pct || 0}%` }} />
        </div>
        <p className="text-11-faint mt-4" >{nwp.progress_pct || 0}% of ₹50L goal</p>
      </div>

      <div className="card card-pad-16-mb8" >
        <div className="spread-mb4" >
          <span className="h-500-13" >Debt Reduction</span>
          <span className="fin text-12-muted" >{fmtINR(+dp.paid_debt || 0)} / {fmtINR(+dp.original_debt || 0)}</span>
        </div>
        <div className="progress h-8" >
          <div className="progress-fill" style={{ width: `${dp.reduction_pct || 0}%`, background: 'var(--coral)' }} />
        </div>
        <p className="text-11-faint mt-4" >{dp.reduction_pct || 0}% paid off · {fmtINR(+dp.total_debt || 0)} remaining</p>
      </div>

      <div className="card" style={{ padding: '16px', marginBottom: 16 }}>
        <div className="spread-mb4" >
          <span className="h-500-13" >Monthly SIP Goal</span>
          <span className="fin text-12-muted" >{sp.progress || 0}%</span>
        </div>
        <div className="progress h-8" >
          <div className="progress-fill green" style={{ width: `${sp.progress || 0}%`, background: '#a855f7' }} />
        </div>
        <p className="text-11-faint mt-4" >Goal: {fmtINR(+sp.monthly_goal || 0)}/mo</p>
      </div>

      {milestones.length > 0 && (
        <div>
          <h2 className="h-600-14-ls" >Milestones</h2>
          {milestones.map((m, i) => (
            <div key={i} className="card" style={{ padding: '12px 16px', marginBottom: 6, borderLeft: '3px solid var(--emerald)' }}>
              <p className="row-600-13" >{m.title || m.name}</p>
              {m.date && <p className="text-11-muted" >{m.date}</p>}
            </div>
          ))}
        </div>
      )}

      {p?.net_worth_trajectory?.length > 0 && (
        <div className="mt-16" >
          <h2 className="h-600-14-ls" >Net Worth Trajectory</h2>
          <div className="card card-pad-16" >
            {p.net_worth_trajectory.slice(0, 12).map((pt, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: i < 11 ? '1px solid var(--line-soft)' : 'none' }}>
                <span className="text-mute" >{pt.date || pt.month}</span>
                <span className="fin fw-500" >{fmtINR(+pt.net_worth || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
