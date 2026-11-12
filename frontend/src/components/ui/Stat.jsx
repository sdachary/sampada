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
    <div
      className={`min-w-[160px] overflow-hidden ${className}`}
      style={style}
      tabIndex={footnote ? 0 : undefined}
      onFocus={() => setShowFootnote(true)}
      onBlur={() => setShowFootnote(false)}
      onMouseEnter={() => setShowFootnote(true)}
      onMouseLeave={() => setShowFootnote(false)}
    >
      <p className="label-caps mb-1">{label}</p>
      <p className="fin text-xl font-bold tracking-tight" ref={ref} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shown}</p>
      {delta != null && (
        <p className={`fin text-sm font-semibold mt-1 ${delta >= 0 ? 'text-success' : 'text-danger'}`}>
          {delta >= 0 ? '▲' : '▼'} {fmtINR(Math.abs(delta))}
        </p>
      )}
      {footnote && (
        <div className="relative">
          <p className="text-[10px] text-faint mt-1 cursor-help">{showFootnote ? footnote : 'ⓘ Hover/focus for details'}</p>
          {showFootnote && (
            <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-ink text-bg rounded-sm text-xs leading-relaxed whitespace-nowrap z-tooltip shadow-xl max-w-[280px]">
              {footnote}
            </div>
          )}
        </div>
      )}
    </div>
  )
}