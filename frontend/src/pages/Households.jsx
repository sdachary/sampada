import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Card, Button, Skeleton, EmptyState, PageHeader, Badge, fmtINR } from '../components/ui'

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
    <div style={{ display: 'grid', gap: 8 }}>
      {[1,2].map(i => <Skeleton key={i} style={{ height: 80, borderRadius: 'var(--radius-md)' }} />)}
    </div>
  )

  if (detail) return (
    <div style={{ display: 'grid', gap: 16 }}>
      <PageHeader
        title={detail.name}
        num="013 / 016"
        action={<Button variant="ghost" size="sm" onClick={() => setDetail(null)}>← Back</Button>}
      >
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Shared finances with family.</p>
        <Badge variant="neutral" style={{ marginTop: 4 }}>{detail.member_count} members</Badge>
      </PageHeader>

      {detail.net_worth && (
        <Card style={{ padding: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>Household Net Worth</p>
          <p className="fin" style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{detail.currency_symbol}{fmtINR(+detail.net_worth.net_worth || 0)}</p>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Assets: {fmtINR(+detail.net_worth.total_assets || 0)} · Liabilities: {fmtINR(+detail.net_worth.total_liabilities || 0)}</p>
        </Card>
      )}

      {detail.members?.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Members</h2>
          {detail.members.map(m => (
            <Card key={m.id} style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>{m.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--muted)' }}>{m.email} · {m.role}</p>
                </div>
                <Badge variant="neutral" style={{ fontSize: 10, textTransform: 'capitalize' }}>{m.role}</Badge>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>
                <span>Debt: {fmtINR(+m.total_debt || 0)}</span>
                <span>Invest: {fmtINR(+m.total_investments || 0)}</span>
                <span>Expenses: {fmtINR(+m.monthly_expenses || 0)}/mo</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHeader
        title="Households"
        num="013 / 016"
      >
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Shared finances with family.</p>
      </PageHeader>

      {households.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true" style={{ fontSize: 48, color: 'var(--border)' }}>◈</span>}
          title="No households yet"
        >
          Create a household to manage shared expenses and goals.
        </EmptyState>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {households.map(h => (
            <Card key={h.id} interactive onClick={() => loadDetail(h.id)} style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{h.name}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--muted)' }}>{h.currency} · {h.member_count} member{h.member_count !== 1 ? 's' : ''}</p>
                </div>
                <span style={{ fontSize: 16, color: 'var(--faint)' }}>→</span>
              </div>
              {h.description && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{h.description}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}