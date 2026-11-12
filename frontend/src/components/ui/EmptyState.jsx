// EmptyState primitive: SVG icon, one-line explanation, one primary action (copy per §4.3).
import Button from './Button'

export default function EmptyState({ icon, title, action, children, onAction, actionDisabled } = {}) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state__icon" aria-hidden="true">{icon}</div>}
      <p className="empty-state__title">{title}</p>
      {children && <p className="empty-state__desc">{children}</p>}
      {action && onAction && (
        <Button onClick={onAction} disabled={actionDisabled} className="empty-state__action">
          {action}
        </Button>
      )}
    </div>
  )
}