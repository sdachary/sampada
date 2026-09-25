import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export default function Sips() {
  const [sips, setSips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.request('/api/v1/dividend_sips').then(d => setSips(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div>
      {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 110, marginBottom: 8, borderRadius: 'var(--radius)' }} />)}
    </div>
  )

  const totalMonthly = sips.reduce((sum, s) => sum + (+s.monthly_investment || 0), 0)
  const totalProjected = sips.reduce((sum, s) => sum + (+s.projected_annual_income || 0), 0)

  return (
    <div>
      <p className="page-num mb-4" >00<em>11</em> / 016</p>
      <h1 className="page-title" >SIPs</h1>
      <p className="text-13-5-muted-sm" >Systematic Investment Plans.</p>

      {sips.length > 0 && (
        <div className="card card-pad-mb16" >
          <div className="flex-g20-wrap" >
            <div><span className="label-caps-sm" >Monthly Investment</span>
              <p className="fin amt-out" >₹{totalMonthly.toLocaleString('en-IN')}</p></div>
            <div><span className="label-caps-sm" >Projected Annual</span>
              <p className="fin amt-in" >₹{totalProjected.toLocaleString('en-IN')}</p></div>
          </div>
        </div>
      )}

      {sips.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">◒</span>
          <p>No SIPs active</p>
          <p className="text-12-faint" >Set up recurring investments to build wealth automatically.</p>
        </div>
      ) : sips.map(s => (
        <div key={s.id} className="card" style={{ padding: '14px 18px', marginBottom: 8 }}>
          <div className="spread-top-mb6" >
            <div>
              <p className="row-600-14" >{s.name}</p>
              <p className="text-11-5-muted" >{s.frequency} · {s.status}</p>
            </div>
            <p className="fin" style={{ fontFamily: 'var(--sans)', fontSize: 17, fontWeight: 600 }}>₹{(+s.monthly_investment || 0).toLocaleString('en-IN')}/mo</p>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
            {s.target_income && <span className="tag fs-10" >target ₹{(+s.target_income).toLocaleString('en-IN')}/mo</span>}
            {s.projected_annual_income && <span className="tag green fs-10" >₹{(+s.projected_annual_income).toLocaleString('en-IN')}/yr projected</span>}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Status: <span style={{ color: s.status === 'active' ? 'var(--emerald)' : 'var(--ink-mute)' }}>{s.status}</span></span>
            {s.next_execution && <span>Next: {s.next_execution}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
