import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'

const ALLOCATIONS = ['conservative', 'moderate', 'aggressive']
const TOP_UP_OPTIONS = ['none', 'monthly', 'quarterly', 'yearly']
const CHART_COLORS = { conservative: '#6366f1', moderate: '#f59e0b', aggressive: '#ef4444' }
const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981']

function formatINR(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })
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
    <div>
      {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 130, marginBottom: 8, borderRadius: 'var(--radius)' }} />)}
    </div>
  )

  return (
    <div>
      <p className="page-num" style={{ marginBottom: 4 }}>00<em>13</em> / 016</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>Goals</h1>
          <p style={{ fontSize: 13.5, color: 'var(--ink-mute)' }}>Plan and track your savings goals.</p>
        </div>
        <button onClick={openNew} className="btn btn-primary" style={{ fontSize: 12.5, padding: '7px 16px' }}>+ Add</button>
      </div>

      {goals.length === 0 && !form && (
        <div className="empty-state">
          <span className="emoji">◎</span>
          <p>No goals yet</p>
          <p style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Set a savings goal to see projected growth and risk comparisons.</p>
          <button onClick={openNew} className="btn btn-primary" style={{ marginTop: 12 }}>+ Add Goal</button>
        </div>
      )}

      {goals.length > 0 && !form && (
        <div>
          {goals.map(g => {
            const preset = { conservative: { equity: 30, debt: 50, gold: 20 }, moderate: { equity: 50, debt: 30, gold: 20 }, aggressive: { equity: 70, debt: 20, gold: 10 } }
            const alloc = preset[g.allocation]
            const progressPct = g.final_corpus && g.target_amount ? Math.min(100, (g.final_corpus / g.target_amount) * 100) : 0
            const onTrack = progressPct >= 100

            return (
              <div key={g.id} className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{g.name}</p>
                    <p style={{ fontSize: 11.5, color: 'var(--ink-mute)' }}>
                      Target {formatINR(g.target_amount)} by {g.target_year} · {g.allocation}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(g)} style={{ fontSize: 10.5, padding: '2px 8px', background: 'none', border: '1px solid var(--line)', borderRadius: 999, color: 'var(--ink-soft)', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => deleteGoal(g)} style={{ fontSize: 10.5, padding: '2px 8px', background: 'none', border: '1px solid var(--line)', borderRadius: 999, color: 'var(--ink-faint)', cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Monthly SIP</p>
                    <p className="fin" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{formatINR(g.monthly_sip)}/mo</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Projected Corpus</p>
                    <p className="fin" style={{ fontSize: 14, fontWeight: 600, color: onTrack ? 'var(--emerald)' : 'var(--ink)' }}>{formatINR(g.final_corpus)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Blended CAGR</p>
                    <p className="fin" style={{ fontSize: 14, fontWeight: 600 }}>{g.risk_comparison?.[g.allocation]?.blended_cagr || 0}%</p>
                  </div>
                </div>

                <div style={{ marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                    <span style={{ color: 'var(--ink-mute)' }}>{formatINR(g.target_amount)} target</span>
                    <span style={{ color: onTrack ? 'var(--emerald)' : 'var(--coral)', fontWeight: 500 }}>{progressPct.toFixed(0)}%</span>
                  </div>
                  <div className="progress" style={{ height: 6 }}>
                    <div className="progress-fill" style={{ width: `${Math.min(progressPct, 100)}%`, background: onTrack ? 'var(--emerald)' : 'var(--coral)' }} />
                  </div>
                </div>

                {alloc && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                    <span className="tag" style={{ fontSize: 10 }}>Equity {alloc.equity}%</span>
                    <span className="tag" style={{ fontSize: 10 }}>Debt {alloc.debt}%</span>
                    <span className="tag" style={{ fontSize: 10 }}>Gold {alloc.gold}%</span>
                  </div>
                )}

                {g.projection && g.projection.length > 1 && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Corpus Projection vs Target</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={g.projection}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                        <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--ink-mute)' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--ink-mute)' }} tickFormatter={v => formatINR(v)} width={60} />
                        <Tooltip formatter={v => formatINR(v)} contentStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="goal_target" stroke="#94a3b8" strokeDasharray="5 5" dot={false} name="Target" />
                        <Line type="monotone" dataKey="projected_corpus" stroke="var(--coral)" dot={{ r: 2 }} name="Projected" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {g.risk_comparison && Object.keys(g.risk_comparison).length > 1 && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Risk Mix Comparison</p>
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
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                        <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--ink-mute)' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--ink-mute)' }} tickFormatter={v => formatINR(v)} width={60} />
                        <Tooltip formatter={v => formatINR(v)} contentStyle={{ fontSize: 11 }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        {ALLOCATIONS.map(name => (
                          <Line key={name} type="monotone" dataKey={name} stroke={CHART_COLORS[name]} dot={false} strokeWidth={name === g.allocation ? 2.5 : 1.5} name={name.charAt(0).toUpperCase() + name.slice(1)} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {alloc && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 600 }}>Allocation</p>
                    <ResponsiveContainer width={100} height={100}>
                      <PieChart>
                        <Pie data={[{ name: 'Equity', value: alloc.equity }, { name: 'Debt', value: alloc.debt }, { name: 'Gold', value: alloc.gold }]}
                          dataKey="value" cx="50%" cy="50%" outerRadius={38} innerRadius={22}>
                          {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ fontSize: 10, color: 'var(--ink-mute)', lineHeight: 1.6 }}>
                      <p>Equity {alloc.equity}% · Debt {alloc.debt}% · Gold {alloc.gold}%</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {form && (
        <div className="card" style={{ padding: '18px 20px', marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{form.id ? 'Edit Goal' : 'New Goal'}</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500 }}>
              <span style={{ display: 'block', marginBottom: 4 }}>Goal Name</span>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Retirement Corpus" style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--paper-card)', fontSize: 13, boxSizing: 'border-box' }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 500 }}>
              <span style={{ display: 'block', marginBottom: 4 }}>Target Amount (₹)</span>
              <input type="number" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })}
                placeholder="5000000" style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--paper-card)', fontSize: 13, boxSizing: 'border-box' }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 500 }}>
              <span style={{ display: 'block', marginBottom: 4 }}>Target Year</span>
              <input type="number" value={form.target_year} onChange={e => setForm({ ...form, target_year: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--paper-card)', fontSize: 13, boxSizing: 'border-box' }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 500 }}>
              <span style={{ display: 'block', marginBottom: 4 }}>Monthly SIP (₹)</span>
              <input type="number" value={form.monthly_sip} onChange={e => setForm({ ...form, monthly_sip: e.target.value })}
                placeholder="25000" style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--paper-card)', fontSize: 13, boxSizing: 'border-box' }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 500 }}>
              <span style={{ display: 'block', marginBottom: 4 }}>Top-up Amount (₹)</span>
              <input type="number" value={form.top_up_amount} onChange={e => setForm({ ...form, top_up_amount: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--paper-card)', fontSize: 13, boxSizing: 'border-box' }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 500 }}>
              <span style={{ display: 'block', marginBottom: 4 }}>Top-up Frequency</span>
              <select value={form.top_up_frequency} onChange={e => setForm({ ...form, top_up_frequency: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--paper-card)', fontSize: 13, boxSizing: 'border-box' }}>
                {TOP_UP_OPTIONS.map(f => <option key={f} value={f}>{f === 'none' ? 'None' : f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, fontWeight: 500 }}>
              <span style={{ display: 'block', marginBottom: 4 }}>Allocation</span>
              <select value={form.allocation} onChange={e => setForm({ ...form, allocation: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--paper-card)', fontSize: 13, boxSizing: 'border-box' }}>
                {ALLOCATIONS.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, fontWeight: 500 }}>
              <span style={{ display: 'block', marginBottom: 4 }}>Currency</span>
              <select value={form.currency_code} onChange={e => setForm({ ...form, currency_code: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--paper-card)', fontSize: 13, boxSizing: 'border-box' }}>
                {['INR', 'USD', 'EUR', 'GBP', 'JPY'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500 }}>
              <span style={{ display: 'block', marginBottom: 4 }}>Equity Growth %</span>
              <input type="number" step="0.1" value={form.equity_growth} onChange={e => setForm({ ...form, equity_growth: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--paper-card)', fontSize: 13, boxSizing: 'border-box' }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 500 }}>
              <span style={{ display: 'block', marginBottom: 4 }}>Debt Growth %</span>
              <input type="number" step="0.1" value={form.debt_growth} onChange={e => setForm({ ...form, debt_growth: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--paper-card)', fontSize: 13, boxSizing: 'border-box' }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 500 }}>
              <span style={{ display: 'block', marginBottom: 4 }}>Gold Growth %</span>
              <input type="number" step="0.1" value={form.gold_growth} onChange={e => setForm({ ...form, gold_growth: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--paper-card)', fontSize: 13, boxSizing: 'border-box' }} />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={saveGoal} disabled={saving} className="btn btn-primary" style={{ fontSize: 12.5, padding: '7px 16px' }}>
              {saving ? 'Saving…' : form.id ? 'Update' : 'Create'}
            </button>
            <button onClick={() => setForm(null)} style={{ fontSize: 12.5, padding: '7px 16px', borderRadius: 999, border: '1px solid var(--line)', background: 'none', cursor: 'pointer', color: 'var(--ink-mute)' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
