import { Link, useNavigate } from 'react-router-dom'
import { useResource } from '../lib/useResource'
import DebtFormModal from '../components/DebtFormModal'
import { fmtINR } from '../lib/amounts'
import { Card, Progress, Button, Skeleton, EmptyState, PageHeader, Badge } from '../components/ui'

function DebtCard({ debt, onEdit, onDelete, onView }) {
  const pct = debt.amount > 0 ? Math.round(((+debt.paid_amount || 0) / debt.amount) * 100) : 0

  return (
    <Card style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{debt.name}</p>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>{debt.category || 'Loan'} · {debt.interest_rate}% APR</p>
        </div>
        <p className="fin" style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--accent)' }}>{fmtINR(+debt.amount)}</p>
      </div>
      <Progress value={pct} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--muted)', marginBottom: 10 }}>
        <span>{pct}% paid off</span>
        <span>
          {debt.emi_amount && <span className="fin">EMI: {fmtINR(+debt.emi_amount)}/mo</span>}
          {debt.status !== 'active' && <Badge variant="neutral" style={{ marginLeft: 8 }}>{debt.status.replace('_', ' ')}</Badge>}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border-soft)', paddingTop: 10 }}>
        <Button variant="ghost" size="sm" onClick={onView}>View</Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(debt)}>Edit</Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(debt)} style={{ color: 'var(--muted)' }}>Delete</Button>
      </div>
    </Card>
  )
}

export default function Debts() {
  const navigate = useNavigate()
  const { items: debts, loading, modal, setModal, closeModal, saved, remove } = useResource('/api/v1/debts')
  const total = debts.reduce((s, x) => s + (+x.amount || 0), 0)

  if (loading) return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Skeleton style={{ width: 200, height: 28 }} />
      <Skeleton style={{ width: '100%', height: 14 }} />
      {[1,2,3].map(i => <Skeleton key={i} style={{ height: 100, marginBottom: 10 }} />)}
    </div>
  )

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHeader
        title="Debts"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => setModal('new')}>+ Add</Button>
            <Link to="/dashboard/debt-payoffs">
              <Button variant="ghost" size="sm">Payoff plan</Button>
            </Link>
          </div>
        }
      />

      {total > 0 && (
        <p className="fin" style={{ fontSize: 13, color: 'var(--muted)', marginTop: -16 }}>Total: {fmtINR(total)}</p>
      )}

      {debts.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true" style={{ fontSize: 48, color: 'var(--border)' }}>📋</span>}
          title="No debts tracked yet"
          action="+ Add Debt"
          onAction={() => setModal('new')}
        >
          Add your first debt to start planning your payoff journey.
        </EmptyState>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {debts.map(d => (
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