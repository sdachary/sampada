// Tooltip primitive: text on hover AND keyboard focus; the label is the accessible name.
export default function Tooltip({ label, children } = {}) {
  return (
    <span className="pos-rel" tabIndex={0} aria-label={label}>
      {children}
      <span style={{
        position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
        background: 'var(--ink)', color: 'var(--bg)', fontSize: 12, lineHeight: 1.4,
        padding: '6px 10px', borderRadius: 8, whiteSpace: 'nowrap', zIndex: 'var(--z-toast)',
        opacity: 0, pointerEvents: 'none', transition: 'opacity var(--dur-fast) var(--ease)', display: 'inline-block',
      }} className="p-tooltip-text">{label}</span>
    </span>
  )
}
