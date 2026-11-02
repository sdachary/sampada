import { useState, useEffect } from 'react'
import { Dialog, Button, InputField, Select, toast } from '../ui'
import { api } from '../../lib/api'

const INVESTMENT_TYPES = [
  { value: 'stock', label: 'Stock' },
  { value: 'etf', label: 'ETF' },
  { value: 'mutual_fund', label: 'Mutual Fund' },
  { value: 'bond', label: 'Bond' },
  { value: 'other', label: 'Other' },
]

export default function EditHoldingDialog({
  open,
  onClose,
  holding,
  sectors,
  onSave,
}) {
  const isEdit = !!holding?.id
  const [form, setForm] = useState({
    symbol: holding?.symbol || '',
    name: holding?.name || '',
    shares: holding?.shares || '',
    buy_price: holding?.buy_price || '',
    current_price: holding?.current_price || '',
    investment_type: holding?.investment_type || 'stock',
    sector_id: holding?.sector_id || '',
    currency_code: holding?.currency_code || 'INR',
    instrument_sub_type: holding?.instrument_sub_type || 'Growth',
    rebalance_settings: holding?.rebalance_settings || {},
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (holding) {
      setForm({
        symbol: holding.symbol || '',
        name: holding.name || '',
        shares: holding.shares || '',
        buy_price: holding.buy_price || '',
        current_price: holding.current_price || '',
        investment_type: holding.investment_type || 'stock',
        sector_id: holding.sector_id || '',
        currency_code: holding.currency_code || 'INR',
        instrument_sub_type: holding.instrument_sub_type || 'Growth',
        rebalance_settings: holding.rebalance_settings || {},
      })
      setError('')
    } else {
      setForm({
        symbol: '',
        name: '',
        shares: '',
        buy_price: '',
        current_price: '',
        investment_type: 'stock',
        sector_id: '',
        currency_code: 'INR',
        instrument_sub_type: 'Growth',
        rebalance_settings: {},
      })
    }
  }, [holding, open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    // Validate required fields
    if (!form.symbol.trim()) return setError('Symbol is required')
    if (!form.shares || Number(form.shares) < 0) return setError('Shares must be >= 0')
    if (!form.buy_price || Number(form.buy_price) < 0) return setError('Buy price must be >= 0')

    try {
      const body = {
        portfolio_id: holding?.portfolio_id,
        symbol: form.symbol.trim().toUpperCase(),
        name: form.name.trim(),
        shares: Number(form.shares),
        buy_price: Number(form.buy_price),
        current_price: form.current_price ? Number(form.current_price) : null,
        investment_type: form.investment_type,
        sector_id: form.sector_id || null,
        currency_code: form.currency_code,
        instrument_sub_type: form.instrument_sub_type,
        rebalance_settings: form.rebalance_settings,
      }

      if (isEdit) {
        await api.request(`/api/v1/investments/${holding.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
      } else {
        await api.request('/api/v1/investments', {
          method: 'POST',
          body: JSON.stringify(body),
        })
      }

      toast('Holding ' + (isEdit ? 'updated' : 'created'))
      onClose()
      onSave()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <Dialog open onClose={onClose} title={isEdit ? 'Edit Holding' : 'Add Holding'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error && <div style={{ color: 'var(--accent)', fontSize: 12 }}>{error}</div>}

        <InputField label="Symbol *" value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })} required />
        <InputField label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <InputField label="Shares *" type="number" step="0.01" min="0" value={form.shares} onChange={e => setForm({ ...form, shares: e.target.value })} required />
          <InputField label="Buy Price (₹) *" type="number" step="0.01" min="0" value={form.buy_price} onChange={e => setForm({ ...form, buy_price: e.target.value })} required />
        </div>
        <InputField label="Current Price (₹)" type="number" step="0.01" min="0" value={form.current_price} onChange={e => setForm({ ...form, current_price: e.target.value })} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select value={form.investment_type} onChange={e => setForm({ ...form, investment_type: e.target.value })} options={INVESTMENT_TYPES} />
          <Select value={form.sector_id} onChange={e => setForm({ ...form, sector_id: e.target.value })} placeholder="Sector (optional)" options={sectors.map(s => ({ value: s.id, label: s.name }))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <InputField label="Currency" value={form.currency_code} onChange={e => setForm({ ...form, currency_code: e.target.value })} />
          <Select value={form.instrument_sub_type} onChange={e => setForm({ ...form, instrument_sub_type: e.target.value })} options={[
            { value: 'Dividend', label: 'Dividend' },
            { value: 'Growth', label: 'Growth' },
          ]} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="ghost" type="button" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving}>
            {saving ? 'Saving…' : (isEdit ? 'Update' : 'Add')} Holding
          </Button>
        </div>
      </form>
    </Dialog>
  )
}