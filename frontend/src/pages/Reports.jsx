import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Card, Skeleton, PageHeader, Tabs, Badge, fmtINR, Stat, Progress } from '../components/ui'
import { Reveal } from '../lib/motion-primitives'

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
    <Reveal delay={0}>
      <Card className="card-shell card-core--pad-lg">
        <p className="label-caps mb-1">{now.toLocaleString('default', { month: 'long', year: 'numeric' })} spend</p>
        {loading ? <Skeleton className="skeleton-card h-48" /> : (
          <>
            <div className="grid grid-cols-7 gap-1 text-center">
              {labels.map(l => <div key={l} className="text-[10px] text-muted py-0.5">{l}</div>)}
              {Array.from({ length: firstDow }, (_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const c = intensity(day)
                const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                return (
                  <div key={day}
                    title={daily[key] ? `₹${daily[key].toLocaleString('en-IN')}` : ''}
                    className="aspect-square rounded-lg flex items-center justify-center text-[10px] text-muted"
                    style={{ background: c.bg, opacity: c.opacity }}
                  >{day}</div>
                )
              })}
            </div>
            <div className="flex items-center gap-2 justify-end mt-3">
              <span className="text-[10px] text-muted">Less</span>
              {[0.15, 0.3, 0.5, 0.7, 0.9].map(o => (
                <span key={o} className="w-3 h-3 rounded-sm" style={{ background: 'var(--accent)', opacity: o }} />
              ))}
              <span className="text-[10px] text-muted">More</span>
            </div>
          </>
        )}
      </Card>
    </Reveal>
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
    <Reveal delay={0}>
      <Skeleton className="skeleton-card h-48" />
    </Reveal>
  )

  return (
    <div className="space-y-5">
      <Reveal delay={0}>
        <PageHeader
          title="Reports"
          num="015 / 016"
        >
          <p className="text-sm text-muted">Annual summaries, cash flow forecasts, and anomaly detection.</p>
        </PageHeader>
      </Reveal>

      <Reveal delay={50}>
        <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
      </Reveal>

      <Reveal delay={100}>
        {activeTab === 'annual' && annual && (
          <div className="space-y-4">
            <Card className="card-shell card-core--pad-lg">
              <p className="label-caps mb-1">{annual.year} Summary</p>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mt-2">
                <Stat label="Income" value={fmtINR(+annual.summary?.total_income || 0)} />
                <Stat label="Expenses" value={fmtINR(+annual.summary?.total_expenses || 0)} />
                <Stat label="Net Savings" value={fmtINR(+annual.summary?.net_savings || 0)} />
                <Stat label="Savings Rate" value={Number(annual.summary?.savings_rate || 0).toFixed(1) + '%'} />
              </div>
            </Card>
            {annual.net_worth_trajectory?.length > 0 && (
              <Card className="card-shell card-core--pad-lg">
                <p className="text-sm font-semibold text-ink mb-2">Net Worth Trajectory</p>
                <div className="space-y-1">
                  {annual.net_worth_trajectory.slice(0, 12).map((pt, i) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-b border-border-soft last:border-0">
                      <span className="text-muted">{pt.date}</span>
                      <span className="fin font-medium">{fmtINR(+pt.net_worth || 0)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {annual.categories?.length > 0 && (
              <Card className="card-shell card-core--pad-lg">
                <p className="text-sm font-semibold text-ink mb-2">Spending by Category</p>
                <div className="space-y-1">
                  {annual.categories.map((c, i) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-b border-border-soft last:border-0">
                      <span>{c.category}</span>
                      <span className="fin">{fmtINR(+c.total || 0)} ({(+c.percentage || 0).toFixed(1)}%)</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'heatmap' && <CalendarHeatmap />}

        {activeTab === 'forecast' && forecast && (
          <div className="space-y-4">
            <Card className="card-shell card-core--pad-lg">
              <p className="label-caps mb-1">Cash Flow Health</p>
              <Badge variant={forecast.summary?.health === 'healthy' ? 'success' : 'accent'} className="text-xs mb-2">
                {forecast.summary?.health}
              </Badge>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mt-2">
                <Stat label="Monthly Income" value={fmtINR(+forecast.summary?.monthly_income || 0)} />
                <Stat label="Monthly Expenses" value={fmtINR(+forecast.summary?.monthly_expenses || 0)} />
                <Stat label="Net Monthly" value={fmtINR(+forecast.summary?.net_monthly || 0)} />
                <Stat label="Runway" value={forecast.summary?.runway_months + ' months'} />
              </div>
            </Card>
            {forecast.forecast?.length > 0 && (
              <Card className="card-shell card-core--pad-lg">
                <p className="text-sm font-semibold text-ink mb-2">Forecast</p>
                <div className="space-y-1">
                  {forecast.forecast.slice(0, 6).map((f, i) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-b border-border-soft last:border-0">
                      <span className="text-muted">{f.label}</span>
                      <span className={`fin ${(+f.net_cash_flow || 0) >= 0 ? 'text-success' : 'text-accent'}`}>
                        {fmtINR(+f.net_cash_flow || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'anomalies' && anomalies && (
          <div className="space-y-4">
            <Card className="card-shell card-core--pad-lg">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <Stat label="Total" value={anomalies.total_anomalies} />
                <Stat label="Critical" value={anomalies.critical} />
                <Stat label="Warnings" value={anomalies.warnings} />
              </div>
            </Card>
            {anomalies.anomalies?.length > 0 && anomalies.anomalies.map((a, i) => (
              <Reveal key={i} delay={i * 30}>
                <Card className="card-shell card-core--pad-base border-l-3" style={{ borderLeftColor: a.severity >= 7 ? 'var(--accent)' : a.severity >= 4 ? '#d4a017' : 'var(--faint)' }}>
                  <p className="text-base font-medium text-ink">{a.title}</p>
                  <p className="text-sm text-muted mt-1">{a.description}</p>
                  <p className="text-xs text-faint mt-2">{a.date} · severity {a.severity}/10</p>
                </Card>
              </Reveal>
            ))}
          </div>
        )}

        {activeTab === 'goals' && goalCharts && (
          <div className="space-y-4">
            {goalCharts.debt_free_progress && (
              <Card className="card-shell card-core--pad-base">
                <p className="text-sm font-semibold text-ink mb-1">Debt Free Progress</p>
                <Progress value={Math.min(+goalCharts.debt_free_progress.progress_pct || 0, 100)} variant="success" label="Debt freedom progress" />
                <div className="flex justify-between text-xs text-muted mt-2">
                  <span>{fmtINR(+goalCharts.debt_free_progress.paid_so_far || 0)} paid</span>
                  <span>{fmtINR(+goalCharts.debt_free_progress.remaining || 0)} left</span>
                </div>
              </Card>
            )}
          </div>
        )}
      </Reveal>
    </div>
  )
}