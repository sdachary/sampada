import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Field } from '../components/ui'
import Chart from '../components/Chart'

export default function PayoffSimulator() {
  const [searchParams] = useSearchParams()
  const [debts, setDebts] = useState([])
  const [selectedId, setSelectedId] = useState(searchParams.get('debtId') || '')
  const [extraPayment, setExtraPayment] = useState(0)
  const [lumpSum, setLumpSum] = useState(0)
  const [annualExtra, setAnnualExtra] = useState(0)
  const [baseline, setBaseline] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [search, setSearch] = useState('')

  const simulate = useCallback(async () => {
    if (!selectedId) return
    setSimulating(true)
    try {
      const body = JSON.stringify({
        extra_monthly_payment: +extraPayment || 0,
        lump_sum_amount: +lumpSum || 0,
        annual_extra: +annualExtra || 0,
      })
      const [base, res] = await Promise.all([
        api.request(`/api/v1/debts/${selectedId}/simulate`, {
          method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' },
        }),
        api.request(`/api/v1/debts/${selectedId}/simulate`, {
          method: 'POST', body, headers: { 'Content-Type': 'application/json' },
        }),
      ])
      setBaseline(base)
      setResult(res)
    } catch {}
    setSimulating(false)
  }, [selectedId, extraPayment, lumpSum, annualExtra])

  useEffect(() => {
    api.request('/api/v1/debts').then(d => {
      setDebts(Array.isArray(d) ? d : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedId && debts.length > 0 && !baseline && !simulating) simulate()
  }, [debts, selectedId])

  if (loading) return <div><div className="skeleton" style={{ height: 200 }} /></div>

  const selected = debts.find(d => d.id === +selectedId)
  const base = baseline
  const res = result
  const monthsSaved = base && res ? base.months - res.months : 0
  const interestSaved = base && res ? +base.total_interest - +res.total_interest : 0
  const filtered = search ? debts.filter(d => d.name.toLowerCase().includes(search.toLowerCase())) : debts

  return (
    <div>
      <p className="page-num" style={{ marginBottom: 4 }}>00<em>5</em> / 016</p>
      <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Payoff Simulator</h1>
      <p style={{ fontSize: 13.5, color: 'var(--ink-mute)', marginBottom: 24 }}>See how extra payments affect your debt-free date.</p>

      {debts.length === 0 ? (
        <div className="empty-state">
          <span className="emoji">◎</span>
          <p>Select a debt to simulate payoffs</p>
          <Link to="/dashboard/debts" className="btn btn-ghost" style={{ fontSize: 12.5 }}>View debts</Link>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Field label="Select Debt" style={{ marginBottom: 6 }}>
              <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setBaseline(null); setResult(null) }}
                className="input" style={{ maxWidth: 360, padding: '9px 12px' }}>
                <option value="">Choose a debt…</option>
                {filtered.map(d => (
                  <option key={d.id} value={d.id}>{d.name} — ₹{(+d.amount || 0).toLocaleString('en-IN')} @ {d.interest_rate}%</option>
                ))}
              </select>
            </Field>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search debts…" className="input" style={{ maxWidth: 360, padding: '9px 12px', fontSize: 14 }} />
            {search && filtered.length === 0 && <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>No debts match "{search}"</p>}
          </div>

          {selected && (
            <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{selected.name}</p>
              <p style={{ fontSize: 11.5, color: 'var(--ink-mute)' }}>
                ₹{(+selected.amount || 0).toLocaleString('en-IN')} · {selected.interest_rate}% APR · EMI: ₹{(+selected.emi_amount || 0).toLocaleString('en-IN')}/mo
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <Field label="Extra Monthly (₹)" style={{ display: 'inline-block' }}>
              <input type="number" value={extraPayment} onChange={e => setExtraPayment(e.target.value)}
                className="input" style={{ maxWidth: 160, padding: '9px 12px' }} placeholder="0" min="0" />
            </Field>
            <Field label="Lump Sum (₹)" style={{ display: 'inline-block' }}>
              <input type="number" value={lumpSum} onChange={e => setLumpSum(e.target.value)}
                className="input" style={{ maxWidth: 160, padding: '9px 12px' }} placeholder="0" min="0" />
            </Field>
            <Field label="Annual Extra (₹)" style={{ display: 'inline-block' }}>
              <input type="number" value={annualExtra} onChange={e => setAnnualExtra(e.target.value)}
                className="input" style={{ maxWidth: 160, padding: '9px 12px' }} placeholder="0" min="0" />
            </Field>
          </div>

          <button onClick={simulate} disabled={!selectedId || simulating} className="btn btn-primary" style={{ fontSize: 13, padding: '9px 24px' }}>
            {simulating ? 'Simulating…' : 'Simulate'}
          </button>

          {res && base && (
            <div style={{ marginTop: 20 }}>
              <div className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Comparison</p>
                <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 140px' }}>
                    <p style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Current plan</p>
                    <p className="fin" style={{ fontSize: 24, fontWeight: 700, color: 'var(--coral)' }}>{base.months} mo</p>
                    <p className="fin" style={{ fontSize: 12, color: 'var(--ink-mute)' }}>₹{(+base.total_interest).toLocaleString('en-IN')} interest</p>
                  </div>
                  <div style={{ flex: '1 1 140px' }}>
                    <p style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Accelerated</p>
                    <p className="fin" style={{ fontSize: 24, fontWeight: 700, color: 'var(--emerald)' }}>{res.months} mo</p>
                    <p className="fin" style={{ fontSize: 12, color: 'var(--ink-mute)' }}>₹{(+res.total_interest).toLocaleString('en-IN')} interest</p>
                  </div>
                </div>
                <div className="card" style={{ padding: '16px 18px', background: 'var(--surface-2)', marginBottom: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Balance over time</p>
                  <Chart data={base.schedule.map((s, i) => ({ ...s, baseline: s.balance, accelerated: accelerated.schedule[i]?.balance ?? null }))}
                    xKey="month" series={[
                      { key: 'baseline', name: 'Current', color: 'var(--coral)' },
                      { key: 'accelerated', name: 'Accelerated', color: 'var(--emerald)' },
                    ]} height={200} />
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: 10, color: 'var(--coral)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ display: 'inline-block', width: 12, height: 2, background: 'var(--coral)' }} /> Current
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ display: 'inline-block', width: 12, height: 2, background: 'var(--emerald)' }} /> Accelerated
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>{base.months}mo</span>
                    <div style={{ width: '50%', maxWidth: 80, background: 'var(--coral)', borderRadius: '4px 4px 0 0', opacity: 0.7, height: '64px' }} />
                    <span style={{ fontSize: 9, color: 'var(--ink-mute)' }}>Current</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>{res.months}mo</span>
                    <div style={{ width: '50%', maxWidth: 80, background: 'var(--emerald)', borderRadius: '4px 4px 0 0', height: `${Math.min((res.months / base.months) * 64, 64)}px` }} />
                    <span style={{ fontSize: 9, color: 'var(--ink-mute)' }}>Extra</span>
                  </div>
                </div>
              </div>

              {res.schedule && (
                <div className="card" style={{ padding: '16px 18px', marginBottom: 12, overflowX: 'auto' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Monthly schedule</p>
                  <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: 'var(--ink-faint)', textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.05em' }}>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Month</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>Payment</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>Interest</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>Principal</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {res.schedule.slice(0, 60).map(s => (
                        <tr key={s.month}>
                          <td style={{ padding: '3px 8px', color: 'var(--ink-mute)' }}>{s.month}</td>
                          <td style={{ padding: '3px 8px', textAlign: 'right' }}>₹{s.payment.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '3px 8px', textAlign: 'right' }}>₹{s.interest.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '3px 8px', textAlign: 'right' }}>₹{s.principal.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '3px 8px', textAlign: 'right' }}>₹{s.balance.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                      {res.schedule.length > 60 && (
                        <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: 8, fontSize: 10 }}>… {res.schedule.length - 60} more months</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="card" style={{ padding: '16px 18px', borderTop: '2px solid var(--success)' }}>
                <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.01em' }}>You save</p>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</p>
                    <p className="fin" style={{ fontSize: 22, fontWeight: 700, color: 'var(--emerald)' }}>{monthsSaved} months</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Interest</p>
                    <p className="fin" style={{ fontSize: 22, fontWeight: 700, color: 'var(--emerald)' }}>₹{interestSaved.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
