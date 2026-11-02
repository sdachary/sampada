import { useState } from 'react'
import { api } from '../lib/api'
import { useResource } from '../lib/useResource'
import PortfolioFormModal from '../components/PortfolioFormModal'
import { Card, Button, Skeleton, EmptyState, PageHeader, Badge, fmtINR, Progress } from '../components/ui'

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
    } catch { /* ignore */ }
    setRefreshing(false)
  }

  if (loading) return (
    <div style={{ display: 'grid', gap: 10 }}>
      {[1,2].map(i => <Skeleton key={i} style={{ height: 130, borderRadius: 'var(--radius-md)' }} />)}
    </div>
  )

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHeader
        title="Portfolios"
        num="009 / 016"
        action={<Button onClick={() => setModal('new')}>+ Add</Button>}
      >
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>All your investments, one view.</p>
      </PageHeader>

      {portfolios.length > 0 && (
        <Card>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Total Portfolio Value</p>
          <p className="fin" style={{ fontSize: 22, fontWeight: 600, color: 'var(--success)' }}>{fmtINR(totalValue)}</p>
          {totalCost > 0 && (
            <p style={{ fontSize: 12, color: totalGain >= 0 ? 'var(--success)' : 'var(--accent)', marginTop: 2 }}>
              {totalGain >= 0 ? '▲' : '▼'} {fmtINR(Math.abs(totalGain))} ({((totalGain / totalCost) * 100).toFixed(1)}%)
            </p>
          )}
        </Card>
      )}

      {portfolios.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true" style={{ fontSize: 48, color: 'var(--border)' }}>◐</span>}
          title="No portfolios yet"
          action="+ Add Portfolio"
          onAction={() => setModal('new')}
        >
          Track your mutual funds, stocks, and other investments here.
        </EmptyState>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {portfolios.map(p => {
            const sectors = p.allocation_summary?.sectors || {}
            const sectorNames = Object.keys(sectors)
            const invs = p.investments || []
            const portCost = invs.reduce((s, i) => s + (+i.cost_basis || 0), 0)
            const portValue = invs.reduce((s, i) => s + (+i.current_value || 0), 0)
            const portGain = portValue - portCost

            return (
              <Card key={p.id} style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{p.name}</p>
                    <p style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                      {p.goal && <span style={{ textTransform: 'capitalize' }}>{p.goal}</span>}
                      {p.risk_tolerance != null && <span> · risk {p.risk_tolerance}/10</span>}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <p className="fin" style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--success)' }}>
                      {fmtINR(+p.total_value || 0)}
                    </p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button variant="ghost" size="sm" onClick={() => setModal(p)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(p)} style={{ color: 'var(--muted)' }}>Delete</Button>
                    </div>
                  </div>
                </div>

                {sectorNames.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                    {sectorNames.map(s => (
                      <Badge key={s} variant="neutral" style={{ fontSize: 10 }}>{s} {sectors[s]}%</Badge>
                    ))}
                  </div>
                )}

                {invs.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <p style={{ fontSize: 11, color: 'var(--muted)' }}>{invs.length} investment{invs.length !== 1 ? 's' : ''}</p>
                      <Button variant="ghost" size="sm" onClick={() => refreshPrices(p)} disabled={refreshing}>
                        {refreshing ? '…' : '↻ Prices'}
                      </Button>
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
                        const gainColor = gain >= 0 ? 'var(--success)' : 'var(--accent)'
                        return (
                          <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 6, background: 'var(--border-soft)', fontSize: 12 }}>
                            <div style={{ minWidth: 0 }}>
                              <span style={{ fontWeight: 500 }}>{i.symbol}</span>
                              {i.name && <span style={{ color: 'var(--muted)', marginLeft: 4, fontSize: 10 }}>{i.name}</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                              <span className="fin">₹{curPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              <span className="fin" style={{ color: gainColor, fontWeight: 500 }}>{gain >= 0 ? '▲' : '▼'} {gainPct}%</span>
                              <span className="fin" style={{ color: 'var(--muted)', fontSize: 10 }}>{shares} sh</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {portCost > 0 && (
                      <p style={{ fontSize: 11, color: portGain >= 0 ? 'var(--success)' : 'var(--accent)', marginTop: 6, textAlign: 'right' }}>
                        P&L: {portGain >= 0 ? '▲' : '▼'} {fmtINR(Math.abs(portGain))}
                      </p>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

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