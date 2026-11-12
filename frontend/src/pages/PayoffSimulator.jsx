import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { InputField, Button, Card, EmptyState, Table, PageHeader, Progress, Skeleton, fmtINR, Select } from '../components/ui'
import Chart from '../components/Chart'
import { Reveal } from '../lib/motion-primitives'

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

  if (loading) return (
    <Reveal delay={0}>
      <Skeleton className="skeleton-card h-48" />
    </Reveal>
  )

  const selected = debts.find(d => d.id === +selectedId)
  const base = baseline
  const res = result
  const monthsSaved = base && res ? base.months - res.months : 0
  const interestSaved = base && res ? +base.total_interest - +res.total_interest : 0
  const filtered = search ? debts.filter(d => d.name.toLowerCase().includes(search.toLowerCase())) : debts

  return (
    <div className="space-y-5">
      <Reveal delay={0}>
        <PageHeader
          title="Payoff Simulator"
          num="005 / 016"
        >
          <p className="text-sm text-muted">See how extra payments affect your debt-free date.</p>
        </PageHeader>
      </Reveal>

      {debts.length === 0 ? (
        <Reveal delay={50}>
          <EmptyState
            icon={<span aria-hidden="true" className="text-5xl text-border">◎</span>}
            title="No debts to simulate"
            action="View debts"
            onAction={() => window.location.href = '/dashboard/debts'}
          >
            Select a debt to simulate payoffs.
          </EmptyState>
        </Reveal>
      ) : (
        <div className="space-y-4">
          <Reveal delay={50}>
            <Card className="card-shell card-core--pad-base">
              <div className="flex gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Select
                    value={selectedId}
                    onChange={e => { setSelectedId(e.target.value); setBaseline(null); setResult(null) }}
                    placeholder="Choose a debt…"
                    options={filtered.map(d => ({ value: d.id, label: `${d.name} — ${fmtINR(+d.amount || 0)} @ ${d.interest_rate}%` }))}
                  />
                </div>
                <div className="min-w-[200px]">
                  <InputField label="Search">
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search debts…"
                      className="input"
                    />
                  </InputField>
                </div>
              </div>
              {search && filtered.length === 0 && <p className="text-xs text-muted mt-2">No debts match "{search}"</p>}
            </Card>
          </Reveal>

          <Reveal delay={100}>
            {selected && (
              <Card className="card-shell card-core--pad-base">
                <p className="text-sm font-semibold text-ink mb-1">{selected.name}</p>
                <p className="text-sm text-muted">{fmtINR(+selected.amount || 0)} · {selected.interest_rate}% APR · EMI: {fmtINR(+selected.emi_amount || 0)}/mo</p>
              </Card>
            )}
          </Reveal>

          <Reveal delay={150}>
            <div className="flex gap-2 flex-wrap">
              <InputField label="Extra Monthly (₹)" type="number" value={extraPayment} onChange={e => setExtraPayment(e.target.value)} placeholder="0" min="0" style={{ maxWidth: 160 }} />
              <InputField label="Lump Sum (₹)" type="number" value={lumpSum} onChange={e => setLumpSum(e.target.value)} placeholder="0" min="0" style={{ maxWidth: 160 }} />
              <InputField label="Annual Extra (₹)" type="number" value={annualExtra} onChange={e => setAnnualExtra(e.target.value)} placeholder="0" min="0" style={{ maxWidth: 160 }} />
            </div>
          </Reveal>

          <Reveal delay={200}>
            <Button onClick={simulate} disabled={!selectedId || simulating} loading={simulating} className="w-full sm:w-auto">
              {simulating ? 'Simulating…' : 'Simulate'}
            </Button>
          </Reveal>

          {res && base && (
            <div className="space-y-4">
              <Reveal delay={250}>
                <Card className="card-shell card-core--pad-lg">
                  <p className="text-sm font-semibold text-ink mb-3">Comparison</p>
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 mb-3">
                    <div className="card-shell card-core--pad-base">
                      <span className="label-caps">Current plan</span>
                      <p className="fin font-display text-2xl font-bold text-accent mt-1">{base.months} mo</p>
                      <p className="fin text-sm text-muted">{fmtINR(+base.total_interest)} interest</p>
                    </div>
                    <div className="card-shell card-core--pad-base">
                      <span className="label-caps">Accelerated</span>
                      <p className="fin font-display text-2xl font-bold text-success mt-1">{res.months} mo</p>
                      <p className="fin text-sm text-muted">{fmtINR(+res.total_interest)} interest</p>
                    </div>
                  </div>
                  <div className="card-shell card-core--pad-base mb-3">
                    <p className="text-sm font-semibold text-ink mb-2">Balance over time</p>
                    <Chart data={base.schedule.map((s, i) => ({ ...s, baseline: s.balance, accelerated: res.schedule[i]?.balance ?? null }))}
                      xKey="month" series={[
                        { key: 'baseline', name: 'Current', color: 'var(--accent)' },
                        { key: 'accelerated', name: 'Accelerated', color: 'var(--success)' },
                      ]} height={200} />
                    <div className="flex gap-4 justify-center mt-2">
                      <span className="text-xs text-accent flex items-center gap-1">
                        <span className="inline-block w-3 h-0.5 bg-accent" /> Current
                      </span>
                      <span className="text-xs text-success flex items-center gap-1">
                        <span className="inline-block w-3 h-0.5 bg-success" /> Accelerated
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-muted">{base.months}mo</span>
                      <Progress value={100} className="w-20 max-w-[80px] h-16" />
                      <span className="text-[10px] text-muted">Current</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-muted">{res.months}mo</span>
                      <Progress value={(res.months / base.months) * 100} className="w-20 max-w-[80px] h-16" />
                      <span className="text-[10px] text-muted">Extra</span>
                    </div>
                  </div>
                </Card>
              </Reveal>

              <Reveal delay={300}>
                {res.schedule && (
                  <Card className="card-shell card-core--pad-lg">
                    <p className="text-sm font-semibold text-ink mb-2">Monthly schedule</p>
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
                      <p className="text-center text-muted text-xs py-2">… {res.schedule.length - 60} more months</p>
                    )}
                  </Card>
                )}
              </Reveal>

              <Reveal delay={350}>
                <Card className="card-shell card-shell--elevated card-core--pad-lg border-t-3 border-t-success">
                  <p className="text-sm font-semibold text-ink mb-2">You save</p>
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex-1 min-w-[120px]">
                      <span className="label-caps">Time</span>
                      <p className="fin font-display text-2xl font-bold text-success mt-1">{monthsSaved} months</p>
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <span className="label-caps">Interest</span>
                      <p className="fin font-display text-2xl font-bold text-success mt-1">{fmtINR(interestSaved)}</p>
                    </div>
                  </div>
                </Card>
              </Reveal>
            </div>
          )}
        </div>
      )}
    </div>
  )
}