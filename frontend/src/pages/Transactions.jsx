import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import TransactionFormModal from '../components/TransactionFormModal'
import useOnline from '../lib/useOnline'
import { fmtINR } from '../lib/amounts'
import { Button, Card, EmptyState, Badge, Select, Skeleton } from '../components/ui'
import { Reveal } from '../lib/motion-primitives'

export default function Transactions() {
  const { isOnline } = useOnline()
  const [txns, setTxns] = useState([])
  const [totals, setTotals] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [modal, setModal] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const text = await file.text()
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/transactions/bulk_create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions_csv: text }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText)
      const data = await res.json()
      setImportResult(data)
      load(filter || '')
    } catch (err) {
      setImportResult({ error: err.message })
    } finally {
      setImporting(false)
    }
  }

  const load = (type) => {
    setLoading(true)
    setFilter(type)
    const params = type ? `?transaction_type=${type}` : ''
    Promise.all([
      api.request('/api/v1/transactions/monthly_totals'),
      api.request(`/api/v1/transactions${params}`),
    ]).then(([t, d]) => { setTotals(t || []); setTxns(Array.isArray(d?.transactions) ? d.transactions : []) })
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => load(''), [])

  const openModal = (t) => setModal(t || 'new')
  const closeModal = (saved) => {
    if (saved) load(filter || '')
    setModal(null)
  }

  if (loading) return (
    <div className="space-y-5">
      <Skeleton className="skeleton-title" />
      <Skeleton className="skeleton-text w-64" />
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {[1,2,3].map(i => <div key={i} className="skeleton-card" />)}
      </div>
    </div>
  )

  const monthTotals = totals.slice(-3)
  const totalExpenses = txns.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + (+t.amount), 0)
  const totalIncome = txns.filter(t => t.transaction_type === 'income').reduce((s, t) => s + (+t.amount), 0)

  return (
    <div className="space-y-6">
      <Reveal delay={0}>
        <div className="space-y-1">
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted">006 / 016</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Transactions</h1>
          <p className="text-sm text-muted">Track every rupee in and out.</p>
        </div>
      </Reveal>

      <Reveal delay={50}>
        {/* Month totals */}
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {monthTotals.map((m, i) => (
            <Card key={m.month} className="card-shell card-core--pad-base flex-1 min-w-[160px]">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted mb-1">{m.label}</p>
              <p className="fin text-lg text-success">+{fmtINR(+m.income)}</p>
              <p className="fin text-lg text-danger">-{fmtINR(+m.expenses)}</p>
              <p className={`fin text-base font-medium ${+m.net >= 0 ? 'text-success' : 'text-danger'}`}>= {fmtINR(+m.net)}</p>
            </Card>
          ))}
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={filter} onChange={e => load(e.target.value)} className="min-w-[140px]">
            <option value="">All</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </Select>
          <Button onClick={() => openModal(null)} disabled={!isOnline} className="ml-auto">+ Add</Button>
          <Button variant="ghost" onClick={() => document.querySelector('input[type="file"]').click()} disabled={importing}>
            {importing ? 'Importing…' : 'Import CSV'}
          </Button>
          <input type="file" accept=".csv,text/csv" hidden onChange={handleImport} disabled={importing} />
          {txns.length > 0 && <span className="text-2xs text-faint">{txns.length} txns</span>}
        </div>
      </Reveal>

      {importResult && (
        <Reveal delay={150}>
          <Card className={`card-shell card-core--pad-base border-l-3 ${importResult.error ? 'border-l-danger' : 'border-l-success'}`}>
            {importResult.error
              ? <span className="text-danger">Import failed: {importResult.error}</span>
              : <span className="text-muted">
                  Imported <b>{importResult.imported}</b> transaction{importResult.imported === 1 ? '' : 's'}
                  {importResult.errors?.length > 0 && ` · ${importResult.errors.length} skipped`}
                </span>}
          </Card>
        </Reveal>
      )}

      <Reveal delay={200}>
        {txns.length === 0 ? (
          <EmptyState
            icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-border" aria-hidden="true"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
            title="No transactions yet"
            action="+ Add Transaction"
            actionDisabled={!isOnline}
            onAction={() => openModal(null)}
          >
            Start tracking your spending to see patterns emerge.
          </EmptyState>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              <Card className="card-shell card-core--pad-base">
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted">Total Income</p>
                <p className="fin text-2xl text-success">{fmtINR(totalIncome)}</p>
              </Card>
              <Card className="card-shell card-core--pad-base">
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted">Total Expenses</p>
                <p className="fin text-2xl text-danger">{fmtINR(totalExpenses)}</p>
              </Card>
              <Card className="card-shell card-core--pad-base">
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted">Net</p>
                <p className={`fin text-xl font-semibold ${totalIncome - totalExpenses >= 0 ? 'text-success' : 'text-danger'}`}>{fmtINR(totalIncome - totalExpenses)}</p>
              </Card>
            </div>

            {/* Transaction list */}
            <div className="space-y-2">
              {txns.map(t => (
                <Card key={t.id} className={`card-shell card-core--pad-base border-l-3 ${t.transaction_type === 'expense' ? 'border-l-danger' : 'border-l-success'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-ink truncate">{t.description}</p>
                      <p className="text-xs text-muted flex items-center gap-1 flex-wrap">
                        {t.category_name && <span className="text-muted">{t.category_name} · </span>}
                        {t.transaction_date} {t.merchant && <span>· {t.merchant}</span>}
                        {t.recurring && <Badge variant="neutral" className="text-[9px] ml-1">recurring</Badge>}
                      </p>
                    </div>
                    <p className={`fin font-display text-lg font-semibold whitespace-nowrap ml-3 ${t.transaction_type === 'expense' ? 'text-danger' : 'text-success'}`}>
                      {t.transaction_type === 'expense' ? '-' : '+'}{fmtINR(+t.amount)}
                    </p>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button variant="ghost" size="sm" onClick={() => openModal(t)} disabled={!isOnline}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm(`Delete "${t.description}"?`)) { api.request(`/api/v1/transactions/${t.id}`, { method: 'DELETE' }).then(() => load(filter || '')) } }} disabled={!isOnline} className="text-muted">Delete</Button>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </Reveal>

      {modal && (
        <TransactionFormModal
          transaction={modal === 'new' ? null : modal}
          onClose={() => closeModal(false)}
          onSave={() => closeModal(true)}
        />
      )}
    </div>
  )
}