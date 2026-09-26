import { Link, useNavigate } from 'react-router-dom'
import { useResource } from '../lib/useResource'
import DebtFormModal from '../components/DebtFormModal'
import { fmtINR } from '../lib/amounts'

function DebtCard({ debt, onEdit, onDelete }) {
  const navigate = useNavigate()
  const pct = debt.amount > 0 ? Math.round(((+debt.paid_amount || 0) / debt.amount) * 100) : 0

  return (
    <div className="card" style={{ padding: '18px 20px', cursor: 'pointer' }} onClick={() => navigate(`/dashboard/debts/${debt.id}`)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div className="flex-1" >
          <p className="row-600-14" >{debt.name}</p>
          <p className="text-12-muted" >{debt.category || 'Loan'} · {debt.interest_rate}% APR</p>
        </div>
        <p className="fin" style={{ fontFamily: 'var(--sans)', fontSize: 18, fontWeight: 600, color: 'var(--coral)' }}>{fmtINR(+debt.amount)}</p>
      </div>
      <div className="progress mb-4" >
        <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 10 }}>
        <span>{pct}% paid off</span>
        <span>
          {debt.emi_amount && <span className="fin">EMI: {fmtINR(+debt.emi_amount)}/mo</span>}
          {debt.status !== 'active' && <span className="tag ml-8" >{debt.status.replace('_', ' ')}</span>}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--line-soft)', paddingTop: 10 }} onClick={e => e.stopPropagation()}>
        <button onClick={() => onEdit(debt)} className="btn btn-ghost" style={{ fontSize: 11.5, padding: '4px 12px' }}>Edit</button>
        <button onClick={() => onDelete(debt)} style={{ fontSize: 11.5, padding: '4px 12px', background: 'none', border: 'none', borderRadius: 999, color: 'var(--ink-faint)', cursor: 'pointer' }}>Delete</button>
      </div>
    </div>
  )
}

export default function Debts() {
  const { items: debts, loading, modal, setModal, closeModal, saved, remove } = useResource('/api/v1/debts')
  const total = debts.reduce((s, x) => s + (+x.amount || 0), 0)

  if (loading) return (
    <div>
      <div className="skeleton skeleton-title"  />
      <div className="skeleton skeleton-wide"  />
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, marginBottom: 10 }} />)}
    </div>
  )

  return (
    <div>
      <p className="page-num mb-4" >00<em>4</em> / 016</p>
      <div className="spread-mb20" >
        <div>
          <h1 className="page-title-no-mb" >Debts</h1>
          {total > 0 && <p className="fin" style={{ fontSize: 13, color: 'var(--ink-mute)', marginTop: 2 }}>Total: {fmtINR(total)}</p>}
        </div>
        <div className="flex-g8" >
          <button onClick={() => setModal('new')} className="btn btn-primary" style={{ fontSize: 12.5, padding: '7px 16px' }}>+ Add</button>
          <Link to="/dashboard/debt-payoffs" className="btn btn-ghost btn-sm-ghost" >Plan</Link>
        </div>
      </div>

      {debts.length === 0 && (
        <div className="empty-state">
          <span className="emoji">○</span>
          <p>No debts tracked yet</p>
          <p className="text-12-faint" >Add your first debt to start planning your payoff journey.</p>
          <button onClick={() => setModal('new')} className="btn btn-primary" style={{ marginTop: 12 }}>+ Add Debt</button>
        </div>
      )}

      <div className="col-g10" >
        {debts.map(d => (
          <DebtCard
            key={d.id}
            debt={d}
            onEdit={(debt) => setModal(debt)}
            onDelete={remove}
          />
        ))}
      </div>

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
