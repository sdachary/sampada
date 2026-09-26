import { useResource } from '../lib/useResource'
import InvestmentFormModal from '../components/InvestmentFormModal'
import { fmtINR } from '../lib/amounts'

export default function Investments() {
  const { items: investments, loading, modal, setModal, closeModal, saved, remove } = useResource('/api/v1/investments', { nameField: 'symbol' })

  if (loading) return (
    <div>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, marginBottom: 8, borderRadius: 'var(--radius)' }} />)}
    </div>
  )

  const totalValue = investments.reduce((s, i) => s + (+i.current_value || 0), 0)
  const totalGain = investments.reduce((s, i) => s + (+i.gain_loss || 0), 0)

  return (
    <div>
      <p className="page-num mb-4" >00<em>10</em> / 016</p>
      <div className="spread-mb16" >
        <div>
          <h1 className="page-title-no-mb" >Investments</h1>
          <p className="text-13-5-muted" >Individual holdings across portfolios.</p>
        </div>
        <button onClick={() => setModal('new')} className="btn btn-primary" style={{ fontSize: 12.5, padding: '7px 16px' }}>+ Add</button>
      </div>

      {investments.length > 0 && (
        <div className="card card-pad-mb16" >
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div><span className="label-caps-sm" >Total Value</span>
              <p className="fin amt-in" >{fmtINR(totalValue)}</p></div>
            <div><span className="label-caps-sm" >Total P&L</span>
              <p className="fin" style={{ fontSize: 16, fontWeight: 600, color: totalGain >= 0 ? 'var(--emerald)' : 'var(--coral)' }}>
                {totalGain >= 0 ? '+' : ''}{fmtINR(totalGain)}</p></div>
          </div>
        </div>
      )}

      {investments.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">◑</span>
          <p>No investments recorded</p>
          <p className="text-12-faint" >Add a share purchase or holding to start tracking.</p>
          <button onClick={() => setModal('new')} className="btn btn-primary" style={{ marginTop: 12 }}>+ Add Investment</button>
        </div>
      ) : investments.map(i => {
        const gain = +i.gain_loss || 0
        const gainPct = +i.gain_loss_pct || 0
        return (
          <div key={i.id} className="card" style={{ padding: '14px 18px', marginBottom: 6 }}>
            <div className="spread-top-mb6" >
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 1 }}>{i.symbol} <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--ink-mute)' }}>{i.name}</span></p>
                <p className="text-11-5-muted" >
                  {i.shares} shares @ {fmtINR(+i.buy_price)}
                  {i.exchange && <span> · {i.exchange}</span>}
                </p>
              </div>
              <div className="table-cell-num-plain" >
                <p className="fin h-600-16" >{fmtINR(+i.current_value || 0)}</p>
                <p className="fin" style={{ fontSize: 12, color: gain >= 0 ? 'var(--emerald)' : 'var(--coral)' }}>
                  {gain >= 0 ? '+' : ''}{fmtINR(gain)} ({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%)
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {i.sector && <span className="tag fs-10" >{i.sector}</span>}
              {i.investment_type && <span className="tag fs-10" >{i.investment_type}</span>}
              {i.dividend_yield != null && +i.dividend_yield > 0 && <span className="tag" style={{ fontSize: 10, background: 'var(--emerald)', color: '#fff' }}>{i.dividend_yield}% div</span>}
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <button onClick={() => setModal(i)} style={{ fontSize: 11, padding: '2px 8px', background: 'none', border: '1px solid var(--line)', borderRadius: 999, color: 'var(--ink-soft)', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => remove(i)}
                  style={{ fontSize: 11, padding: '2px 8px', background: 'none', border: '1px solid var(--line)', borderRadius: 999, color: 'var(--ink-faint)', cursor: 'pointer' }}>Delete</button>
              </span>
            </div>
          </div>
        )
      })}

      {modal && (
        <InvestmentFormModal
          investment={modal === 'new' ? null : modal}
          onClose={closeModal}
          onSave={saved}
        />
      )}
    </div>
  )
}
