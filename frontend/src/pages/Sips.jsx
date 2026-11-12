import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Card, Badge, Skeleton, EmptyState, PageHeader, Stat, fmtINR } from '../components/ui'
import { Reveal } from '../lib/motion-primitives'

export default function Sips() {
  const [sips, setSips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.request('/api/v1/dividend_sips').then(d => setSips(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <Reveal delay={0}>
      <div className="space-y-2">
        {[1,2].map(i => <Skeleton key={i} className="skeleton-card" />)}
      </div>
    </Reveal>
  )

  const totalMonthly = sips.reduce((sum, s) => sum + (+s.monthly_investment || 0), 0)
  const totalProjected = sips.reduce((sum, s) => sum + (+s.projected_annual_income || 0), 0)

  return (
    <div className="space-y-5">
      <Reveal delay={0}>
        <PageHeader
          title="SIPs"
          num="011 / 016"
        >
          <p className="text-sm text-muted">Systematic Investment Plans.</p>
        </PageHeader>
      </Reveal>

      <Reveal delay={50}>
        {sips.length > 0 && (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <Stat label="Monthly Investment" value={fmtINR(totalMonthly)} />
            <Stat label="Projected Annual" value={fmtINR(totalProjected)} />
          </div>
        )}
      </Reveal>

      <Reveal delay={100}>
        {sips.length === 0 ? (
          <EmptyState
            icon={<span aria-hidden="true" className="text-5xl text-border">◒</span>}
            title="No SIPs active"
          >
            Set up recurring investments to build wealth automatically.
          </EmptyState>
        ) : (
          <div className="space-y-2">
            {sips.map((s, index) => (
              <Reveal key={s.id} delay={index * 20}>
                <Card className="card-shell card-shell--interactive card-core--pad-base">
                  <div className="flex justify-between items-start mb-2">
                    <div className="min-w-0">
                      <p className="text-base font-medium text-ink truncate">{s.name}</p>
                      <p className="text-sm text-muted">{s.frequency} · {s.status}</p>
                    </div>
                    <p className="fin font-display text-lg font-semibold ml-3">{fmtINR(+s.monthly_investment || 0)}/mo</p>
                  </div>
                  <div className="flex gap-2 flex-wrap mb-1">
                    {s.target_income && <Badge variant="accent" className="text-[10px]">target {fmtINR(+s.target_income)}/mo</Badge>}
                    {s.projected_annual_income && <Badge variant="success" className="text-[10px]">{fmtINR(+s.projected_annual_income)}/yr projected</Badge>}
                  </div>
                  <div className="flex justify-between text-sm text-muted">
                    <span>Status: <span className={s.status === 'active' ? 'text-success' : ''}>{s.status}</span></span>
                    {s.next_execution && <span>Next: {s.next_execution}</span>}
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        )}
      </Reveal>
    </div>
  )
}