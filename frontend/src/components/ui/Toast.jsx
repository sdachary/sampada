// Toast primitive: module store + host. `toast('Saved.')` in your action; <ToastHost/> mounts once.
import { useSyncExternalStore } from 'react'

let toasts = []
const subs = new Set()
export function toast(message, { duration = 4000, action = null } = {}) {
  const id = Math.random().toString(36).slice(2)
  toasts = [...toasts, { id, message, action }]
  subs.forEach(fn => fn())
  setTimeout(() => { toasts = toasts.filter(t => t.id !== id); subs.forEach(fn => fn()) }, duration)
}

const getSnapshot = () => toasts
const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn) }

export function ToastHost() {
  const items = useSyncExternalStore(subscribe, getSnapshot)
  if (!items.length) return null
  return (
    <div className="p-toast" role="status" aria-live="polite"
      style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 'var(--z-toast)', display: 'grid', gap: 8 }}>
      {items.map(t => (
        <div key={t.id}>
          {t.message}
          {t.action ? (
            <button type="button" onClick={t.action.onClick} style={{ marginLeft: 8, fontWeight: 600 }}>
              {t.action.label}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
}
