import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Card, Skeleton, PageHeader, Tabs, Progress, Badge, fmtINR, Stat } from '../components/ui'

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
    if (amt === 0) return { bg: 'var(--border-soft)', opacity: 0.3 }
    const pct = amt / max
    return { bg: 'var(--accent)', opacity: 0.15 + pct * 0.75 }
  }

  return (
    <Card style={{ padding: '16px 18px' }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>
        {now.toLocaleString('default', { month: 'long', year: 'numeric' })} spend
      </p>
      {loading ? <Skeleton style={{ height: 200 }} /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
            {labels.map(l => <div key={l} style={{ fontSize: 9, color: 'var(--muted)', padding: '2px 0' }}>{l}</div>)}
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
                    fontSize: 9, color: 'var(--muted)',
                  }}>{day}</div>
              )
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginTop: 8 }}>
            <span style={{ fontSize: 9, color: 'var(--muted)' }}>Less</span>
            {[0.15, 0.3, 0.5, 0.7, 0.9].map(o => (
              <span key={o} style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--accent)', opacity: o, display: 'inline-block' }} />
            ))}
            <span style={{ fontSize: 9, color: 'var(--muted)' }}>More</span>
          </div>
        </>
      )}
    </Card>
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

  if (loading) return <Skeleton style={{ height: 200, borderRadius: 'var(--radius-md)' }} />

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHeader
        title="Reports"
        num="015 / 016"
      >
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Annual summaries, cash flow forecasts, and anomaly detection.</p>
      </PageHeader>

      <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />

      {activeTab === 'annual' && annual && (
        <div style={{ display: 'grid', gap: 16 }}>
          <Card>
            <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>{annual.year} Summary</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 8 }}>
              <Stat label="Income" value={fmtINR(+annual.summary?.total_income || 0)} />
              <Stat label="Expenses" value={fmtINR(+annual.summary?.total_expenses || 0)} />
              <Stat label="Net Savings" value={fmtINR(+annual.summary?.net_savings || 0)} />
              <Stat label="Savings Rate" value={Number(annual.summary?.savings_rate || 0).toFixed(1) + '%'} />
            </div>
          </Card>
          {annual.net_worth_trajectory?.length > 0 && (
            <Card>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Net Worth Trajectory</p>
              {annual.net_worth_trajectory.slice(0, 12).map((pt, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: '1px solid var(--border-soft)' }}>
                  <span style={{ color: 'var(--muted)' }}>{pt.date}</span>
                  <span className="fin" style={{ fontWeight: 500 }}>{fmtINR(+pt.net_worth || 0)}</span>
                </div>
              ))}
            </Card>
          )}
          {annual.categories?.length > 0 && (
            <Card>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Spending by Category</p>
              {annual.categories.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border-soft)' }}>
                  <span>{c.category}</span>
                  <span className="fin">{fmtINR(+c.total || 0)} ({(+c.percentage || 0).toFixed(1)}%)</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {activeTab === 'heatmap' && <CalendarHeatmap />}

      {activeTab === 'forecast' && forecast && (
        <div style={{ display: 'grid', gap: 16 }}>
          <Card>
            <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>Cash Flow Health</p>
            <Badge variant={forecast.summary?.health === 'healthy' ? 'success' : 'accent'} style={{ fontSize: 11, marginBottom: 8 }}>
              {forecast.summary?.health}
            </Badge>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 8 }}>
              <Stat label="Monthly Income" value={fmtINR(+forecast.summary?.monthly_income || 0)} />
              <Stat label="Monthly Expenses" value={fmtINR(+forecast.summary?.monthly_expenses || 0)} />
              <Stat label="Net Monthly" value={fmtINR(+forecast.summary?.net_monthly || 0)} />
              <Stat label="Runway" value={forecast.summary?.runway_months + ' months'} />
            </div>
          </Card>
          {forecast.forecast?.length > 0 && (
            <Card>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Forecast</p>
              {forecast.forecast.slice(0, 6).map((f, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border-soft)' }}>
                  <span style={{ color: 'var(--muted)' }}>{f.label}</span>
                  <span className="fin" style={{ color: (+f.net_cash_flow || 0) >= 0 ? 'var(--success)' : 'var(--accent)' }}>
                    {fmtINR(+f.net_cash_flow || 0)}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {activeTab === 'anomalies' && anomalies && (
        <div style={{ display: 'grid', gap: 16 }}>
          <Card>
            <div style={{ display: 'flex', gap: 16 }}>
              <Stat label="Total" value={anomalies.total_anomalies} />
              <Stat label="Critical" value={anomalies.critical} />
              <Stat label="Warnings" value={anomalies.warnings} />
            </div>
          </Card>
          {anomalies.anomalies?.length > 0 && anomalies.anomalies.map((a, i) => (
            <Card key={i} style={{ padding: '12px 16px', borderLeft: `3px solid ${a.severity >= 7 ? 'var(--accent)' : a.severity >= 4 ? '#d4a017' : 'var(--faint)'}` }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{a.title}</p>
              <p style={{ fontSize: 11.5, color: 'var(--muted)' }}>{a.description}</p>
              <p style={{ fontSize: 11, color: 'var(--faint)', marginTop: 3 }}>{a.date} · severity {a.severity}/10</p>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'goals' && goalCharts && (
        <div style={{ display: 'grid', gap: 16 }}>
          {goalCharts.debt_free_progress && (
            <Card style={{ padding: '14px 18px' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Debt Free Progress</p>
              <Progress value={Math.min(+goalCharts.debt_free_progress.progress_pct || 0, 100)} variant="success" label="Debt freedom progress" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                <span>{fmtINR(+goalCharts.debt_free_progress.paid_so_far || 0)} paid</span>
                <span>{fmtINR(+goalCharts.debt_free_progress.remaining || 0)} left</span>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}