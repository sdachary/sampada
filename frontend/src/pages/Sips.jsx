import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Card, Badge, Skeleton, EmptyState, PageHeader, Stat, fmtINR } from '../components/ui'

export default function Sips() {
  const [sips, setSips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.request('/api/v1/dividend_sips').then(d => setSips(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'grid', gap: 8 }}>
      {[1,2].map(i => <Skeleton key={i} style={{ height: 110, borderRadius: 'var(--radius-md)' }} />)}
    </div>
  )

  const totalMonthly = sips.reduce((sum, s) => sum + (+s.monthly_investment || 0), 0)
  const totalProjected = sips.reduce((sum, s) => sum + (+s.projected_annual_income || 0), 0)

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHeader
        title="SIPs"
        num="011 / 016"
      >
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Systematic Investment Plans.</p>
      </PageHeader>

      {sips.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))', gap: 12 }}>
          <Stat label="Monthly Investment" value={fmtINR(totalMonthly)} />
          <Stat label="Projected Annual" value={fmtINR(totalProjected)} />
        </div>
      )}

      {sips.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true" style={{ fontSize: 48, color: 'var(--border)' }}>◒</span>}
          title="No SIPs active"
        >
          Set up recurring investments to build wealth automatically.
        </EmptyState>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {sips.map(s => (
            <Card key={s.id} style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{s.name}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--muted)' }}>{s.frequency} · {s.status}</p>
                </div>
                <p className="fin" style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>{fmtINR(+s.monthly_investment || 0)}/mo</p>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                {s.target_income && <Badge variant="accent" style={{ fontSize: 10 }}>target {fmtINR(+s.target_income)}/mo</Badge>}
                {s.projected_annual_income && <Badge variant="success" style={{ fontSize: 10 }}>{fmtINR(+s.projected_annual_income)}/yr projected</Badge>}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Status: <span style={{ color: s.status === 'active' ? 'var(--success)' : 'var(--muted)' }}>{s.status}</span></span>
                {s.next_execution && <span>Next: {s.next_execution}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}