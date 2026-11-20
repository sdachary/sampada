import { useResource } from '../lib/useResource'
import PortfolioFormModal from '../components/PortfolioFormModal'
import { Card, Button, Skeleton, EmptyState, PageHeader, Badge, fmtINR, Progress, Stat } from '../components/ui'
import { Reveal } from '../lib/motion-primitives'

export default function Portfolios() {
  const { items: portfolios, loading, modal, setModal, closeModal, saved, remove } = useResource('/api/v1/portfolios')

  const totalValue = portfolios.reduce((s, p) => s + (+p.total_value || 0), 0)
  const totalCost = portfolios.reduce((s, p) => s + (p.investments || []).reduce((ss, i) => ss + (+i.cost_basis || 0), 0), 0)
  const totalGain = totalValue - totalCost

  // Prices are refreshed hourly by the Worker's price_refresh cron and returned
  // on each investment by the portfolios endpoint; there is no on-demand route.

  if (loading) return (
    <Reveal delay={0}>
      <div className="space-y-3">
        {[1,2].map(i => <Skeleton key={i} className="skeleton-card" />)}
      </div>
    </Reveal>
  )

  return (
    <div className="space-y-5">
      <Reveal delay={0}>
        <PageHeader
          title="Portfolios"
          action={<Button onClick={() => setModal('new')}>+ Add</Button>}
        >
          <p className="text-sm text-muted">All your investments, one view.</p>
        </PageHeader>
      </Reveal>

      <Reveal delay={50}>
        {portfolios.length > 0 && (
          <Card className="card-shell card-shell--elevated card-core--pad-lg">
            <p className="label-caps">Total Portfolio Value</p>
            <p className="fin font-display text-2xl font-semibold text-success mt-1">{fmtINR(totalValue)}</p>
            {totalCost > 0 && (
              <p className={`text-sm mt-1 ${totalGain >= 0 ? 'text-success' : 'text-accent'}`}>
                {totalGain >= 0 ? '▲' : '▼'} {fmtINR(Math.abs(totalGain))} ({((totalGain / totalCost) * 100).toFixed(1)}%)
              </p>
            )}
          </Card>
        )}
      </Reveal>

      <Reveal delay={100}>
        {portfolios.length === 0 ? (
          <EmptyState
            icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-border" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
            title="No portfolios yet"
            action="+ Add Portfolio"
            onAction={() => setModal('new')}
          >
            Track your mutual funds, stocks, and other investments here.
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {portfolios.map((p, index) => {
              const sectors = p.allocation_summary?.sectors || {}
              const sectorNames = Object.keys(sectors)
              const invs = p.investments || []
              const portCost = invs.reduce((s, i) => s + (+i.cost_basis || 0), 0)
              const portValue = invs.reduce((s, i) => s + (+i.current_value || 0), 0)
              const portGain = portValue - portCost

              return (
                <Reveal key={p.id} delay={index * 30}>
                  <Card className="card-shell card-shell--interactive card-core--pad-base">
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0">
                        <p className="text-lg font-medium text-ink truncate">{p.name}</p>
                        <p className="text-sm text-muted flex items-center gap-1">
                          {p.goal && <span className="capitalize">{p.goal}</span>}
                          {p.risk_tolerance != null && <span>· risk {p.risk_tolerance}/10</span>}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-3">
                        <p className="fin font-display text-lg font-semibold text-success">{fmtINR(+p.total_value || 0)}</p>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setModal(p)}>Edit</Button>
                          <Button variant="ghost" size="sm" onClick={() => remove(p)} className="text-muted">Delete</Button>
                        </div>
                      </div>
                    </div>

                    {sectorNames.length > 0 && (
                      <div className="flex gap-2 flex-wrap mb-2">
                        {sectorNames.map(s => (
                          <Badge key={s} variant="neutral" className="text-[11px]">{s} {sectors[s]}%</Badge>
                        ))}
                      </div>
                    )}

                    {invs.length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs text-muted">{invs.length} investment{invs.length !== 1 ? 's' : ''}</p>
                          <span className="text-[11px] text-faint">Prices refresh hourly</span>
                        </div>
                        <div className="space-y-1">
                          {invs.map(i => {
                            const curPrice = +i.current_price || 0
                            const shares = +i.shares || 0
                            const gain = +i.gain_loss || 0
                            const gainPct = +i.cost_basis > 0 ? (+i.gain_loss_pct).toFixed(1) : '—'
                            const gainColor = gain >= 0 ? 'text-success' : 'text-accent'
                            return (
                              <div key={i.id} className="flex justify-between items-center px-2 py-1.5 rounded bg-border-soft text-xs">
                                <div className="min-w-0">
                                  <span className="font-medium truncate block">{i.symbol}</span>
                                  {i.name && <span className="text-muted text-[11px] ml-1 truncate block">{i.name}</span>}
                                </div>
                                <div className="flex items-center gap-3 ml-2">
                                  <span className="fin">₹{curPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  <span className={`fin font-medium ${gainColor}`}>{gain >= 0 ? '▲' : '▼'} {gainPct}%</span>
                                  <span className="fin text-muted text-[11px]">{shares} sh</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {portCost > 0 && (
                          <p className={`text-xs text-right mt-2 ${portGain >= 0 ? 'text-success' : 'text-accent'}`}>
                            P&L: {portGain >= 0 ? '▲' : '▼'} {fmtINR(Math.abs(portGain))}
                          </p>
                        )}
                      </div>
                    )}
                  </Card>
                </Reveal>
              )
            })}
          </div>
        )}
      </Reveal>

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