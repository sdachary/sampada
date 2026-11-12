import { useResource } from '../lib/useResource'
import PayoffPlanModal from '../components/PayoffPlanModal'
import { Card, Button, Skeleton, EmptyState, PageHeader, Badge, fmtINR } from '../components/ui'
import { Reveal } from '../lib/motion-primitives'

function formatAmount(v) {
  return fmtINR(+v || 0)
}

export default function PayoffPlans() {
  const { items: plans, loading, modal, setModal, closeModal, saved } = useResource('/api/v1/payoff_plans')

  if (loading) return (
    <Reveal delay={0}>
      <div className="space-y-3">
        <Skeleton className="skeleton-title w-32" />
        <Skeleton className="skeleton-text w-64" />
        {[1,2].map(i => <Skeleton key={i} className="skeleton-card h-28" />)}
      </div>
    </Reveal>
  )

  return (
    <div className="space-y-5">
      <Reveal delay={0}>
        <PageHeader
          title="Payoff Plans"
          num="005 / 016"
          action={<Button onClick={() => setModal('new')}>+ New Plan</Button>}
        >
          <p className="text-sm text-muted mt-1">Create and manage your debt payoff strategies</p>
        </PageHeader>
      </Reveal>

      <Reveal delay={50}>
        {plans.length === 0 ? (
          <EmptyState
            icon={<span aria-hidden="true" className="text-5xl text-border">◎</span>}
            title="No payoff plans yet"
            action="+ Create Plan"
            onAction={() => setModal('new')}
          >
            Create a plan to see how avalanche or snowball strategies can save you money.
          </EmptyState>
        ) : (
          <div className="space-y-2">
            {plans.map((p, index) => (
              <Reveal key={p.id} delay={index * 20}>
                <Card className="card-shell card-shell--interactive card-core--pad-base">
                  <div className="flex justify-between items-start mb-2">
                    <div className="min-w-0">
                      <p className="text-base font-medium text-ink truncate">{p.name}</p>
                      <p className="text-sm text-muted flex items-center gap-1">
                        <Badge variant={p.strategy === 'avalanche' ? 'accent' : 'success'} className="text-[10px]">{p.strategy}</Badge>
                        <span>·</span>
                        <span>{p.debts?.length || 0} debt{p.debts?.length !== 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span>Extra {formatAmount(p.extra_payment)}/mo</span>
                      </p>
                    </div>
                    <div className="flex gap-2 ml-3">
                      <Button variant="ghost" size="sm" onClick={() => setModal(p)}>Edit</Button>
                    </div>
                  </div>

                  {p.debt_free_date && (
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-2">
                      <div>
                        <span className="label-caps">Debt Free</span>
                        <p className="fin font-display text-lg font-semibold mt-1">{new Date(p.debt_free_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>
                      </div>
                      <div>
                        <span className="label-caps">Interest Paid</span>
                        <p className="fin font-display text-lg font-semibold text-danger mt-1">{p.total_interest_paid != null ? formatAmount(p.total_interest_paid) : '—'}</p>
                      </div>
                      <div>
                        <span className="label-caps">Interest Saved</span>
                        <p className="fin font-display text-lg font-semibold text-success mt-1">{p.total_interest_saved != null ? formatAmount(p.total_interest_saved) : '—'}</p>
                      </div>
                      <div>
                        <span className="label-caps">Months Saved</span>
                        <p className="fin font-display text-lg font-semibold text-success mt-1">{p.months_saved || 0}</p>
                      </div>
                    </div>
                  )}

                  {p.debts?.length > 0 && (
                    <div className="pt-2 border-t border-border-soft">
                      <p className="label-caps mb-1">Included debts</p>
                      <div className="flex flex-wrap gap-2">
                        {p.debts.map(d => (
                          <Badge key={d.id} variant="neutral" className="text-[10px]">{d.name} · {formatAmount(d.amount)}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </Reveal>
            ))}
          </div>
        )}
      </Reveal>

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