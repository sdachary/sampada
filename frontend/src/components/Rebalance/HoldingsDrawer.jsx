import { Table, Button, Badge, Dialog, fmtINR } from '../ui'

export default function HoldingsDrawer({
  open,
  onClose,
  holdings,
  onEdit,
  onDelete,
  onImportClick,
  onAddClick,
}) {
  if (!open) return null

  const fmtINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

  return (
    <Dialog open onClose={onClose} title="Holdings" wide>
      <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
        <Table
          columns={[
            { key: 'instrument', label: 'Instrument' },
            { key: 'type', label: 'Type' },
            { key: 'qty', label: 'Qty', align: 'right' },
            { key: 'avgCost', label: 'Avg Cost', align: 'right' },
            { key: 'ltp', label: 'LTP', align: 'right' },
            { key: 'value', label: 'Value', align: 'right' },
            { key: 'sector', label: 'Sector' },
            { key: 'type', label: 'D/G' },
            { key: 'actions', label: 'Actions', align: 'center' },
          ]}
          rows={holdings.map((inv) => ({
            id: inv.id,
            cells: {
              instrument: <strong>{inv.symbol}</strong>,
              type: <Badge variant={inv.investment_type === 'stock' ? 'accent' : 'neutral'}>{inv.investment_type}</Badge>,
              qty: inv.shares,
              avgCost: fmtINR(inv.buy_price),
              ltp: fmtINR(inv.current_price),
              value: fmtINR(inv.current_value),
              sector: inv.sector || '—',
              type: <Badge variant={inv.instrument_sub_type === 'Dividend' ? 'success' : 'neutral'}>{inv.instrument_sub_type}</Badge>,
              actions: (
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button variant="ghost" size="sm" onClick={() => onEdit(inv)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(inv.id)} style={{ color: 'var(--accent)' }}>Delete</Button>
                </div>
              ),
            },
          }))}
          ariaLabel="Holdings list"
        />
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <Button variant="ghost" onClick={onImportClick}>Import CSV</Button>
          <Button onClick={onAddClick}>+ Add Holding</Button>
        </div>
      </div>
    </Dialog>
  )
}