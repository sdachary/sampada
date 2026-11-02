import { useCountUp } from '../../lib/motion-primitives'
import { fmtINR } from '../../lib/amounts'

// Stat primitive: label, big tabular figure (optional count-up), optional delta + footnote.
export default function Stat({ label, value, countUp, delta, footnote, style, className = '' } = {}) {
  const numeric = countUp ? Math.abs(Number(String(value).replace(/[₹,\s]/g, ''))) || 0 : 0
  const { ref, display } = useCountUp(numeric, { enabled: countUp })
  const shown = countUp ? fmtINR(display) : value

  return (
    <div className={className} style={style}>
      <p className="label-caps mb-4">{label}</p>
      <p className="fin h-700-22" ref={ref} style={{ fontFamily: 'var(--font-display)' }}>{shown}</p>
      {delta != null && (
        <p className="fin" style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: delta >= 0 ? 'var(--success)' : 'var(--danger)' }}>
          {delta >= 0 ? '▲' : '▼'} {fmtINR(Math.abs(delta))}
        </p>
      )}
      {footnote && <p className="text-12-faint" style={{ marginTop: 2 }}>{footnote}</p>}
    </div>
  )
}
