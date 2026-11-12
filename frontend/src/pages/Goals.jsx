import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'
import { CHART_COLORS, PIE_COLORS, AXIS_DEFAULTS, GRID_DEFAULTS, fmtINR, ChartTooltip } from '../lib/chartTheme'
import { Card, Button, Badge, Skeleton, EmptyState, PageHeader, Input, Select, Progress, InputField } from '../components/ui'
import { Reveal } from '../lib/motion-primitives'

const ALLOCATIONS = ['conservative', 'moderate', 'aggressive']
const TOP_UP_OPTIONS = ['none', 'monthly', 'quarterly', 'yearly']

function formatINR(n) {
  return fmtINR(n)
}

export default function Goals() {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetchGoals = () => {
    api.request('/api/v1/goals').then(d => setGoals(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { fetchGoals() }, [])

  const openNew = () => setForm({
    name: '', target_amount: '', target_year: new Date().getFullYear() + 5,
    currency_code: 'INR', monthly_sip: '', top_up_amount: 0, top_up_frequency: 'none',
    allocation: 'moderate', equity_growth: 12, debt_growth: 7, gold_growth: 8,
  })

  const openEdit = (g) => setForm({ ...g, id: g.id })

  const saveGoal = async () => {
    if (!form.name || !form.target_amount || !form.monthly_sip) return
    setSaving(true)
    try {
      const payload = { ...form, target_amount: +form.target_amount, target_year: +form.target_year,
        monthly_sip: +form.monthly_sip, top_up_amount: +form.top_up_amount || 0,
        equity_growth: +form.equity_growth, debt_growth: +form.debt_growth, gold_growth: +form.gold_growth }
      if (form.id) {
        await api.request(`/api/v1/goals/${form.id}`, { method: 'PUT', body: JSON.stringify({ goal: payload }) })
      } else {
        await api.request('/api/v1/goals', { method: 'POST', body: JSON.stringify({ goal: payload }) })
      }
      setForm(null)
      fetchGoals()
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  const deleteGoal = async (g) => {
    if (!confirm(`Delete "${g.name}"?`)) return
    await api.request(`/api/v1/goals/${g.id}`, { method: 'DELETE' }).then(fetchGoals).catch(e => alert(e.message))
  }

  if (loading) return (
    <div className="space-y-2">
      {[1, 2].map(i => <Skeleton key={i} className="skeleton-card" />)}
    </div>
  )

  return (
    <div className="space-y-5">
      <Reveal delay={0}>
        <PageHeader
          title="Goals"
          num="013 / 016"
          action={<Button onClick={openNew}>+ Add</Button>}
        >
          <p className="text-sm text-muted">Plan and track your savings goals.</p>
        </PageHeader>
      </Reveal>

      {goals.length === 0 && !form && (
        <Reveal delay={100}>
          <EmptyState
            icon={<span aria-hidden="true" className="text-5xl text-border">◎</span>}
            title="No goals yet"
            action="+ Add Goal"
            onAction={openNew}
          >
            Set a savings goal to see projected growth and risk comparisons.
          </EmptyState>
        </Reveal>
      )}

      {goals.length > 0 && !form && (
        <Reveal delay={100}>
          <div className="space-y-3">
            {goals.map((g, index) => {
              const preset = { conservative: { equity: 30, debt: 50, gold: 20 }, moderate: { equity: 50, debt: 30, gold: 20 }, aggressive: { equity: 70, debt: 20, gold: 10 } }
              const alloc = preset[g.allocation]
              const progressPct = g.final_corpus && g.target_amount ? Math.min(100, (g.final_corpus / g.target_amount) * 100) : 0
              const onTrack = progressPct >= 100

              return (
                <Card key={g.id} className="card-shell card-core--pad-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-lg font-semibold text-ink">{g.name}</p>
                      <p className="text-sm text-muted">Target {formatINR(g.target_amount)} by {g.target_year} · {g.allocation}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(g)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteGoal(g)} className="text-faint">Delete</Button>
                    </div>
                  </div>

                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-3 mb-2">
                    <div>
                      <p className="text-2xs font-semibold uppercase tracking-wider text-muted">Monthly SIP</p>
                      <p className="fin text-base">{formatINR(g.monthly_sip)}/mo</p>
                    </div>
                    <div>
                      <p className="text-2xs font-semibold uppercase tracking-wider text-muted">Projected Corpus</p>
                      <p className="fin text-base font-semibold {onTrack ? 'text-success' : 'text-ink'}">{formatINR(g.final_corpus)}</p>
                    </div>
                    <div>
                      <p className="text-2xs font-semibold uppercase tracking-wider text-muted">Blended CAGR</p>
                      <p className="fin text-base">{g.risk_comparison?.[g.allocation]?.blended_cagr || 0}%</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted">{formatINR(g.target_amount)} target</span>
                      <span className={`font-medium ${onTrack ? 'text-success' : 'text-danger'}`}>{progressPct.toFixed(0)}%</span>
                    </div>
                    <Progress value={Math.min(progressPct, 100)} variant={onTrack ? 'success' : 'danger'} />
                  </div>

                  {alloc && (
                    <div className="flex gap-1 flex-wrap mb-2">
                      <Badge variant="neutral" className="text-[10px]">Equity {alloc.equity}%</Badge>
                      <Badge variant="neutral" className="text-[10px]">Debt {alloc.debt}%</Badge>
                      <Badge variant="neutral" className="text-[10px]">Gold {alloc.gold}%</Badge>
                    </div>
                  )}

                  {g.projection && g.projection.length > 1 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-muted mb-2">Corpus Projection vs Target</p>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={g.projection} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                          <CartesianGrid {...GRID_DEFAULTS} strokeDasharray="3 3" />
                          <XAxis dataKey="year" {...AXIS_DEFAULTS.tick} />
                          <YAxis {...AXIS_DEFAULTS.tick} tickFormatter={v => formatINR(v)} width={60} />
                          <Tooltip content={<ChartTooltip />} />
                          <Line type="monotone" dataKey="goal_target" stroke="var(--muted)" strokeDasharray="5 5" dot={false} name="Target" />
                          <Line type="monotone" dataKey="projected_corpus" stroke="var(--accent)" dot={{ r: 2 }} name="Projected" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {g.risk_comparison && Object.keys(g.risk_comparison).length > 1 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-muted mb-2">Risk Mix Comparison</p>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={(() => {
                          const years = [...new Set(Object.values(g.risk_comparison).flatMap(r => r.points.map(p => p.year)))].sort()
                          return years.map(y => {
                            const row = { year: y }
                            Object.entries(g.risk_comparison).forEach(([name, r]) => {
                              const pt = r.points.find(p => p.year === y)
                              row[name] = pt ? pt.projected_corpus : 0
                            })
                            return row
                          })
                        })()} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                          <CartesianGrid {...GRID_DEFAULTS} strokeDasharray="3 3" />
                          <XAxis dataKey="year" {...AXIS_DEFAULTS.tick} />
                          <YAxis {...AXIS_DEFAULTS.tick} tickFormatter={v => formatINR(v)} width={60} />
                          <Tooltip content={<ChartTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          {ALLOCATIONS.map(name => (
                            <Line key={name} type="monotone" dataKey={name} stroke={CHART_COLORS[name]} dot={false} strokeWidth={name === g.allocation ? 2.5 : 1.5} name={name.charAt(0).toUpperCase() + name.slice(1)} />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {alloc && (
                    <div className="flex items-center gap-3 mt-2">
                      <p className="text-xs font-semibold">Allocation</p>
                      <ResponsiveContainer width={100} height={100}>
                        <PieChart>
                          <Pie data={[{ name: 'Equity', value: alloc.equity }, { name: 'Debt', value: alloc.debt }, { name: 'Gold', value: alloc.gold }]}
                            dataKey="value" cx="50%" cy="50%" outerRadius={38} innerRadius={22}>
                            {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="text-xs text-ink-soft leading-relaxed">
                        <p>Equity {alloc.equity}% · Debt {alloc.debt}% · Gold {alloc.gold}%</p>
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </Reveal>
      )}

      {form && (
        <Reveal delay={0}>
          <Card className="card-shell card-core--pad-xl">
            <h2 className="text-base font-semibold mb-3">{form.id ? 'Edit Goal' : 'New Goal'}</h2>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <InputField label="Goal Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Retirement Corpus" />
              <InputField label="Target Amount (₹)" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} placeholder="5000000" type="number" />
              <InputField label="Target Year" value={form.target_year} onChange={e => setForm({ ...form, target_year: e.target.value })} type="number" />
              <InputField label="Monthly SIP (₹)" value={form.monthly_sip} onChange={e => setForm({ ...form, monthly_sip: e.target.value })} placeholder="25000" type="number" />
              <InputField label="Top-up Amount (₹)" value={form.top_up_amount} onChange={e => setForm({ ...form, top_up_amount: e.target.value })} type="number" />
              <Select value={form.top_up_frequency} onChange={e => setForm({ ...form, top_up_frequency: e.target.value })} options={TOP_UP_OPTIONS.map(f => ({ value: f, label: f === 'none' ? 'None' : f.charAt(0).toUpperCase() + f.slice(1) }))} placeholder="Top-up Frequency" />
              <Select value={form.allocation} onChange={e => setForm({ ...form, allocation: e.target.value })} options={ALLOCATIONS.map(a => ({ value: a, label: a.charAt(0).toUpperCase() + a.slice(1) }))} placeholder="Allocation" />
              <Select value={form.currency_code} onChange={e => setForm({ ...form, currency_code: e.target.value })} options={['INR', 'USD', 'EUR', 'GBP', 'JPY'].map(c => ({ value: c, label: c }))} placeholder="Currency" />
            </div>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 mt-3">
              <InputField label="Equity Growth %" value={form.equity_growth} onChange={e => setForm({ ...form, equity_growth: e.target.value })} type="number" step="0.1" />
              <InputField label="Debt Growth %" value={form.debt_growth} onChange={e => setForm({ ...form, debt_growth: e.target.value })} type="number" step="0.1" />
              <InputField label="Gold Growth %" value={form.gold_growth} onChange={e => setForm({ ...form, gold_growth: e.target.value })} type="number" step="0.1" />
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={saveGoal} loading={saving} disabled={saving}>{saving ? 'Saving…' : form.id ? 'Update' : 'Create'}</Button>
              <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
            </div>
          </Card>
        </Reveal>
      )}
    </div>
  )
}