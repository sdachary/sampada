import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Stat, Progress, Button, Card, Skeleton, EmptyState, ToastHost, toast, PageHeader } from '../components/ui'
import Chart from '../components/Chart'
import QuickLogSheet from '../components/QuickLogSheet'
import useOnline from '../lib/useOnline'
import { Plus, AlertCircle, CreditCard, ArrowUp } from 'lucide-react'
import { fmtINR } from '../lib/amounts'
import { Reveal } from '../lib/motion-primitives'

export default function Dashboard() {
  const { isOnline } = useOnline()
  const [data, setData] = useState(null)
  const [projection, setProjection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hideAmt, setHideAmt] = useState(true)
  const [quickOpen, setQuickOpen] = useState(false)

  // Keyboard shortcut: Alt+Q to open quick log
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.altKey && e.key === 'q') {
        e.preventDefault()
        setQuickOpen(true)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const load = useCallback(() => {
    return Promise.all([
      api.dashboard(),
      api.request('/api/v1/dashboard/projection'),
    ]).then(([d, p]) => { setData(d); setProjection(p) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // When we come back online, refresh the dashboard if it was stale offline.
  const wasOffline = useRef(!isOnline)
  useEffect(() => {
    if (isOnline && wasOffline.current) load()
    wasOffline.current = !isOnline
  }, [isOnline, load])

  const handleQuickSaved = () => {
    setQuickOpen(false)
    toast('Transaction logged ✓')
    load()
  }

  if (loading) return (
    <div className="space-y-5">
      <Skeleton className="skeleton-title" />
      <Skeleton className="skeleton-text w-64" />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="skeleton-card" />)}
      </div>
    </div>
  )

  function downloadSnapshot() {
    const nw = data?.net_worth ?? 0
    const stage = nw <= 0 ? 'Building Debt' : data?.debt_free_date ? 'Climbing to Zero' : 'Growing Wealth'
    const val = hideAmt ? '••••••' : fmtINR(nw)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340">
      <rect width="600" height="340" fill="var(--bg)" rx="16"/>
      <rect x="0" y="0" width="600" height="6" fill="var(--accent)"/>
      <text x="40" y="60" font-family="'Inter Tight',sans-serif" font-size="12" font-weight="600" fill="var(--muted)" letter-spacing="2">SAMPADA</text>
      <text x="40" y="90" font-family="'Inter Tight',sans-serif" font-size="11" fill="var(--muted)">Financial snapshot</text>
      <text x="40" y="160" font-family="'Inter Tight',sans-serif" font-size="13" fill="var(--muted)" letter-spacing="1">Net worth</text>
      <text x="40" y="210" font-family="'Inter Tight',sans-serif" font-size="40" font-weight="700" fill="var(--ink)" letter-spacing="-1">${val}</text>
      <rect x="40" y="230" width="60" height="3" fill="var(--accent)" rx="1.5"/>
      <text x="40" y="265" font-family="'Inter Tight',sans-serif" font-size="12" fill="var(--muted)">Stage: <tspan fill="var(--ink)">${stage}</tspan></text>
      ${data?.debt_free_date ? `<text x="40" y="290" font-family="'Inter Tight',sans-serif" font-size="12" fill="var(--muted)">Debt-free target: <tspan fill="var(--ink)">${data.debt_free_date}</tspan></text>` : ''}
      <text x="560" y="320" font-family="'Playfair Display',Georgia,serif" font-style="italic" font-size="13" fill="var(--muted)" text-anchor="end">sampada.app</text>
    </svg>`
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'sampada-snapshot.svg'
    a.click(); URL.revokeObjectURL(url)
  }

  const nw = data?.net_worth ?? 0
  const debt = data?.total_debt ?? 0
  const inv = data?.total_investments ?? 0
  const pct = debt + inv > 0 ? Math.round((inv / (debt + inv)) * 100) : 50
  const snapshots = data?.recent_snapshots ?? []

  // Debt freedom progress (0-100%)
  const debtFreePct = data?.debt_free_progress_pct ?? (debt > 0 ? Math.max(0, 100 - (debt / (nw + debt || 1)) * 100) : 100)

  return (
    <div className="space-y-6">
      <Reveal delay={0}>
        <PageHeader
          title="Dashboard"
          action={
            <Button variant="secondary" size="sm" onClick={downloadSnapshot}>
              Download snapshot
            </Button>
          }
        />
      </Reveal>

      <Reveal delay={50}>
        {/* Display options */}
        <Card className="card-shell card-shell--interactive card-core--pad-base">
          <div className="flex items-center justify-between">
            <p className="text-2xs font-semibold uppercase tracking-wider text-muted">Display</p>
            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
              <input type="checkbox" checked={hideAmt} onChange={() => setHideAmt(h => !h)} className="accent-accent" />
              Hide amounts
            </label>
          </div>
        </Card>
      </Reveal>

      <Reveal delay={100}>
        {/* Debt freedom progress — prominent, per spec */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-2xs font-semibold uppercase tracking-wider text-muted">Debt freedom progress</p>
            <p className="fin text-base font-semibold text-accent">{Math.round(debtFreePct)}%</p>
          </div>
          <Progress value={debtFreePct} label="Debt freedom progress" />
          {data?.debt_free_date && (
            <p className="text-sm text-muted">
              Projected debt-free by <span className="fin font-semibold text-ink">{data.debt_free_date}</span>
            </p>
          )}
        </div>
      </Reveal>

      <Reveal delay={150}>
        {/* Net worth hero */}
        <Card className="card-shell card-shell--elevated card-core--pad-lg">
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted mb-1">Net worth</p>
          <p className="fin font-display text-3xl font-bold tracking-tight leading-tight">{fmtINR(nw)}</p>
          {snapshots.length >= 2 && (() => {
            const prev = snapshots[snapshots.length - 2]?.net_worth || 0
            const change = nw - prev
            const pct = prev ? ((change / Math.abs(prev)) * 100).toFixed(1) : 0
            return (
              <p className={`text-sm font-medium mt-2 flex items-center gap-1 ${change >= 0 ? 'text-success' : 'text-danger'}`}>
                {change >= 0 ? '▲' : '▼'} {Math.abs(change) > 0 ? fmtINR(Math.abs(change)) : '0'} ({pct}%)
              </p>
            )
          })()}
        </Card>
      </Reveal>

      <Reveal delay={200}>
        {/* Stat grid */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total debt" value={fmtINR(debt)} countUp delta={data?.debt_delta} subtext={data?.debt_count > 0 ? `${data.debt_count} loan${data.debt_count > 1 ? 's' : ''}` : null} />
          <Stat label="Investments" value={fmtINR(inv)} countUp subtext={data?.portfolio_count > 0 ? `${data.portfolio_count} portfolio${data.portfolio_count > 1 ? 's' : ''}` : null} />
          <Stat label="Monthly expenses" value={fmtINR(data?.monthly_expenses || 0)} />
          <Stat label="Wealth score" value={(data?.wealth_score || 0).toFixed(1)} tooltip="Composite score (0–10) based on debt-to-income ratio, savings rate, investment diversity, and emergency fund coverage" />
        </div>
      </Reveal>

      <Reveal delay={250}>
        {/* Net worth area chart */}
        {snapshots.length > 1 ? (
          <Card className="card-shell card-core--pad-lg">
            <p className="label-caps mb-4">Net worth trend</p>
            <Chart data={snapshots} xKey="date" xFormatter={(d) => (d || '').slice(5)}
              series={[{ key: 'net_worth', name: 'Net worth', color: 'var(--accent)', area: true }]} />
          </Card>
        ) : (
          <EmptyState icon={<AlertCircle size={32} />} title="No net worth history yet" action="Add a transaction" onAction={() => setQuickOpen(true)}>
            Your first transaction will start the trend chart.
          </EmptyState>
        )}
      </Reveal>

      <Reveal delay={300}>
        {/* Projection chart */}
        {projection?.projection?.length > 1 ? (
          <Card className="card-shell card-core--pad-lg">
            <p className="label-caps mb-4">60-month projection</p>
            <div role="img" aria-label="60-month projection chart showing debt decreasing, investments growing, and net worth increasing over time">
              <Chart data={projection.projection} xKey="month" xFormatter={(m) => `${m || ''}m`}
                series={[
                  { key: 'debt', name: 'Debt', color: 'var(--accent)' },
                  { key: 'investments', name: 'Investments', color: 'var(--success)' },
                  { key: 'net_worth', name: 'Net Worth', color: 'var(--ink)' },
                ]} height={180} />
            </div>
            {/* Data table fallback for screen readers */}
            <details className="mt-3">
              <summary className="text-sm text-muted cursor-pointer">View projection data as table</summary>
              <div className="overflow-x-auto mt-2">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-2 py-1">Month</th>
                      <th className="text-right px-2 py-1">Debt</th>
                      <th className="text-right px-2 py-1">Investments</th>
                      <th className="text-right px-2 py-1">Net Worth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projection.projection.slice(0, 12).map((row, i) => (
                      <tr key={i} className="border-b border-border-soft">
                        <td className="px-2 py-1">{row.month || ''}m</td>
                        <td className="px-2 py-1 text-right text-accent">{fmtINR(row.debt || 0)}</td>
                        <td className="px-2 py-1 text-right text-success">{fmtINR(row.investments || 0)}</td>
                        <td className="px-2 py-1 text-right text-ink">{fmtINR(row.net_worth || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </Card>
        ) : null}
      </Reveal>

      <Reveal delay={350}>
        {/* Quick actions */}
        <div className="flex gap-2 flex-wrap">
          <Link to="/dashboard/transactions">
            <Button variant="ghost" size="sm"><Plus size={14} strokeWidth={2} /> Add transaction</Button>
          </Link>
          <Link to="/dashboard/debts">
            <Button variant="ghost" size="sm"><CreditCard size={14} strokeWidth={2} /> Log payment</Button>
          </Link>
          {data?.unread_notifications > 0 && (
            <span className="ml-auto flex items-center gap-2 text-sm text-accent">
              <span className="w-1.25 h-1.25 rounded-full bg-accent animate-pulse" />
              {data.unread_notifications} unread
            </span>
          )}
        </div>
      </Reveal>

      <Reveal delay={400}>
        {/* Contextual info */}
        <div className="text-sm text-muted flex gap-4 flex-wrap">
          {data?.sip_count > 0 && <span>{data.sip_count} active SIP{data.sip_count > 1 ? 's' : ''}</span>}
          {data?.currency_symbol && <span>Base: {data.currency_symbol}</span>}
        </div>
      </Reveal>

      {/* Floating quick-log action */}
      <button
        onClick={() => setQuickOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setQuickOpen(true); }}}
        tabIndex={0}
        aria-label="Quick log transaction"
        title="Quick log (Alt+Q)"
        className="fixed bottom-20 right-4 z-popover w-14 h-14 rounded-full border-0 bg-accent text-ink flex items-center justify-center shadow-lg transition-all duration-base ease-spring hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        style={{
          opacity: isOnline ? 1 : 0.5,
          bottom: `calc(5rem + env(safe-area-inset-bottom))`,
        }}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      <QuickLogSheet
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onSaved={handleQuickSaved}
        online={isOnline}
      />
      <ToastHost />
    </div>
  )
}