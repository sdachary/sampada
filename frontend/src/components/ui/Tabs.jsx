import { useId, useState } from 'react'

// Tabs primitive: ARIA tablist with arrow-key navigation, controlled or uncontrolled.
export default function Tabs({ tabs, value, onChange } = {}) {
  const id = useId()
  const [internal, setInternal] = useState(tabs[0]?.key)
  const current = value ?? internal
  const select = (key) => { setInternal(key); onChange?.(key) }

  const onKey = (e) => {
    const idx = tabs.findIndex(t => t.key === current)
    let next = idx
    if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length
    if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = tabs.length - 1
    if (next !== idx) { e.preventDefault(); select(tabs[next].key); document.getElementById(`${id}-tab-${tabs[next].key}`)?.focus() }
  }

  return (
    <div className="p-tabs" role="tablist">
      {tabs.map(t => (
        <button
          key={t.key}
          id={`${id}-tab-${t.key}`}
          role="tab"
          aria-selected={current === t.key}
          aria-controls={`${id}-panel`}
          tabIndex={current === t.key ? 0 : -1}
          onKeyDown={onKey}
          onClick={() => select(t.key)}
          className="p-tabs__tab"
        >
          {t.label}
        </button>
      ))}
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${current}`} hidden>
        {tabs.find(t => t.key === current)?.content}
      </div>
    </div>
  )
}
