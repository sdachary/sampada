// Bank PDF import: parse locally, review rows, confirm only what the user keeps.
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { parseStatement } from '../lib/pdfStatement'
import { Button, Card, Input, Badge } from './ui'

const MAX_BYTES = 10 * 1024 * 1024

async function digestOf(bytes) {
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function StatementImport({ onDone, onCancel }) {
  const [step, setStep] = useState('upload')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [importId, setImportId] = useState('')
  const [rows, setRows] = useState([])
  const [selected, setSelected] = useState([])
  const [imported, setImported] = useState(0)
  const timer = useRef(null)

  useEffect(() => () => clearInterval(timer.current), [])

  const handleFile = async (file) => {
    if (!file) return
    setError('')
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return setError('Please choose a PDF file')
    if (file.size > MAX_BYTES) return setError('File must be 10 MB or smaller')
    setBusy(true)
    setProgress('Reading PDF…')
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      setProgress('Extracting transactions…')
      const { rows: parsed, bank } = await parseStatement(new File([bytes], file.name, { type: 'application/pdf' }))
      if (!parsed.length) throw new Error('No transactions found in this PDF')
      setProgress('Checking for duplicates…')
      const result = await api.request('/api/v1/statement_imports', {
        method: 'POST',
        body: JSON.stringify({
          bank, file_digest: await digestOf(bytes), file_size: file.size,
          transactions: parsed,
        }),
      })
      const id = result.id
      setImportId(id)
      setProgress('Analysing statement…')
      timer.current = setInterval(async () => {
        try {
          const state = await api.request(`/api/v1/statement_imports/${id}`)
          if (state.status === 'done') {
            clearInterval(timer.current)
            setRows(state.result?.transactions || [])
            setSelected((state.result?.transactions || []).map((_, i) => i).filter(i => !(state.result.transactions[i].duplicate)))
            setStep('review')
            setBusy(false)
          } else if (state.status === 'failed') {
            clearInterval(timer.current)
            setError('Could not analyse this statement. Try the CSV import instead.')
            setBusy(false)
          }
        } catch (e) {
          clearInterval(timer.current)
          setError(e.message)
          setBusy(false)
        }
      }, 2000)
    } catch (e) {
      setError(e.message || 'Could not read this PDF')
      setBusy(false)
    }
  }

  const patch = (i, key, value) => setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [key]: value } : r)))
  const toggle = (i) => setSelected((prev) => (prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]))
  const total = selected.reduce((s, i) => s + (rows[i]?.transaction_type === 'income' ? 0 : Number(rows[i]?.amount || 0)), 0)

  const confirm = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await api.request(`/api/v1/statement_imports/${importId}/confirm`, {
        method: 'POST', body: JSON.stringify({ selected }),
      })
      setImported(result.imported)
      setStep('done')
      onDone?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (step === 'upload') {
    return (
      <Card className="card-shell card-core--pad-lg">
        <p className="text-sm font-semibold text-ink mb-1">Import a bank statement</p>
        <p className="text-sm text-muted mb-3">PDF up to 10 MB. Parsed in your browser; nothing is uploaded.</p>
        <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-border rounded-xl py-10 cursor-pointer hover:border-accent transition-colors">
          <span className="text-sm text-ink">{busy ? (progress || 'Working…') : 'Drop a PDF here or click to choose'}</span>
          <input type="file" accept=".pdf,application/pdf" className="sr-only" disabled={busy} onChange={(e) => handleFile(e.target.files?.[0])} />
        </label>
        {error && <p className="text-sm text-danger mt-2" role="alert">{error}</p>}
        <button type="button" onClick={onCancel} className="text-sm text-muted mt-3 py-2">Cancel</button>
      </Card>
    )
  }

  if (step === 'done') {
    return (
      <Card className="card-shell card-core--pad-lg border-l border-l-success">
        <p className="text-sm font-semibold text-ink mb-1">{imported} transaction{imported === 1 ? '' : 's'} imported</p>
        <p className="text-sm text-muted mb-3">Want Sampada to spot recurring bills automatically?</p>
        <div className="flex gap-2 flex-wrap">
          <Link to="/dashboard/recurring"><Button size="sm">Detect recurring</Button></Link>
          <Button size="sm" variant="ghost" onClick={onCancel}>Done</Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="card-shell card-core--pad-lg">
      <div className="flex justify-between items-center flex-wrap gap-2 mb-3">
        <p className="text-sm font-semibold text-ink">Review {rows.length} transactions</p>
        <Badge variant="neutral">₹{Math.round(total).toLocaleString('en-IN')} selected expense</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[620px]">
          <thead><tr className="text-left text-2xs uppercase text-faint">
            <th className="py-1 pr-2">Use</th><th className="py-1 pr-2">Date</th><th className="py-1 pr-2">Description</th>
            <th className="py-1 pr-2">Amount</th><th className="py-1 pr-2">Type</th><th className="py-1">Confidence</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-t border-border-soft ${r.confidence < 0.8 ? 'bg-warning-bg' : ''}`}>
                <td className="py-1 pr-2"><input type="checkbox" checked={selected.includes(i)} onChange={() => toggle(i)} aria-label={`Include row ${i + 1}`} /></td>
                <td className="py-1 pr-2"><Input type="date" value={r.transaction_date} onChange={e => patch(i, 'transaction_date', e.target.value)} className="input-sm" /></td>
                <td className="py-1 pr-2"><Input value={r.description} onChange={e => patch(i, 'description', e.target.value)} className="input-sm" /></td>
                <td className="py-1 pr-2"><Input type="number" value={r.amount} onChange={e => patch(i, 'amount', Number(e.target.value))} className="input-sm w-28" /></td>
                <td className="py-1 pr-2">
                  <select className="input-sm" value={r.transaction_type} onChange={e => patch(i, 'transaction_type', e.target.value)}>
                    <option value="expense">Expense</option><option value="income">Income</option>
                  </select>
                </td>
                <td className="py-1">
                  <Badge variant={r.duplicate ? 'danger' : r.confidence < 0.8 ? 'warning' : 'success'}>
                    {r.duplicate ? 'duplicate' : `${Math.round((r.confidence || 0) * 100)}%`}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 mt-4 flex-wrap">
        <Button size="sm" onClick={confirm} disabled={busy || !selected.length} loading={busy}>Import {selected.length} rows</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
      {error && <p className="text-sm text-danger mt-2" role="alert">{error}</p>}
    </Card>
  )
}
