import { useResource } from '../lib/useResource'
import InvestmentFormModal from '../components/InvestmentFormModal'
import { fmtINR } from '../lib/amounts'
import { Card, Button, Badge, Skeleton, EmptyState, PageHeader, Stat } from '../components/ui'

export default function Investments() {
  const { items: investments, loading, modal, setModal, closeModal, saved, remove } = useResource('/api/v1/investments', { nameField: 'symbol' })

  if (loading) return (
    <div style={{ display: 'grid', gap: 8 }}>
      {[1,2,3].map(i => <Skeleton key={i} style={{ height: 100, marginBottom: 8, borderRadius: 'var(--radius-md)' }} />)}
    </div>
  )

  const totalValue = investments.reduce((s, i) => s + (+i.current_value || 0), 0)
  const totalGain = investments.reduce((s, i) => s + (+i.gain_loss || 0), 0)

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHeader
        title="Investments"
        num="010 / 016"
        action={<Button onClick={() => setModal('new')}>+ Add</Button>}
      >
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Individual holdings across portfolios.</p>
      </PageHeader>

      {investments.length > 0 && (
        <Card>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total Value</span>
              <p className="fin" style={{ fontSize: 16, fontWeight: 600, color: 'var(--success)' }}>{fmtINR(totalValue)}</p>
            </div>
            <div>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total P&L</span>
              <p className="fin" style={{ fontSize: 16, fontWeight: 600, color: totalGain >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {totalGain >= 0 ? '+' : ''}{fmtINR(totalGain)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {investments.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true" style={{ fontSize: 48, color: 'var(--border)' }}>◑</span>}
          title="No investments recorded"
          action="+ Add Investment"
          onAction={() => setModal('new')}
        >
          Add a share purchase or holding to start tracking.
        </EmptyState>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {investments.map(i => {
            const gain = +i.gain_loss || 0
            const gainPct = +i.gain_loss_pct || 0
            return (
              <Card key={i.id} style={{ padding: '14px 18px', marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 1 }}>{i.symbol} <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--ink-soft)' }}>{i.name}</span></p>
                    <p style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                      {i.shares} shares @ {fmtINR(+i.buy_price)}
                      {i.exchange && <span> · {i.exchange}</span>}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="fin" style={{ fontSize: 16, fontWeight: 600 }}>{fmtINR(+i.current_value || 0)}</p>
                    <p className="fin" style={{ fontSize: 12, color: gain >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {gain >= 0 ? '+' : ''}{fmtINR(gain)} ({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%)
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {i.sector && <Badge variant="neutral" style={{ fontSize: 10 }}>{i.sector}</Badge>}
                  {i.investment_type && <Badge variant="neutral" style={{ fontSize: 10 }}>{i.investment_type}</Badge>}
                  {i.dividend_yield != null && +i.dividend_yield > 0 && <Badge variant="success" style={{ fontSize: 10 }}>{i.dividend_yield}% div</Badge>}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <Button variant="ghost" size="sm" onClick={() => setModal(i)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(i)} style={{ color: 'var(--faint)' }}>Delete</Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
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