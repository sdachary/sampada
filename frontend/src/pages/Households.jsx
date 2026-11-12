import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Card, Button, Skeleton, EmptyState, PageHeader, Badge, fmtINR } from '../components/ui'
import { Reveal } from '../lib/motion-primitives'

export default function Households() {
  const [households, setHouseholds] = useState([])
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.request('/api/v1/households').then(d => setHouseholds(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const loadDetail = (id) => {
    api.request(`/api/v1/households/${id}/dashboard`).then(setDetail).catch(() => {})
  }

  if (loading) return (
    <Reveal delay={0}>
      <div className="space-y-2">
        {[1,2].map(i => <Skeleton key={i} className="skeleton-card h-20" />)}
      </div>
    </Reveal>
  )

  if (detail) return (
    <div className="space-y-4">
      <Reveal delay={0}>
        <PageHeader
          title={detail.name}
          num="013 / 016"
          action={<Button variant="ghost" size="sm" onClick={() => setDetail(null)}>← Back</Button>}
        >
          <p className="text-sm text-muted">Shared finances with family.</p>
          <Badge variant="neutral" className="mt-1">{detail.member_count} members</Badge>
        </PageHeader>
      </Reveal>

      <Reveal delay={50}>
        {detail.net_worth && (
          <Card className="card-shell card-core--pad-lg">
            <p className="label-caps mb-1">Household Net Worth</p>
            <p className="fin font-display text-2xl font-semibold">{detail.currency_symbol}{fmtINR(+detail.net_worth.net_worth || 0)}</p>
            <p className="text-sm text-muted mt-1">Assets: {fmtINR(+detail.net_worth.total_assets || 0)} · Liabilities: {fmtINR(+detail.net_worth.total_liabilities || 0)}</p>
          </Card>
        )}
      </Reveal>

      <Reveal delay={100}>
        {detail.members?.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-ink mb-2">Members</p>
            {detail.members.map((m, index) => (
              <Reveal key={m.id} delay={index * 30}>
                <Card className="card-shell card-core--pad-base">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="text-base font-medium text-ink truncate">{m.name}</p>
                      <p className="text-sm text-muted">{m.email} · {m.role}</p>
                    </div>
                    <Badge variant="neutral" className="text-[10px] capitalize">{m.role}</Badge>
                  </div>
                  <div className="flex gap-3 mt-2 text-xs text-muted flex-wrap">
                    <span>Debt: {fmtINR(+m.total_debt || 0)}</span>
                    <span>Invest: {fmtINR(+m.total_investments || 0)}</span>
                    <span>Expenses: {fmtINR(+m.monthly_expenses || 0)}/mo</span>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        )}
      </Reveal>
    </div>
  )

  return (
    <div className="space-y-5">
      <Reveal delay={0}>
        <PageHeader
          title="Households"
          num="013 / 016"
        >
          <p className="text-sm text-muted">Shared finances with family.</p>
        </PageHeader>
      </Reveal>

      <Reveal delay={50}>
        {households.length === 0 ? (
          <EmptyState
            icon={<span aria-hidden="true" className="text-5xl text-border">◈</span>}
            title="No households yet"
          >
            Create a household to manage shared expenses and goals.
          </EmptyState>
        ) : (
          <div className="space-y-2">
            {households.map((h, index) => (
              <Reveal key={h.id} delay={index * 30}>
                <Card className="card-shell card-shell--interactive card-core--pad-base" onClick={() => loadDetail(h.id)}>
                  <div className="flex justify-between items-center">
                    <div className="min-w-0">
                      <p className="text-lg font-medium text-ink truncate">{h.name}</p>
                      <p className="text-sm text-muted">{h.currency} · {h.member_count} member{h.member_count !== 1 ? 's' : ''}</p>
                    </div>
                    <span className="text-faint">→</span>
                  </div>
                  {h.description && <p className="text-sm text-muted mt-2">{h.description}</p>}
                </Card>
              </Reveal>
            ))}
          </div>
        )}
      </Reveal>
    </div>
  )
}