import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { StatCard } from '../components/ui'

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
      {snapshots.length > 1 && (() => {
        const values = snapshots.map(s => +s.net_worth)
        const max = Math.max(...values)
        const min = Math.min(...values)
        const range = max - min || 1
        const w = snapshots.length * 48
        const h = 160
        const pad = { top: 8, bottom: 20, left: 4, right: 44 }
        const iw = w - pad.left - pad.right
        const ih = h - pad.top - pad.bottom
        const xStep = iw / (snapshots.length - 1)
        const pts = snapshots.map((s, i) => {
          const x = pad.left + i * xStep
          const y = pad.top + ih - ((+s.net_worth - min) / range) * ih
          return { x, y, date: s.date, val: +s.net_worth }
        })
        const areaPts = pts.map(p => `${p.x},${p.y}`).join(' ') + ` ${pts[pts.length-1].x},${pad.top+ih} ${pts[0].x},${pad.top+ih}`
        const linePts = pts.map(p => `${p.x},${p.y}`).join(' ')
        const midY = pad.top + ih / 2
        return (
          <div className="card" style={{ padding: '16px 16px 8px', marginBottom: 20 }}>
            <p style={{ fontSize: 10.5, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Net worth trend</p>
            <svg role="img" aria-label="Net worth trend chart" viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h, display: 'block' }}>
              <polygon points={areaPts} fill="url(#nw-grad)" />
              <polyline points={linePts} fill="none" stroke="var(--coral)" strokeWidth="2" strokeLinejoin="round" />
              {pts.filter((_, i) => i % Math.max(1, Math.floor(pts.length / 6)) === 0 || i === pts.length - 1).map((p, i) => (
                <text key={i} x={p.x} y={h - 4} textAnchor="middle" fill="var(--ink-faint)" fontSize="9">{p.date.slice(5)}</text>
              ))}
              <text x={w - 2} y={pad.top + 10} textAnchor="end" fill="var(--ink-mute)" fontSize="9">₹{(+max).toLocaleString('en-IN')}</text>
              <text x={w - 2} y={pad.top + ih + 4} textAnchor="end" fill="var(--ink-mute)" fontSize="9">₹{(+min).toLocaleString('en-IN')}</text>
              <line x1={pad.left} y1={midY} x2={w - pad.right} y2={midY} stroke="var(--line)" strokeWidth="0.5" strokeDasharray="3,3" />
              <defs><linearGradient id="nw-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--coral)" stopOpacity="0.2" /><stop offset="100%" stopColor="var(--coral)" stopOpacity="0.02" /></linearGradient></defs>
            </svg>
          </div>
        )
      })()}

      {/* projection chart */}
      {projection?.projection?.length > 0 && (() => {
        const proj = projection.projection
        const maxVal = Math.max(...proj.flatMap(p => [+p.debt, +p.investments, +p.net_worth]))
        const w = 720; const h = 180
        const pad = { top: 8, bottom: 24, left: 44, right: 8 }
        const iw = w - pad.left - pad.right; const ih = h - pad.top - pad.bottom
        const toY = v => pad.top + ih - (v / maxVal) * ih
        const toX = i => pad.left + (i / (proj.length - 1)) * iw
        const lines = [
          { key: 'debt', color: 'var(--coral)', label: 'Debt' },
          { key: 'investments', color: 'var(--emerald)', label: 'Investments' },
          { key: 'net_worth', color: 'var(--ink)', label: 'Net Worth' },
        ]
        return (
          <div className="card" style={{ padding: '16px 16px 8px', marginBottom: 20 }}>
            <p style={{ fontSize: 10.5, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>60-month projection</p>
            <svg role="img" aria-label="60-month financial projection chart showing debt, investments, and net worth over time" viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h, display: 'block' }}>
              {[0, 0.25, 0.5, 0.75, 1].map(f => (
                <line key={f} x1={pad.left} y1={toY(maxVal * f)} x2={w - pad.right} y2={toY(maxVal * f)} stroke="var(--line)" strokeWidth="0.5" strokeDasharray="2,2" />
              ))}
              {lines.map(l => {
                const pts = proj.map((p, i) => `${toX(i)},${toY(+p[l.key])}`).join(' ')
                return <polyline key={l.key} points={pts} fill="none" stroke={l.color} strokeWidth="1.5" strokeLinejoin="round" />
              })}
              {[0, 12, 24, 36, 48, 59].map(i => (
                <text key={i} x={toX(i)} y={h - 4} textAnchor="middle" fill="var(--ink-faint)" fontSize="9">{proj[i]?.month || ''}m</text>
              ))}
              <text x={pad.left - 4} y={toY(maxVal) + 3} textAnchor="end" fill="var(--ink-faint)" fontSize="9">₹{(+maxVal).toLocaleString('en-IN')}</text>
              {lines.map((l, i) => (
                <text key={l.key} x={w - pad.right + 4} y={pad.top + 12 + i * 14} fill={l.color} fontSize="10">{l.label}</text>
              ))}
            </svg>
          </div>
        )
      })()}

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
