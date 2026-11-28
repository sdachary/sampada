// EmptyState primitive: SVG illustration, one-line explanation, one primary action (copy per §4.3).
import Button from './Button'
import {
  EmptyTransactions,
  EmptyDebts,
  EmptyBudgets,
  EmptyGoals,
  EmptyInvestments,
  EmptyGeneric,
  EmptySearch,
  EmptyOffline,
} from './EmptyStateIllustrations'

const illustrations = {
  transactions: EmptyTransactions,
  debts: EmptyDebts,
  budgets: EmptyBudgets,
  goals: EmptyGoals,
  investments: EmptyInvestments,
  generic: EmptyGeneric,
  search: EmptySearch,
  offline: EmptyOffline,
}

export default function EmptyState({ 
  illustration = 'generic', 
  title, 
  action, 
  children, 
  onAction, 
  actionDisabled,
  size = 48
} = {}) {
  const Illustration = illustrations[illustration] || illustrations.generic
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">
        <Illustration size={size} />
      </div>
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