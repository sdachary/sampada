import { Link, useNavigate } from 'react-router-dom'
import { useResource } from '../lib/useResource'
import DebtFormModal from '../components/DebtFormModal'
import { fmtINR } from '../lib/amounts'
import { Card, Progress, Button, Skeleton, EmptyState, PageHeader, Badge } from '../components/ui'
import { Reveal } from '../lib/motion-primitives'

function DebtCard({ debt, onEdit, onDelete, onView }) {
  const pct = debt.amount > 0 ? Math.round(((+debt.paid_amount || 0) / debt.amount) * 100) : 0

  return (
    <Card className="card-shell card-shell--interactive card-core--pad-base">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-ink truncate">{debt.name}</p>
          <p className="text-sm text-muted">{debt.category || 'Loan'} · {debt.interest_rate}% APR</p>
        </div>
        <p className="fin font-display text-lg font-semibold text-accent whitespace-nowrap ml-3">{fmtINR(+debt.amount)}</p>
      </div>
      <Progress value={pct} />
      <div className="flex justify-between text-xs text-muted mt-2">
        <span>{pct}% paid off</span>
        <span className="flex items-center gap-2">
          {debt.emi_amount && <span className="fin">EMI: {fmtINR(+debt.emi_amount)}/mo</span>}
          {debt.status !== 'active' && <Badge variant="neutral">{debt.status.replace('_', ' ')}</Badge>}
        </span>
      </div>
      <div className="flex gap-2 mt-2 pt-2 border-t border-border-soft">
        <Button variant="ghost" size="sm" onClick={onView}>View</Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(debt)}>Edit</Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(debt)} className="text-muted">Delete</Button>
      </div>
    </Card>
  )
}

export default function Debts() {
  const navigate = useNavigate()
  const { items: debts, loading, modal, setModal, closeModal, saved, remove } = useResource('/api/v1/debts')
  const total = debts.reduce((s, x) => s + (+x.amount || 0), 0)

  if (loading) return (
    <div className="space-y-3">
      <Skeleton className="skeleton-title w-32" />
      <Skeleton className="skeleton-text w-48" />
      {[1,2,3].map(i => <Skeleton key={i} className="skeleton-card" />)}
    </div>
  )

  return (
    <div className="space-y-5">
      <Reveal delay={0}>
        <PageHeader
          title="Debts"
          action={
            <div className="flex gap-2 items-center">
              <Button onClick={() => setModal('new')}>+ Add</Button>
              <Link to="/dashboard/debt-payoffs">
                <Button variant="ghost" size="sm">Payoff plan</Button>
              </Link>
            </div>
          }
        />
      </Reveal>

      {total > 0 && (
        <Reveal delay={50}>
          <p className="fin text-sm text-muted mt-n4 mb-2">Total: {fmtINR(total)}</p>
        </Reveal>
      )}

      <Reveal delay={100}>
        {debts.length === 0 ? (
          <EmptyState
            icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-border" aria-hidden="true"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>}
            title="No debts tracked yet"
            action="+ Add Debt"
            onAction={() => setModal('new')}
          >
            Add your first debt to start planning your payoff journey.
          </EmptyState>
        ) : (
          <div className="space-y-2">
            {debts.map((d, i) => (
              <DebtCard
                key={d.id}
                debt={d}
                onEdit={(debt) => setModal(debt)}
                onDelete={remove}
                onView={() => navigate(`/dashboard/debts/${d.id}`)}
              />
            ))}
          </div>
        )}
      </Reveal>

      {modal && (
        <DebtFormModal
          debt={modal === 'new' ? null : modal}
          onClose={closeModal}
          onSave={saved}
        />
      )}
    </div>
  )
}