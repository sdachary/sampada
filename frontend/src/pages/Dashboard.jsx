import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { StatCard } from '../components/ui'
import Chart from '../components/Chart'

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [projection, setProjection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hideAmt, setHideAmt] = useState(true)

  useEffect(() => {
    Promise.all([
      api.dashboard(),
      api.request('/api/v1/dashboard/projection'),
    ]).then(([d, p]) => { setData(d); setProjection(p) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div>
      <div className="skeleton" style={{ width: 180, height: 22, marginBottom: 6 }} />
      <div className="skeleton" style={{ width: 260, height: 14, marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 14 }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
      </div>
    </div>
  )

  function downloadSnapshot() {
    const nw = data?.net_worth ?? 0
    const stage = nw <= 0 ? 'Building Debt' : data?.debt_free_date ? 'Climbing to Zero' : 'Growing Wealth'
    const val = hideAmt ? '••••••' : `₹${nw.toLocaleString('en-IN')}`
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340">
      <rect width="600" height="340" fill="#f7f1de" rx="16"/>
      <rect x="0" y="0" width="600" height="6" fill="#ed6f5c"/>
      <text x="40" y="60" font-family="'Inter Tight',sans-serif" font-size="12" font-weight="600" fill="#8b8676" letter-spacing="2">SAMPADA</text>
      <text x="40" y="90" font-family="'Inter Tight',sans-serif" font-size="11" fill="#5a5448">Financial snapshot</text>
      <text x="40" y="160" font-family="'Inter Tight',sans-serif" font-size="13" fill="#8b8676" letter-spacing="1">Net worth</text>
      <text x="40" y="210" font-family="'Inter Tight',sans-serif" font-size="40" font-weight="700" fill="#15140f" letter-spacing="-1">${val}</text>
      <rect x="40" y="230" width="60" height="3" fill="#ed6f5c" rx="1.5"/>
      <text x="40" y="265" font-family="'Inter Tight',sans-serif" font-size="12" fill="#5a5448">Stage: <tspan fill="#15140f">${stage}</tspan></text>
      ${data?.debt_free_date ? `<text x="40" y="290" font-family="'Inter Tight',sans-serif" font-size="12" fill="#5a5448">Debt-free target: <tspan fill="#15140f">${data.debt_free_date}</tspan></text>` : ''}
      <text x="560" y="320" font-family="'Playfair Display',Georgia,serif" font-style="italic" font-size="13" fill="#8b8676" text-anchor="end">sampada.app</text>
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

  return (
    <div>
      <p className="page-num" style={{ marginBottom: 4 }}>00<em>1</em> / 016</p>

      {/* hero net worth */}
      <div className="card" style={{ padding: '28px 26px', marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Net worth</p>
        <p className="fin" style={{ fontFamily: 'var(--sans)', fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          ₹{(nw).toLocaleString('en-IN')}
        </p>
        {data?.debt_free_date && (
          <p style={{ fontSize: 13, color: 'var(--ink-mute)', marginTop: 8 }}>
            Debt-free by <span style={{ color: 'var(--ink)' }}>{data.debt_free_date}</span>
          </p>
        )}
        {debt > 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="progress" style={{ maxWidth: 300 }}>
              <div className="progress-fill green" style={{ width: `${pct}%` }} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>{pct}% invested · {100 - pct}% debt</p>
          </div>
        )}
      </div>

      {/* stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total debt" value={`₹${debt.toLocaleString('en-IN')}`} color="var(--coral)" subtext={data?.debt_count > 0 ? `${data.debt_count} loan${data.debt_count > 1 ? 's' : ''}` : null} />
        <StatCard label="Investments" value={`₹${inv.toLocaleString('en-IN')}`} color="var(--success)" subtext={data?.portfolio_count > 0 ? `${data.portfolio_count} portfolio${data.portfolio_count > 1 ? 's' : ''}` : null} />
        <StatCard label="Monthly expenses" value={`₹${(data?.monthly_expenses || 0).toLocaleString('en-IN')}`} />
        <StatCard label="Wealth score" value={(data?.wealth_score || 0).toFixed(1)} tooltip="Composite score (0–10) based on debt-to-income ratio, savings rate, investment diversity, and emergency fund coverage" />
      </div>

      {/* net worth area chart */}
      {snapshots.length > 1 && (
        <div className="card" style={{ padding: '16px 16px 8px', marginBottom: 20 }}>
          <p style={{ fontSize: 10.5, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Net worth trend</p>
          <Chart data={snapshots} xKey="date" xFormatter={(d) => (d || '').slice(5)}
            series={[{ key: 'net_worth', name: 'Net worth', color: 'var(--coral)', area: true }]} />
        </div>
      )}

      {/* projection chart */}
      {projection?.projection?.length > 1 && (
        <div className="card" style={{ padding: '16px 16px 8px', marginBottom: 20 }}>
          <p style={{ fontSize: 10.5, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>60-month projection</p>
          <Chart data={projection.projection} xKey="month" xFormatter={(m) => `${m || ''}m`}
            series={[
              { key: 'debt', name: 'Debt', color: 'var(--coral)' },
              { key: 'investments', name: 'Investments', color: 'var(--emerald)' },
              { key: 'net_worth', name: 'Net Worth', color: 'var(--ink)' },
            ]} height={180} />
        </div>
      )}

      {/* snapshot */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 10.5, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Share snapshot</p>
          <label style={{ fontSize: 11, color: 'var(--ink-mute)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={hideAmt} onChange={() => setHideAmt(h => !h)} style={{ accentColor: 'var(--coral)' }} />
            Hide amounts
          </label>
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-mute)', margin: '6px 0 10px' }}>Download a styled SVG card of your net worth snapshot.</p>
        <button onClick={downloadSnapshot} className="btn btn-ghost" style={{ fontSize: 12.5, padding: '7px 16px' }}>Download snapshot</button>
      </div>

      {/* quick actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        <Link to="/dashboard/transactions" className="btn btn-ghost" style={{ fontSize: 12.5, padding: '7px 16px' }}>+ Add transaction</Link>
        <Link to="/dashboard/debts" className="btn btn-ghost" style={{ fontSize: 12.5, padding: '7px 16px' }}>+ Log payment</Link>
        {data?.unread_notifications > 0 && (
          <span className="tag coral" style={{ marginLeft: 'auto' }}>
            <span className="pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--coral)', display: 'inline-block' }} />
            {data.unread_notifications} unread
          </span>
        )}
      </div>

      {/* contextual info */}
      <div style={{ fontSize: 13, color: 'var(--ink-mute)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {data?.sip_count > 0 && <span>{data.sip_count} active SIP{data.sip_count > 1 ? 's' : ''}</span>}
        {data?.currency_symbol && <span>Base: {data.currency_symbol}</span>}
      </div>
    </div>
  )
}
