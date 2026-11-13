import { useResource } from '../lib/useResource'
import InvestmentFormModal from '../components/InvestmentFormModal'
import { fmtINR } from '../lib/amounts'
import { Card, Button, Badge, Skeleton, EmptyState, PageHeader, Stat } from '../components/ui'
import { Reveal } from '../lib/motion-primitives'

export default function Investments() {
  const { items: investments, loading, modal, setModal, closeModal, saved, remove } = useResource('/api/v1/investments', { nameField: 'symbol' })

  if (loading) return (
    <Reveal delay={0}>
      <div className="space-y-2">
        {[1,2,3].map(i => <Skeleton key={i} className="skeleton-card" />)}
      </div>
    </Reveal>
  )

  const totalValue = investments.reduce((s, i) => s + (+i.current_value || 0), 0)
  const totalGain = investments.reduce((s, i) => s + (+i.gain_loss || 0), 0)

  return (
    <div className="space-y-5">
      <Reveal delay={0}>
        <PageHeader
          title="Investments"
          num="010 / 016"
          action={<Button onClick={() => setModal('new')}>+ Add</Button>}
        >
          <p className="text-sm text-muted">Individual holdings across portfolios.</p>
        </PageHeader>
      </Reveal>

      <Reveal delay={50}>
        {investments.length > 0 && (
          <Card className="card-shell card-core--pad-lg">
            <div className="flex gap-4 flex-wrap">
              <div>
                <span className="label-caps">Total Value</span>
                <p className="fin text-lg font-semibold text-success mt-1">{fmtINR(totalValue)}</p>
              </div>
              <div>
                <span className="label-caps">Total P&L</span>
                <p className={`fin text-lg font-semibold mt-1 ${totalGain >= 0 ? 'text-success' : 'text-danger'}`}>
                  {totalGain >= 0 ? '+' : ''}{fmtINR(totalGain)}
                </p>
              </div>
            </div>
          </Card>
        )}
      </Reveal>

      <Reveal delay={100}>
        {investments.length === 0 ? (
          <EmptyState
            icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-border" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
            title="No investments recorded"
            action="+ Add Investment"
            onAction={() => setModal('new')}
          >
            Add a share purchase or holding to start tracking.
          </EmptyState>
        ) : (
          <div className="space-y-2">
            {investments.map((i, index) => {
              const gain = +i.gain_loss || 0
              const gainPct = +i.gain_loss_pct || 0
              return (
                <Reveal key={i.id} delay={index * 20}>
                  <Card className="card-shell card-shell--interactive card-core--pad-base">
                    <div className="flex justify-between items-start mb-1">
                      <div className="min-w-0">
                        <p className="text-base font-semibold flex items-center gap-1 truncate">
                          {i.symbol} <span className="text-sm font-normal text-ink-soft">{i.name}</span>
                        </p>
                        <p className="text-sm text-muted flex items-center gap-1">
                          {i.shares} shares @ {fmtINR(+i.buy_price)}
                          {i.exchange && <span>· {i.exchange}</span>}
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="fin text-lg font-semibold">{fmtINR(+i.current_value || 0)}</p>
                        <p className={`fin text-sm ${gain >= 0 ? 'text-success' : 'text-danger'}`}>
                          {gain >= 0 ? '+' : ''}{fmtINR(gain)} ({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                      {i.sector && <Badge variant="neutral" className="text-[10px]">{i.sector}</Badge>}
                      {i.investment_type && <Badge variant="neutral" className="text-[10px]">{i.investment_type}</Badge>}
                      {i.dividend_yield != null && +i.dividend_yield > 0 && <Badge variant="success" className="text-[10px]">{i.dividend_yield}% div</Badge>}
                      <div className="ml-auto flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setModal(i)}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(i)} className="text-faint">Delete</Button>
                      </div>
                    </div>
                  </Card>
                </Reveal>
              )
            })}
          </div>
        )}
      </Reveal>

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