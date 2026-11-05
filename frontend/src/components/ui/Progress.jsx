import { useId } from 'react'

// Progress primitive: 6px bar, fills to the value (width transition).
// Variants: accent (default) | success. 0–100.
export default function Progress({ value = 0, variant = 'accent', label, _ariaLevel, ...props } = {}) {
  const id = useId()
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div
      id={id}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="progress"
      {...props}
    >
      <div
        className={`progress-fill${variant === 'success' ? ' green' : ''}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
