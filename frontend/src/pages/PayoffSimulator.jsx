import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Input, Select, Textarea, InputField, Button, Card, EmptyState, Table, PageHeader, Progress, Skeleton, fmtINR } from '../components/ui'
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
  }, [debts, selectedId, simulate, baseline, simulating])

  if (loading) return <Skeleton style={{ height: 200 }} />

  const selected = debts.find(d => d.id === +selectedId)
  const base = baseline
  const res = result
  const monthsSaved = base && res ? base.months - res.months : 0
  const interestSaved = base && res ? +base.total_interest - +res.total_interest : 0
  const filtered = search ? debts.filter(d => d.name.toLowerCase().includes(search.toLowerCase())) : debts

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHeader
        title="Payoff Simulator"
        num="005 / 016"
      >
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>See how extra payments affect your debt-free date.</p>
      </PageHeader>

      {debts.length === 0 ? (
        <EmptyState
          icon={<span aria-hidden="true" style={{ fontSize: 48, color: 'var(--border)' }}>◎</span>}
          title="No debts to simulate"
          action="View debts"
          onAction={() => window.location.href = '/dashboard/debts'}
        >
          Select a debt to simulate payoffs.
        </EmptyState>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          <Card>
            <Select
              value={selectedId}
              onChange={e => { setSelectedId(e.target.value); setBaseline(null); setResult(null) }}
              placeholder="Choose a debt…"
              options={filtered.map(d => ({ value: d.id, label: `${d.name} — ${fmtINR(+d.amount || 0)} @ ${d.interest_rate}%` }))}
            />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search debts…"
              style={{ maxWidth: 360 }}
            />
            {search && filtered.length === 0 && <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>No debts match "{search}"</p>}
          </Card>

          {selected && (
            <Card>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{selected.name}</p>
              <p style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                {fmtINR(+selected.amount || 0)} · {selected.interest_rate}% APR · EMI: {fmtINR(+selected.emi_amount || 0)}/mo
              </p>
            </Card>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <InputField label="Extra Monthly (₹)" type="number" value={extraPayment} onChange={e => setExtraPayment(e.target.value)} placeholder="0" min="0" style={{ maxWidth: 160 }} />
            <InputField label="Lump Sum (₹)" type="number" value={lumpSum} onChange={e => setLumpSum(e.target.value)} placeholder="0" min="0" style={{ maxWidth: 160 }} />
            <InputField label="Annual Extra (₹)" type="number" value={annualExtra} onChange={e => setAnnualExtra(e.target.value)} placeholder="0" min="0" style={{ maxWidth: 160 }} />
          </div>

          <Button onClick={simulate} disabled={!selectedId || simulating} loading={simulating}>
            {simulating ? 'Simulating…' : 'Simulate'}
          </Button>

          {res && base && (
            <div style={{ display: 'grid', gap: 16 }}>
              <Card>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Comparison</p>
                <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 140px' }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 3 }}>Current plan</p>
                    <p className="fin" style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>{base.months} mo</p>
                    <p className="fin" style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtINR(+base.total_interest)} interest</p>
                  </div>
                  <div style={{ flex: '1 1 140px' }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 3 }}>Accelerated</p>
                    <p className="fin" style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)' }}>{res.months} mo</p>
                    <p className="fin" style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtINR(+res.total_interest)} interest</p>
                  </div>
                </div>
                <div style={{ padding: '16px 18px', background: 'var(--surface)', borderRadius: 'var(--radius-md)', marginBottom: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Balance over time</p>
                  <Chart data={base.schedule.map((s, i) => ({ ...s, baseline: s.balance, accelerated: res.schedule[i]?.balance ?? null }))}
                    xKey="month" series={[
                      { key: 'baseline', name: 'Current', color: 'var(--accent)' },
                      { key: 'accelerated', name: 'Accelerated', color: 'var(--success)' },
                    ]} height={200} />
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: 10, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ display: 'inline-block', width: 12, height: 2, background: 'var(--accent)' }} /> Current
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ display: 'inline-block', width: 12, height: 2, background: 'var(--success)' }} /> Accelerated
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>{base.months}mo</span>
                    <Progress value={100} style={{ width: '50%', maxWidth: 80, height: 64 }} />
                    <span style={{ fontSize: 9, color: 'var(--muted)' }}>Current</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>{res.months}mo</span>
                    <Progress value={(res.months / base.months) * 100} style={{ width: '50%', maxWidth: 80, height: 64 }} />
                    <span style={{ fontSize: 9, color: 'var(--muted)' }}>Extra</span>
                  </div>
                </div>
              </Card>

              {res.schedule && (
                <Card>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Monthly schedule</p>
                  <Table
                    columns={[
                      { key: 'month', label: 'Month' },
                      { key: 'payment', label: 'Payment', align: 'right' },
                      { key: 'interest', label: 'Interest', align: 'right' },
                      { key: 'principal', label: 'Principal', align: 'right' },
                      { key: 'balance', label: 'Balance', align: 'right' },
                    ]}
                    rows={res.schedule.slice(0, 60).map(s => ({
                      id: s.month,
                      cells: {
                        month: s.month,
                        payment: fmtINR(s.payment),
                        interest: fmtINR(s.interest),
                        principal: fmtINR(s.principal),
                        balance: fmtINR(s.balance),
                      },
                    }))}
                    ariaLabel="Monthly payment schedule"
                  />
                  {res.schedule.length > 60 && (
                    <p style={{ textAlign: 'center', color: 'var(--muted)', padding: 8, fontSize: 10 }}>… {res.schedule.length - 60} more months</p>
                  )}
                </Card>
              )}

              <Card style={{ borderTop: '2px solid var(--success)' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>You save</p>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Time</p>
                    <p className="fin" style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)' }}>{monthsSaved} months</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Interest</p>
                    <p className="fin" style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)' }}>{fmtINR(interestSaved)}</p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  )
}