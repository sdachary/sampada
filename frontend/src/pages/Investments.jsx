import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import InvestmentFormModal from '../components/InvestmentFormModal'

export default function Investments() {
  const [investments, setInvestments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  const fetch = () => {
    api.request('/api/v1/investments').then(d => setInvestments(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { fetch() }, [])

  if (loading) return (
    <div>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, marginBottom: 8, borderRadius: 'var(--radius)' }} />)}
    </div>
  )

  const totalValue = investments.reduce((s, i) => s + (+i.current_value || 0), 0)
  const totalGain = investments.reduce((s, i) => s + (+i.gain_loss || 0), 0)

  return (
    <div>
      <p className="page-num" style={{ marginBottom: 4 }}>00<em>10</em> / 016</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>Investments</h1>
          <p style={{ fontSize: 13.5, color: 'var(--ink-mute)' }}>Individual holdings across portfolios.</p>
        </div>
        <button onClick={() => setModal('new')} className="btn btn-primary" style={{ fontSize: 12.5, padding: '7px 16px' }}>+ Add</button>
      </div>

      {investments.length > 0 && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div><span style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Value</span>
              <p className="fin" style={{ fontSize: 16, fontWeight: 600, color: 'var(--emerald)' }}>₹{totalValue.toLocaleString('en-IN')}</p></div>
            <div><span style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total P&L</span>
              <p className="fin" style={{ fontSize: 16, fontWeight: 600, color: totalGain >= 0 ? 'var(--emerald)' : 'var(--coral)' }}>
                {totalGain >= 0 ? '+' : ''}₹{totalGain.toLocaleString('en-IN')}</p></div>
          </div>
        </div>
      )}

      {investments.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">◑</span>
          <p>No investments recorded</p>
          <p style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Add a share purchase or holding to start tracking.</p>
          <button onClick={() => setModal('new')} className="btn btn-primary" style={{ marginTop: 12 }}>+ Add Investment</button>
        </div>
      ) : investments.map(i => {
        const gain = +i.gain_loss || 0
        const gainPct = +i.gain_loss_pct || 0
        return (
          <div key={i.id} className="card" style={{ padding: '14px 18px', marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 1 }}>{i.symbol} <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--ink-mute)' }}>{i.name}</span></p>
                <p style={{ fontSize: 11.5, color: 'var(--ink-mute)' }}>
                  {i.shares} shares @ ₹{(+i.buy_price).toLocaleString('en-IN')}
                  {i.exchange && <span> · {i.exchange}</span>}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="fin" style={{ fontSize: 16, fontWeight: 600 }}>₹{(+i.current_value || 0).toLocaleString('en-IN')}</p>
                <p className="fin" style={{ fontSize: 12, color: gain >= 0 ? 'var(--emerald)' : 'var(--coral)' }}>
                  {gain >= 0 ? '+' : ''}₹{gain.toLocaleString('en-IN')} ({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%)
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {i.sector && <span className="tag" style={{ fontSize: 10 }}>{i.sector}</span>}
              {i.investment_type && <span className="tag" style={{ fontSize: 10 }}>{i.investment_type}</span>}
              {i.dividend_yield != null && +i.dividend_yield > 0 && <span className="tag" style={{ fontSize: 10, background: 'var(--emerald)', color: '#fff' }}>{i.dividend_yield}% div</span>}
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <button onClick={() => setModal(i)} style={{ fontSize: 11, padding: '2px 8px', background: 'none', border: '1px solid var(--line)', borderRadius: 999, color: 'var(--ink-soft)', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => { if (confirm(`Delete "${i.symbol}"?`)) { api.request(`/api/v1/investments/${i.id}`, { method: 'DELETE' }).then(fetch).catch(e => alert(e.message)) } }}
                  style={{ fontSize: 11, padding: '2px 8px', background: 'none', border: '1px solid var(--line)', borderRadius: 999, color: 'var(--ink-faint)', cursor: 'pointer' }}>Delete</button>
              </span>
            </div>
          </div>
        )
      })}

      {modal && (
        <InvestmentFormModal
          investment={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetch() }}
        />
      )}
    </div>
  )
}
