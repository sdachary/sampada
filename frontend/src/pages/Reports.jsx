import { useState, useEffect } from 'react'
import { api } from '../lib/api'

function CalendarHeatmap() {
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  useEffect(() => {
    const start = new Date(year, month, 1).toISOString().slice(0, 10)
    const end = new Date(year, month + 1, 0).toISOString().slice(0, 10)
    api.request(`/api/v1/transactions?start_date=${start}&end_date=${end}`)
      .then(d => setTxns(Array.isArray(d?.transactions) ? d.transactions : []))
      .catch(() => {}).finally(() => setLoading(false))
  }, [year, month])

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow = new Date(year, month, 1).getDay()
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const daily = {}
  txns.filter(t => +t.amount > 0).forEach(t => {
    const d = t.date?.slice(0, 10)
    if (d) daily[d] = (daily[d] || 0) + Math.abs(+t.amount)
  })
  const amounts = Object.values(daily)
  const max = Math.max(...amounts, 1)

  function intensity(day) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const amt = daily[key] || 0
    if (amt === 0) return { bg: 'var(--line-soft)', opacity: 0.3 }
    const pct = amt / max
    return { bg: 'var(--coral)', opacity: 0.15 + pct * 0.75 }
  }

  return (
    <div>
      <div className="card" style={{ padding: '16px 18px' }}>
        <p style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          {now.toLocaleString('default', { month: 'long', year: 'numeric' })} spend
        </p>
        {loading ? <div className="skeleton" style={{ height: 200 }} /> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
              {labels.map(l => <div key={l} style={{ fontSize: 9, color: 'var(--ink-faint)', padding: '2px 0' }}>{l}</div>)}
              {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const c = intensity(day)
                return (
                  <div key={day}
                    title={daily[`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`]
                      ? `₹${daily[`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`].toLocaleString('en-IN')}`
                      : ''}
                    style={{
                      aspectRatio: '1', borderRadius: 6,
                      background: c.bg, opacity: c.opacity,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, color: 'var(--ink-mute)',
                    }}>{day}</div>
                )
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginTop: 8 }}>
              <span style={{ fontSize: 9, color: 'var(--ink-faint)' }}>Less</span>
              {[0.15, 0.3, 0.5, 0.7, 0.9].map(o => (
                <span key={o} style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--coral)', opacity: o, display: 'inline-block' }} />
              ))}
              <span style={{ fontSize: 9, color: 'var(--ink-faint)' }}>More</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Reports() {
  const [annual, setAnnual] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [anomalies, setAnomalies] = useState(null)
  const [goalCharts, setGoalCharts] = useState(null)
  const [activeTab, setActiveTab] = useState('annual')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.request('/api/v1/reports/annual'),
      api.request('/api/v1/reports/cash_flow_forecast'),
      api.request('/api/v1/reports/anomalies'),
      api.request('/api/v1/reports/goal_charts'),
    ]).then(([a, f, an, g]) => { setAnnual(a); setForecast(f); setAnomalies(an); setGoalCharts(g) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'annual', label: 'Annual' },
    { key: 'heatmap', label: 'Heatmap' },
    { key: 'forecast', label: 'Forecast' },
    { key: 'anomalies', label: 'Anomalies' },
    { key: 'goals', label: 'Goals' },
  ]

  if (loading) return (
    <div>
      <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius)', marginBottom: 10 }} />
    </div>
  )

  return (
    <div>
      <p className="page-num" style={{ marginBottom: 4 }}>00<em>15</em> / 016</p>
      <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Reports</h1>
      <p style={{ fontSize: 13.5, color: 'var(--ink-mute)', marginBottom: 16 }}>Annual summaries, cash flow forecasts, and anomaly detection.</p>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === t.key ? 600 : 400, color: activeTab === t.key ? 'var(--ink)' : 'var(--ink-mute)', borderBottom: activeTab === t.key ? '2px solid var(--coral)' : '2px solid transparent', marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'annual' && annual && (
        <div>
          <div className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
            <p style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{annual.year} Summary</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 8 }}>
              <div><span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>Income</span>
                <p className="fin" style={{ fontSize: 15, fontWeight: 600, color: 'var(--emerald)' }}>₹{(+annual.summary?.total_income || 0).toLocaleString('en-IN')}</p></div>
              <div><span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>Expenses</span>
                <p className="fin" style={{ fontSize: 15, fontWeight: 600, color: 'var(--coral)' }}>₹{(+annual.summary?.total_expenses || 0).toLocaleString('en-IN')}</p></div>
              <div><span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>Net Savings</span>
                <p className="fin" style={{ fontSize: 15, fontWeight: 600 }}>₹{(+annual.summary?.net_savings || 0).toLocaleString('en-IN')}</p></div>
              <div><span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>Savings Rate</span>
                <p style={{ fontSize: 15, fontWeight: 600 }}>{(+annual.summary?.savings_rate || 0).toFixed(1)}%</p></div>
            </div>
          </div>
          {annual.net_worth_trajectory?.length > 0 && (
            <div className="card" style={{ padding: '14px 18px', marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Net Worth Trajectory</p>
              {annual.net_worth_trajectory.slice(0, 12).map((pt, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: '1px solid var(--line-soft)' }}>
                  <span style={{ color: 'var(--ink-mute)' }}>{pt.date}</span>
                  <span className="fin" style={{ fontWeight: 500 }}>₹{(+pt.net_worth || 0).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
          {annual.categories?.length > 0 && (
            <div className="card" style={{ padding: '14px 18px' }}>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Spending by Category</p>
              {annual.categories.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--line-soft)' }}>
                  <span>{c.category}</span>
                  <span className="fin">₹{(+c.total || 0).toLocaleString('en-IN')} ({(+c.percentage || 0).toFixed(1)}%)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'heatmap' && <CalendarHeatmap />}

      {activeTab === 'forecast' && forecast && (
        <div>
          <div className="card" style={{ padding: '14px 18px', marginBottom: 12 }}>
            <p style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Cash Flow Health</p>
            <span className="tag" style={{ background: forecast.summary?.health === 'healthy' ? 'var(--emerald)' : 'var(--coral)', color: '#fff', fontSize: 11, marginBottom: 8, display: 'inline-block' }}>
              {forecast.summary?.health}
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 8 }}>
              <div><span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>Monthly Income</span>
                <p className="fin" style={{ fontSize: 14, fontWeight: 600, color: 'var(--emerald)' }}>₹{(+forecast.summary?.monthly_income || 0).toLocaleString('en-IN')}</p></div>
              <div><span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>Monthly Expenses</span>
                <p className="fin" style={{ fontSize: 14, fontWeight: 600, color: 'var(--coral)' }}>₹{(+forecast.summary?.monthly_expenses || 0).toLocaleString('en-IN')}</p></div>
              <div><span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>Net Monthly</span>
                <p className="fin" style={{ fontSize: 14, fontWeight: 600 }}>₹{(+forecast.summary?.net_monthly || 0).toLocaleString('en-IN')}</p></div>
              <div><span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>Runway</span>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{forecast.summary?.runway_months} months</p></div>
            </div>
          </div>
          {forecast.forecast?.length > 0 && (
            <div className="card" style={{ padding: '14px 18px' }}>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Forecast</p>
              {forecast.forecast.slice(0, 6).map((f, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--line-soft)' }}>
                  <span style={{ color: 'var(--ink-mute)' }}>{f.label}</span>
                  <span className="fin" style={{ color: (+f.net_cash_flow || 0) >= 0 ? 'var(--emerald)' : 'var(--coral)' }}>
                    ₹{(+f.net_cash_flow || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'anomalies' && anomalies && (
        <div>
          <div className="card" style={{ padding: '14px 18px', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div><span style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
                <p style={{ fontSize: 20, fontWeight: 600 }}>{anomalies.total_anomalies}</p></div>
              <div><span style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Critical</span>
                <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--coral)' }}>{anomalies.critical}</p></div>
              <div><span style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Warnings</span>
                <p style={{ fontSize: 20, fontWeight: 600, color: '#d4a017' }}>{anomalies.warnings}</p></div>
            </div>
          </div>
          {anomalies.anomalies?.length > 0 && anomalies.anomalies.map((a, i) => (
            <div key={i} className="card" style={{ padding: '12px 16px', marginBottom: 6, borderLeft: `3px solid ${a.severity >= 7 ? 'var(--coral)' : a.severity >= 4 ? '#d4a017' : 'var(--ink-faint)'}` }}>
              <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{a.title}</p>
              <p style={{ fontSize: 11.5, color: 'var(--ink-mute)' }}>{a.description}</p>
              <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 3 }}>{a.date} · severity {a.severity}/10</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'goals' && goalCharts && (
        <div>
          {goalCharts.debt_free_progress && (
            <div className="card" style={{ padding: '14px 18px', marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Debt Free Progress</p>
              <div className="progress" style={{ height: 8, marginBottom: 6 }}>
                <div className="progress-fill green" style={{ width: `${Math.min(+goalCharts.debt_free_progress.progress_pct || 0, 100)}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-mute)' }}>
                <span>₹{(+goalCharts.debt_free_progress.paid_so_far || 0).toLocaleString('en-IN')} paid</span>
                <span>₹{(+goalCharts.debt_free_progress.remaining || 0).toLocaleString('en-IN')} left</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
