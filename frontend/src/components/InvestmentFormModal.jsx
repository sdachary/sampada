import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Modal, Field, ConfirmDialog } from './ui'
import { useModalForm } from '../lib/useModalForm'

const TYPES = ['stock', 'etf', 'mutual_fund', 'bond', 'gold', 'crypto', 'other']

export default function InvestmentFormModal({ investment, onClose, onSave }) {
  const isEdit = !!investment
  const [portfolios, setPortfolios] = useState([])
  const { form, set, saving, error, handleSubmit } = useModalForm({
    portfolio_id: investment?.portfolio_id || '',
    symbol: investment?.symbol || '',
    name: investment?.name || '',
    investment_type: investment?.investment_type || 'stock',
    exchange: investment?.exchange || '',
    shares: investment?.shares || '',
    buy_price: investment?.buy_price || '',
    sector: investment?.sector || '',
    notes: investment?.notes || '',
  }, {
    basePath: '/api/v1/investments',
    id: investment?.id,
    toBody: (b) => ({
      ...b,
      portfolio_id: b.portfolio_id,
      shares: parseFloat(b.shares) || 0,
      buy_price: parseFloat(b.buy_price) || 0,
    }),
    onSave,
  })
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
    <Modal className="max-w-480" open title={isEdit ? 'Edit Investment' : 'Add Investment'} onClose={onClose} >
      {error && <div className="alert-inline" >{error}</div>}

      <form className="col-g14" onSubmit={handleSubmit} >
        <Field label="Portfolio *">
          <select required className="input" value={form.portfolio_id} onChange={set('portfolio_id')}>
            <option value="">Select a portfolio</option>
            {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>

        <div className="grid-2" >
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

        <div className="grid-2" >
          <Field label="Shares *">
            <input required type="number" min="0" step="any" className="input" value={form.shares} onChange={set('shares')} placeholder="0" />
          </Field>
          <Field label="Buy Price (₹) *">
            <input required type="number" min="0" step="0.01" className="input" value={form.buy_price} onChange={set('buy_price')} placeholder="0" />
          </Field>
        </div>

        <div className="grid-2" >
          <Field label="Exchange">
            <input className="input" value={form.exchange} onChange={set('exchange')} placeholder="e.g. NSE" />
          </Field>
          <Field label="Sector">
            <input className="input" value={form.sector} onChange={set('sector')} placeholder="e.g. Energy" />
          </Field>
        </div>

        <Field label="Notes">
          <textarea className="input resize-v" rows="2" value={form.notes} onChange={set('notes')} placeholder="Optional notes..."  />
        </Field>

        <div className="flex-g10-mt8" >
          <button type="submit" disabled={saving} className="btn btn-primary flex-1-center" >
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
