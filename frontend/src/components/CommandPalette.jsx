import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from './ui/Modal'

const pages = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Journey', path: '/dashboard/journey' },
  { name: 'Transactions', path: '/dashboard/transactions' },
  { name: 'Budgets', path: '/dashboard/budgets' },
  { name: 'Recurring', path: '/dashboard/recurring' },
  { name: 'Debts', path: '/dashboard/debts' },
  { name: 'Payoff Plans', path: '/dashboard/payoff-plans' },
  { name: 'Simulator', path: '/dashboard/debt-payoffs' },
  { name: 'Portfolios', path: '/dashboard/portfolios' },
  { name: 'Investments', path: '/dashboard/investments' },
  { name: 'SIPs', path: '/dashboard/sips' },
  { name: 'Trip Mode', path: '/dashboard/trips' },
  { name: 'Households', path: '/dashboard/households' },
  { name: 'Conversations', path: '/dashboard/conversations' },
  { name: 'Reports', path: '/dashboard/reports' },
  { name: 'Exports', path: '/dashboard/exports' },
  { name: 'Settings', path: '/dashboard/settings' },
  { name: 'Privacy', path: '/dashboard/privacy' },
]

const actions = [
  { name: 'Add transaction', path: '/dashboard/transactions' },
  { name: 'Add debt', path: '/dashboard/debts' },
  { name: 'Add SIP', path: '/dashboard/sips' },
]

export default function CommandPalette({ open, onClose }) {
  const [q, setQ] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) {
      setQ('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const results = useMemo(() => {
    if (!q) return [...pages]
    const lower = q.toLowerCase()
    const p = pages.filter(p => p.name.toLowerCase().includes(lower))
    const a = actions.filter(a => a.name.toLowerCase().includes(lower))
    return [...a, ...p]
  }, [q])

  function select(item) {
    onClose()
    navigate(item.path)
  }

  return (
    <Modal open={open} onClose={onClose} style={{ maxWidth: 420, padding: 16 }}>
      <input ref={inputRef}
        value={q} onChange={e => setQ(e.target.value)}
        placeholder="Search pages…"
        className="input"
        style={{ marginBottom: 8 }}
        onKeyDown={e => {
          if (e.key === 'Enter' && results.length > 0) select(results[0])
          if (e.key === 'Escape') onClose()
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 320, overflowY: 'auto' }}>
        {results.map(item => (
          <button key={item.path}
            onClick={() => select(item)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer',
              fontSize: 14, color: 'var(--ink)', textAlign: 'left', fontFamily: 'inherit',
            }}>
            <span style={{ color: 'var(--coral)', fontFamily: 'var(--sans)', fontWeight: 600, width: 20 }}>&rarr;</span>
            <span>{item.name}</span>
          </button>
        ))}
        {q && results.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--ink-faint)', padding: 12, textAlign: 'center' }}>No results</p>
        )}
      </div>
    </Modal>
  )
}
