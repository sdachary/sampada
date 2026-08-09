import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Modal, Field, ConfirmDialog } from './ui'

const TYPES = ['stock', 'etf', 'mutual_fund', 'bond', 'gold', 'crypto', 'other']

export default function InvestmentFormModal({ investment, onClose, onSave }) {
  const isEdit = !!investment
  const [portfolios, setPortfolios] = useState([])
  const [form, setForm] = useState({
    portfolio_id: investment?.portfolio_id || '',
    symbol: investment?.symbol || '',
    name: investment?.name || '',
    investment_type: investment?.investment_type || 'stock',
    exchange: investment?.exchange || '',
    shares: investment?.shares || '',
    buy_price: investment?.buy_price || '',
    sector: investment?.sector || '',
    notes: investment?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    api.request('/api/v1/portfolios').then(d => setPortfolios(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = {
        ...form,
        portfolio_id: form.portfolio_id,
        shares: parseFloat(form.shares) || 0,
        buy_price: parseFloat(form.buy_price) || 0,
      }
      if (isEdit) {
        await api.request(`/api/v1/investments/${investment.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      } else {
        await api.request('/api/v1/investments', { method: 'POST', body: JSON.stringify(body) })
      }
      onSave()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await api.request(`/api/v1/investments/${investment.id}`, { method: 'DELETE' })
      onSave()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal open title={isEdit ? 'Edit Investment' : 'Add Investment'} onClose={onClose} style={{ maxWidth: 480 }}>
      {error && <div style={{ background: 'var(--coral-bg)', color: 'var(--coral)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Portfolio *">
          <select required className="input" value={form.portfolio_id} onChange={set('portfolio_id')}>
            <option value="">Select a portfolio</option>
            {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Symbol *">
            <input required className="input" value={form.symbol} onChange={set('symbol')} placeholder="e.g. RELIANCE" />
          </Field>
          <Field label="Type">
            <select className="input" value={form.investment_type} onChange={set('investment_type')}>
              {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Name">
          <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Reliance Industries" />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Shares *">
            <input required type="number" min="0" step="any" className="input" value={form.shares} onChange={set('shares')} placeholder="0" />
          </Field>
          <Field label="Buy Price (₹) *">
            <input required type="number" min="0" step="0.01" className="input" value={form.buy_price} onChange={set('buy_price')} placeholder="0" />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Exchange">
            <input className="input" value={form.exchange} onChange={set('exchange')} placeholder="e.g. NSE" />
          </Field>
          <Field label="Sector">
            <input className="input" value={form.sector} onChange={set('sector')} placeholder="e.g. Energy" />
          </Field>
        </div>

        <Field label="Notes">
          <textarea className="input" rows="2" value={form.notes} onChange={set('notes')} placeholder="Optional notes..." style={{ resize: 'vertical' }} />
        </Field>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
            {saving ? 'Saving…' : isEdit ? 'Update Investment' : 'Add Investment'}
          </button>
          {isEdit && (
            <button type="button" onClick={() => setConfirming(true)} disabled={saving}
              style={{ padding: '10px 20px', borderRadius: 999, border: '1px solid var(--coral)', background: 'transparent', color: 'var(--coral)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              Delete
            </button>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={confirming}
        title="Delete investment?"
        message={`Delete "${investment?.symbol}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </Modal>
  )
}
