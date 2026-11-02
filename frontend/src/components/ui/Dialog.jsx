import { useEffect, useRef } from 'react'

// Dialog primitive: focus trap, Esc to close, backdrop blur, sheet-on-mobile (CSS).
// Mobile width ≤640px renders as a bottom sheet via .p-dialog-overlay media query.
export default function Dialog({ open, onClose, title, children, wide, style } = {}) {
  const overlayRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    const prev = document.activeElement
    const focusable = () => panel?.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
    panel?.querySelector('h2')?.focus?.() ?? focusable()[0]?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const el = focusable()
      if (!el?.length) return
      const first = el[0], last = el[el.length - 1]
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault() }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="p-dialog-overlay" ref={overlayRef} onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="p-dialog"
        style={{ maxWidth: wide ? 720 : undefined, ...style }}
        onClick={e => e.stopPropagation()}
      >
        <div className="spread-mb20" style={{ padding: '20px 24px 0' }}>
          <h2 className="h-600-18" tabIndex={-1} style={{ outline: 'none' }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', padding: 6, marginLeft: 8,
          }}>✕</button>
        </div>
        <div style={{ padding: '16px 24px 24px' }}>{children}</div>
      </div>
    </div>
  )
}
