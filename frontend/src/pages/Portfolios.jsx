import { useState } from 'react'
import { api } from '../lib/api'
import { useResource } from '../lib/useResource'
import PortfolioFormModal from '../components/PortfolioFormModal'
import { fmtINR } from '../lib/amounts'

export default function Portfolios() {
  const { items: portfolios, loading, modal, setModal, closeModal, saved, remove } = useResource('/api/v1/portfolios')
  const [prices, setPrices] = useState({})
  const [refreshing, setRefreshing] = useState(false)

  const totalValue = portfolios.reduce((s, p) => s + (+p.total_value || 0), 0)
  const totalCost = portfolios.reduce((s, p) => s + (p.investments || []).reduce((ss, i) => ss + (+i.cost_basis || 0), 0), 0)
  const totalGain = totalValue - totalCost

  async function refreshPrices(portfolio) {
    setRefreshing(true)
    try {
      const data = await api.request(`/api/v1/portfolios/${portfolio.id}/prices`)
      if (data?.prices) {
        const map = {}
        data.prices.forEach(p => { map[p.symbol] = p })
        setPrices(prev => ({ ...prev, ...map }))
      }
    } catch (e) { /* ignore */ }
    setRefreshing(false)
  }

  if (loading) return (
    <div>
      {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 130, marginBottom: 10, borderRadius: 'var(--radius)' }} />)}
    </div>
  )

  return (
    <div>
      <p className="page-num mb-4" >00<em>9</em> / 016</p>
      <div className="spread-mb16" >
        <div>
          <h1 className="page-title-no-mb" >Portfolios</h1>
          <p className="text-13-5-muted" >All your investments, one view.</p>
        </div>
        <button onClick={() => setModal('new')} className="btn btn-primary" style={{ fontSize: 12.5, padding: '7px 16px' }}>+ Add</button>
      </div>

      {portfolios.length > 0 && (
        <div className="card card-pad-mb16" >
          <span className="label-caps-sm" >Total Portfolio Value</span>
          <p className="fin" style={{ fontSize: 22, fontWeight: 600, color: 'var(--emerald)' }}>{fmtINR(totalValue)}</p>
          {totalCost > 0 && (
            <p style={{ fontSize: 12, color: totalGain >= 0 ? 'var(--emerald)' : 'var(--coral)', marginTop: 2 }}>
              {totalGain >= 0 ? '▲' : '▼'} {fmtINR(Math.abs(totalGain))} ({((totalGain / totalCost) * 100).toFixed(1)}%)
            </p>
          )}
        </div>
      )}

      {portfolios.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">◐</span>
          <p>No portfolios yet</p>
          <p className="text-12-faint" >Track your mutual funds, stocks, and other investments here.</p>
          <button onClick={() => setModal('new')} className="btn btn-primary" style={{ marginTop: 12 }}>+ Add Portfolio</button>
        </div>
      ) : portfolios.map(p => {
        const sectors = p.allocation_summary?.sectors || {}
        const sectorNames = Object.keys(sectors)
        const invs = p.investments || []
        const portCost = invs.reduce((s, i) => s + (+i.cost_basis || 0), 0)
        const portValue = invs.reduce((s, i) => s + (+i.current_value || 0), 0)
        const portGain = portValue - portCost

        return (
          <div key={p.id} className="card card-pad-lg" >
            <div className="spread-top-mb8" >
              <div>
                <p className="row-600-15" >{p.name}</p>
                <p className="text-11-5-muted" >
                  {p.goal && <span style={{ textTransform: 'capitalize' }}>{p.goal}</span>}
                  {p.risk_tolerance != null && <span> · risk {p.risk_tolerance}/10</span>}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <p className="fin" style={{ fontFamily: 'var(--sans)', fontSize: 18, fontWeight: 600, color: 'var(--emerald)' }}>
                  {fmtINR(+p.total_value || 0)}
                </p>
                <div className="flex-g6" >
                  <button onClick={() => setModal(p)} style={{ fontSize: 10.5, padding: '2px 8px', background: 'none', border: '1px solid var(--line)', borderRadius: 999, color: 'var(--ink-soft)', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => remove(p)}
                    style={{ fontSize: 10.5, padding: '2px 8px', background: 'none', border: '1px solid var(--line)', borderRadius: 999, color: 'var(--ink-faint)', cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
            </div>

            {sectorNames.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                {sectorNames.map(s => (
                  <span key={s} className="tag fs-10" >{s} {sectors[s]}%</span>
                ))}
              </div>
            )}

            {invs.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{invs.length} investment{invs.length !== 1 ? 's' : ''}</p>
                  <button onClick={() => refreshPrices(p)} disabled={refreshing}
                    style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', color: 'var(--ink-mute)' }}>
                    {refreshing ? '…' : '↻ Prices'}
                  </button>
                </div>
                <div style={{ display: 'grid', gap: 4 }}>
                  {invs.map(i => {
                    const live = prices[i.symbol]
                    const curPrice = live?.price || +i.current_price || 0
                    const buyPrice = +i.buy_price || 0
                    const shares = +i.shares || 0
                    const curVal = curPrice * shares
                    const costBasis = buyPrice * shares
                    const gain = curVal - costBasis
                    const gainPct = costBasis > 0 ? (gain / costBasis * 100).toFixed(1) : '—'
                    const gainColor = gain >= 0 ? 'var(--emerald)' : 'var(--coral)'
                    return (
                      <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.02)', fontSize: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <span className="fw-500" >{i.symbol}</span>
                          {i.name && <span style={{ color: 'var(--ink-faint)', marginLeft: 4, fontSize: 10 }}>{i.name}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span className="fin">₹{curPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="fin" style={{ color: gainColor, fontWeight: 500 }}>{gain >= 0 ? '▲' : '▼'} {gainPct}%</span>
                          <span className="fin" style={{ color: 'var(--ink-mute)', fontSize: 10 }}>{shares} sh</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {portCost > 0 && (
                  <p style={{ fontSize: 11, color: portGain >= 0 ? 'var(--emerald)' : 'var(--coral)', marginTop: 6, textAlign: 'right' }}>
                    P&L: {portGain >= 0 ? '▲' : '▼'} ₹{Math.abs(portGain).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}

      {modal && (
        <PortfolioFormModal
          portfolio={modal === 'new' ? null : modal}
          onClose={closeModal}
          onSave={saved}
        />
      )}
    </div>
  )
}
