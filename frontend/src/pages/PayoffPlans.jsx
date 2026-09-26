import { useResource } from '../lib/useResource'
import PayoffPlanModal from '../components/PayoffPlanModal'

const INTL = { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }

function formatAmount(v) {
  return `₹${(+v || 0).toLocaleString('en-IN', INTL)}`
}

export default function PayoffPlans() {
  const { items: plans, loading, modal, setModal, closeModal, saved } = useResource('/api/v1/payoff_plans')

  if (loading) return (
    <div>
      <div className="skeleton skeleton-title"  />
      <div className="skeleton skeleton-wide"  />
      {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 120, marginBottom: 10 }} />)}
    </div>
  )

  return (
    <div>
      <p className="page-num mb-4" >00<em>5</em> / 016</p>
      <div className="spread-mb20" >
        <div>
          <h1 className="page-title-no-mb" >Payoff Plans</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-mute)', marginTop: 2 }}>Create and manage your debt payoff strategies</p>
        </div>
        <button onClick={() => setModal('new')} className="btn btn-primary" style={{ fontSize: 12.5, padding: '7px 16px' }}>+ New Plan</button>
      </div>

      {plans.length === 0 && (
        <div className="empty-state">
          <span className="emoji">◎</span>
          <p>No payoff plans yet</p>
          <p className="text-12-faint" >Create a plan to see how avalanche or snowball strategies can save you money.</p>
          <button onClick={() => setModal('new')} className="btn btn-primary" style={{ marginTop: 12 }}>+ Create Plan</button>
        </div>
      )}

      <div className="col-g10" >
        {plans.map(p => (
          <div key={p.id} className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <p className="row-600-14" >{p.name}</p>
                <p className="text-12-muted" >
                  {p.strategy === 'avalanche' ? 'Avalanche' : 'Snowball'} ·
                  {p.debts?.length || 0} debt{p.debts?.length !== 1 ? 's' : ''} ·
                  Extra {formatAmount(p.extra_payment)}/mo
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <span className={`tag ${p.strategy === 'avalanche' ? 'coral' : 'green'}`}>
                  {p.strategy}
                </span>
                <button onClick={() => setModal(p)} className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }}>
                  Edit
                </button>
              </div>
            </div>

            {p.debt_free_date && (
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 8 }}>
                <div>
                  <span className="label-caps-sm" >Debt Free</span>
                  <p className="fin h-600-15" >{new Date(p.debt_free_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>
                </div>
                <div>
                  <span className="label-caps-sm" >Interest Paid</span>
                  <p className="fin amt-out-15" >{p.total_interest_paid != null ? formatAmount(p.total_interest_paid) : '—'}</p>
                </div>
                <div>
                  <span className="label-caps-sm" >Interest Saved</span>
                  <p className="fin amt-in-15" >{p.total_interest_saved != null ? formatAmount(p.total_interest_saved) : '—'}</p>
                </div>
                <div>
                  <span className="label-caps-sm" >Months Saved</span>
                  <p className="fin amt-in-15" >{p.months_saved || 0}</p>
                </div>
              </div>
            )}

            {p.debts?.length > 0 && (
              <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
                <p style={{ fontSize: 10, color: 'var(--ink-faint)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Included debts</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {p.debts.map(d => (
                    <span key={d.id} className="tag" style={{ fontSize: 10.5 }}>{d.name} · {formatAmount(d.amount)}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

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
