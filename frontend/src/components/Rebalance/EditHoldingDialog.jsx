import { Dialog, Button, Input, InputField, Select } from '../ui'

export default function EditHoldingDialog({
  open,
  onClose,
  holding,
  sectors,
  onSave,
}) {
  if (!open) return null

  return (
    <Dialog open onClose={onClose} title={holding?.id ? 'Edit Holding' : 'Add Holding'}>
      <form style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <InputField label="Symbol" value={holding?.symbol || ''} onChange={e => setForm({ ...form, symbol: e.target.value })} required />
        <InputField label="Name" value={holding?.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <InputField label="Shares" type="number" value={holding?.shares || ''} onChange={e => setForm({ ...form, shares: e.target.value })} required />
          <InputField label="Buy Price" type="number" step="0.01" value={holding?.buy_price || ''} onChange={e => setForm({ ...form, buy_price: e.target.value })} required />
        </div>
        <InputField label="Current Price" type="number" step="0.01" value={holding?.current_price || ''} onChange={e => setForm({ ...form, current_price: e.target.value })} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select value={holding?.investment_type || 'stock'} onChange={e => setForm({ ...form, investment_type: e.target.value })} options={[
            { value: 'stock', label: 'Stock' },
            { value: 'etf', label: 'ETF' },
            { value: 'mutual_fund', label: 'Mutual Fund' },
            { value: 'bond', label: 'Bond' },
            { value: 'other', label: 'Other' },
          ]} />
          <Select value={holding?.sector_id || ''} onChange={e => setForm({ ...form, sector_id: e.target.value })} options={sectors.map(s => ({ value: s.id, label: s.name }))} placeholder="Sector (optional)" />
        </div>
        <InputField label="Currency" value={holding?.currency_code || 'INR'} onChange={e => setForm({ ...form, currency_code: e.target.value })} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: 'var(--radius-pill)', cursor: 'pointer' }}>Cancel</button>
          <button type="submit" style={{ background: 'var(--accent)', color: 'var(--ink)', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius-pill)', cursor: 'pointer' }}>Save</button>
        </div>
      </form>
    </Dialog>
  )
}