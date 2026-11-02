import { useResource } from '../lib/useResource'
import PayoffPlanModal from '../components/PayoffPlanModal'
import { Card, Button, Skeleton, EmptyState, PageHeader, Badge, fmtINR } from '../components/ui'

function formatAmount(v) {
  return fmtINR(+v || 0)
}

export default function PayoffPlans() {
  const { items: plans, loading, modal, setModal, closeModal, saved } = useResource('/api/v1/payoff_plans')

  if (loading) return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Skeleton style={{ width: 200, height: 28 }} />
      <Skeleton style={{ width: '100%', height: 14 }} />
      {[1,2].map(i => <Skeleton key={i} style={{ height: 120, marginBottom: 10 }} />)}
    </div>
  )

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHeader
        title="Payoff Plans"
        num="005 / 016"
        action={
          <Button onClick={() => setModal('new')}>+ New Plan</Button>
        }
      >
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Create and manage your debt payoff strategies</p>
      </PageHeader>

      {plans.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true" style={{ fontSize: 48, color: 'var(--border)' }}>◎</span>}
          title="No payoff plans yet"
          action="+ Create Plan"
          onAction={() => setModal('new')}
        >
          Create a plan to see how avalanche or snowball strategies can save you money.
        </EmptyState>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {plans.map(p => (
            <Card key={p.id} style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{p.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {p.strategy === 'avalanche' ? 'Avalanche' : 'Snowball'} ·
                    {p.debts?.length || 0} debt{p.debts?.length !== 1 ? 's' : ''} ·
                    Extra {formatAmount(p.extra_payment)}/mo
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Badge variant={p.strategy === 'avalanche' ? 'accent' : 'success'}>
                    {p.strategy}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setModal(p)}>Edit</Button>
                </div>
              </div>

              {p.debt_free_date && (
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Debt Free</span>
                    <p className="fin" style={{ fontSize: 15, fontWeight: 600 }}>{new Date(p.debt_free_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Interest Paid</span>
                    <p className="fin" style={{ fontSize: 15, fontWeight: 600, color: 'var(--danger)' }}>{p.total_interest_paid != null ? formatAmount(p.total_interest_paid) : '—'}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Interest Saved</span>
                    <p className="fin" style={{ fontSize: 15, fontWeight: 600, color: 'var(--success)' }}>{p.total_interest_saved != null ? formatAmount(p.total_interest_saved) : '—'}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Months Saved</span>
                    <p className="fin" style={{ fontSize: 15, fontWeight: 600, color: 'var(--success)' }}>{p.months_saved || 0}</p>
                  </div>
                </div>
              )}

              {p.debts?.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 8 }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>Included debts</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {p.debts.map(d => (
                      <Badge key={d.id} variant="neutral" style={{ fontSize: 10.5 }}>{d.name} · {formatAmount(d.amount)}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {modal && (
        <PayoffPlanModal
          plan={modal === 'new' ? null : modal}
          onClose={closeModal}
          onSave={saved}
        />
      )}
    </div>
  )
}