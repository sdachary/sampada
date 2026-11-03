import { useCountUp } from '../../lib/motion-primitives'
import { fmtINR } from '../../lib/amounts'
import { useState } from 'react'

// Stat primitive: label, big tabular figure (optional count-up), optional delta + footnote.
export default function Stat({ label, value, countUp, delta, footnote, style, className = '' } = {}) {
  const numeric = countUp ? Math.abs(Number(String(value).replace(/[₹,\s]/g, ''))) || 0 : 0
  const { ref, display } = useCountUp(numeric, { enabled: countUp })
  const shown = countUp ? fmtINR(display) : value
  const [showFootnote, setShowFootnote] = useState(false)

  return (
    <div className={className} style={style} tabIndex={footnote ? 0 : undefined} onFocus={() => setShowFootnote(true)} onBlur={() => setShowFootnote(false)} onMouseEnter={() => setShowFootnote(true)} onMouseLeave={() => setShowFootnote(false)}>
      <p className="label-caps mb-4">{label}</p>
      <p className="fin h-700-22" ref={ref} style={{ fontFamily: 'var(--font-display)' }}>{shown}</p>
      {delta != null && (
        <p className="fin" style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: delta >= 0 ? 'var(--success)' : 'var(--danger)' }}>
          {delta >= 0 ? '▲' : '▼'} {fmtINR(Math.abs(delta))}
        </p>
      )}
      {footnote && (
        <div style={{ position: 'relative' }}>
          <p className="text-12-faint" style={{ marginTop: 2, cursor: footnote ? 'help' : 'default' }}>{showFootnote ? footnote : 'ⓘ Hover/focus for details'}</p>
          {showFootnote && (
            <div style={{
              position: 'absolute', bottom: '100%', left: 0, marginBottom: 8,
              padding: '8px 12px', background: 'var(--ink)', color: 'var(--bg)',
              borderRadius: 'var(--radius-sm)', fontSize: 11, lineHeight: 1.4,
              whiteSpace: 'nowrap', zIndex: 10, boxShadow: 'var(--shadow-hover)',
              maxWidth: 280
            }}>
              {footnote}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
