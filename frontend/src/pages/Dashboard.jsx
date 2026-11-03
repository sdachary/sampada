import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Stat, Progress, Button, Card, Skeleton, EmptyState, ToastHost, toast } from '../components/ui'
import Chart from '../components/Chart'
import QuickLogSheet from '../components/QuickLogSheet'
import useOnline from '../lib/useOnline'
import { Plus, AlertCircle, CreditCard, ArrowUp } from 'lucide-react'
import { fmtINR } from '../lib/amounts'
import PageHeader from '../components/ui/PageHeader'

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
    <div style={{ display: 'grid', gap: 20 }}>
      <Skeleton style={{ width: 180, height: 22 }} />
      <Skeleton style={{ width: 260, height: 14 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 14 }}>
        {[1,2,3,4].map(i => <Skeleton key={i} style={{ height: 100 }} />)}
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
      <text x="40" y="90" font-family="'Inter Tight',sans-serif" font-size="11" fill="var(--ink-mute)">Financial snapshot</text>
      <text x="40" y="160" font-family="'Inter Tight',sans-serif" font-size="13" fill="var(--muted)" letter-spacing="1">Net worth</text>
      <text x="40" y="210" font-family="'Inter Tight',sans-serif" font-size="40" font-weight="700" fill="var(--ink)" letter-spacing="-1">${val}</text>
      <rect x="40" y="230" width="60" height="3" fill="var(--accent)" rx="1.5"/>
      <text x="40" y="265" font-family="'Inter Tight',sans-serif" font-size="12" fill="var(--ink-mute)">Stage: <tspan fill="var(--ink)">${stage}</tspan></text>
      ${data?.debt_free_date ? `<text x="40" y="290" font-family="'Inter Tight',sans-serif" font-size="12" fill="var(--ink-mute)">Debt-free target: <tspan fill="var(--ink)">${data.debt_free_date}</tspan></text>` : ''}
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
    <div style={{ display: 'grid', gap: 24 }}>
      <PageHeader
        title="Dashboard"
        action={
          <Button variant="secondary" size="sm" onClick={downloadSnapshot}>
            Download snapshot
          </Button>
        }
      />

      {/* Debt freedom progress — prominent, per spec */}
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Debt freedom progress</p>
          <p className="fin" style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>
            {Math.round(debtFreePct)}%
          </p>
        </div>
        <Progress value={debtFreePct} label="Debt freedom progress" />
        {data?.debt_free_date && (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            Projected debt-free by <span className="fin" style={{ fontWeight: 600, color: 'var(--ink)' }}>{data.debt_free_date}</span>
          </p>
        )}
      </div>

      {/* Net worth hero */}
      <Card>
        <p style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Net worth</p>
        <p className="fin" style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          {fmtINR(nw)}
        </p>
        {snapshots.length >= 2 && (() => {
          const prev = snapshots[snapshots.length - 2]?.net_worth || 0
          const change = nw - prev
          const pct = prev ? ((change / Math.abs(prev)) * 100).toFixed(1) : 0
          return (
            <p style={{ fontSize: 12, color: change >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: 6, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(change) > 0 ? fmtINR(Math.abs(change)) : '0'} ({pct}%)
            </p>
          )
        })()}
      </Card>

      {/* Stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 12 }}>
        <Stat label="Total debt" value={fmtINR(debt)} countUp delta={data?.debt_delta} subtext={data?.debt_count > 0 ? `${data.debt_count} loan${data.debt_count > 1 ? 's' : ''}` : null} />
        <Stat label="Investments" value={fmtINR(inv)} countUp subtext={data?.portfolio_count > 0 ? `${data.portfolio_count} portfolio${data.portfolio_count > 1 ? 's' : ''}` : null} />
        <Stat label="Monthly expenses" value={fmtINR(data?.monthly_expenses || 0)} />
        <Stat label="Wealth score" value={(data?.wealth_score || 0).toFixed(1)} tooltip="Composite score (0–10) based on debt-to-income ratio, savings rate, investment diversity, and emergency fund coverage" />
      </div>

      {/* Net worth area chart */}
      {snapshots.length > 1 ? (
        <Card>
          <p className="label-caps mb-4" >Net worth trend</p>
          <Chart data={snapshots} xKey="date" xFormatter={(d) => (d || '').slice(5)}
            series={[{ key: 'net_worth', name: 'Net worth', color: 'var(--accent)', area: true }]} />
        </Card>
      ) : (
        <EmptyState icon={<AlertCircle size={32} />} title="No net worth history yet" action="Add a transaction" onAction={() => setQuickOpen(true)}>
          Your first transaction will start the trend chart.
        </EmptyState>
      )}

      {/* Projection chart */}
      {projection?.projection?.length > 1 ? (
        <Card>
          <p className="label-caps mb-4" >60-month projection</p>
          <div role="img" aria-label="60-month projection chart showing debt decreasing, investments growing, and net worth increasing over time">
            <Chart data={projection.projection} xKey="month" xFormatter={(m) => `${m || ''}m`}
              series={[
                { key: 'debt', name: 'Debt', color: 'var(--accent)' },
                { key: 'investments', name: 'Investments', color: 'var(--success)' },
                { key: 'net_worth', name: 'Net Worth', color: 'var(--ink)' },
              ]} height={180} />
          </div>
          {/* Data table fallback for screen readers */}
          <details style={{ marginTop: 12 }}>
            <summary style={{ fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>View projection data as table</summary>
            <div style={{ overflowX: 'auto', marginTop: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Month</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>Debt</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>Investments</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>Net Worth</th>
                  </tr>
                </thead>
                <tbody>
                  {projection.projection.slice(0, 12).map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                      <td style={{ padding: '6px 8px' }}>{row.month || ''}m</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--accent)' }}>{fmtINR(row.debt || 0)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--success)' }}>{fmtINR(row.investments || 0)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--ink)' }}>{fmtINR(row.net_worth || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Card>
      ) : null}

      {/* Share snapshot */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Share snapshot</p>
          <label style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={hideAmt} onChange={() => setHideAmt(h => !h)} style={{ accentColor: 'var(--accent)' }} />
            Hide amounts
          </label>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 10px' }}>Download a styled SVG card of your net worth snapshot.</p>
        <Button variant="ghost" size="sm" onClick={downloadSnapshot}>Download snapshot</Button>
      </Card>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link to="/dashboard/transactions">
          <Button variant="ghost" size="sm"><Plus size={14} strokeWidth={2} /> Add transaction</Button>
        </Link>
        <Link to="/dashboard/debts">
          <Button variant="ghost" size="sm"><CreditCard size={14} strokeWidth={2} /> Log payment</Button>
        </Link>
        {data?.unread_notifications > 0 && (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent)' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
            {data.unread_notifications} unread
          </span>
        )}
      </div>

      {/* Contextual info */}
      <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {data?.sip_count > 0 && <span>{data.sip_count} active SIP{data.sip_count > 1 ? 's' : ''}</span>}
        {data?.currency_symbol && <span>Base: {data.currency_symbol}</span>}
      </div>

      {/* Floating quick-log action */}
      <button
        onClick={() => setQuickOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setQuickOpen(true); }}}
        tabIndex={0}
        aria-label="Quick log transaction"
        title="Quick log (Alt+Q)"
        style={{
          position: 'fixed', right: 20, bottom: 'calc(84px + env(safe-area-inset-bottom))', zIndex: 120,
          width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'var(--accent)', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(237,111,92,0.4)', opacity: isOnline ? 1 : 0.5,
          outline: 'none',
        }}
        onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-bg), 0 8px 24px rgba(237,111,92,0.4)'; }}
        onBlur={(e) => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(237,111,92,0.4)'; }}
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