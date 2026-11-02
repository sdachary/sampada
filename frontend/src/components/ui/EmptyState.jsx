// EmptyState primitive: SVG icon, one-line explanation, one primary action (copy per §4.3).
export default function EmptyState({ icon, title, action, children, onAction } = {}) {
  return (
    <div className="empty-state">
      {icon && <span aria-hidden="true">{icon}</span>}
      <p>{title}</p>
      {children && <p className="text-13-muted" style={{ marginTop: '-8px', marginBottom: 16 }}>{children}</p>}
      {action && onAction && <button className="p-btn p-btn--primary" onClick={onAction} style={{ minHeight: 40 }}>{action}</button>}
    </div>
  )
}
