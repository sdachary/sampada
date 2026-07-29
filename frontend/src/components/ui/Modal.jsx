import { useEffect, useRef } from 'react'

export default function Modal({ open, onClose, title, children, style }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement
    const el = overlayRef.current?.querySelector('input, select, textarea, button, [tabindex]')
    el?.focus()
    return () => prev?.focus()
  }, [open])

  if (!open) return null

  return (
    <div ref={overlayRef} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(21,20,15,0.35)', backdropFilter: 'blur(4px)',
      padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--paper-card)', borderRadius: 16, padding: 28,
        width: '100%', maxWidth: 480, maxHeight: '90dvh', overflowY: 'auto',
        border: '1px solid var(--line)', boxShadow: '0 24px 80px rgba(21,20,15,0.2)',
        ...style,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-mute)', padding: 4 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
