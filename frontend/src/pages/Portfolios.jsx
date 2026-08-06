import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export default function Portfolios() {
  const [portfolios, setPortfolios] = useState([])
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    api.request('/api/v1/portfolios').then(d => setPortfolios(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

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
      <p className="page-num" style={{ marginBottom: 4 }}>00<em>9</em> / 016</p>
      <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Portfolios</h1>
      <p style={{ fontSize: 13.5, color: 'var(--ink-mute)', marginBottom: 16 }}>All your investments, one view.</p>

      {portfolios.length > 0 && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
          <span style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Portfolio Value</span>
          <p className="fin" style={{ fontSize: 22, fontWeight: 600, color: 'var(--emerald)' }}>₹{totalValue.toLocaleString('en-IN')}</p>
          {totalCost > 0 && (
            <p style={{ fontSize: 12, color: totalGain >= 0 ? 'var(--emerald)' : 'var(--coral)', marginTop: 2 }}>
              {totalGain >= 0 ? '▲' : '▼'} ₹{Math.abs(totalGain).toLocaleString('en-IN')} ({((totalGain / totalCost) * 100).toFixed(1)}%)
            </p>
          )}
        </div>
      )}

      {portfolios.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">◐</span>
          <p>No portfolios yet</p>
          <p style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Track your mutual funds, stocks, and other investments here.</p>
        </div>
      ) : portfolios.map(p => {
        const sectors = p.allocation_summary?.sectors || {}
        const sectorNames = Object.keys(sectors)
        const invs = p.investments || []
        const portCost = invs.reduce((s, i) => s + (+i.cost_basis || 0), 0)
        const portValue = invs.reduce((s, i) => s + (+i.current_value || 0), 0)
        const portGain = portValue - portCost

        return (
          <div key={p.id} className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{p.name}</p>
                <p style={{ fontSize: 11.5, color: 'var(--ink-mute)' }}>
                  {p.goal && <span style={{ textTransform: 'capitalize' }}>{p.goal}</span>}
                  {p.risk_tolerance != null && <span> · risk {p.risk_tolerance}/10</span>}
                </p>
              </div>
              <p className="fin" style={{ fontFamily: 'var(--sans)', fontSize: 18, fontWeight: 600, color: 'var(--emerald)' }}>
                ₹{(+p.total_value || 0).toLocaleString('en-IN')}
              </p>
            </div>

            {sectorNames.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                {sectorNames.map(s => (
                  <span key={s} className="tag" style={{ fontSize: 10 }}>{s} {sectors[s]}%</span>
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
                          <span style={{ fontWeight: 500 }}>{i.symbol}</span>
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
    </div>
  )
}
