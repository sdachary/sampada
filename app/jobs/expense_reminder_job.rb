class ExpenseReminderJob < ApplicationJob
  queue_as :default

  def perform(expense_type, expense_id)
    case expense_type
    when 'debt'
      debt = Debt.find_by(id: expense_id)
      return unless debt&.active?

      NotificationService.new(debt.user).notify_debt_milestone(debt, 'EMI Reminder')
      self.class.set(wait: 1.month).perform_later('debt', expense_id)
    when 'recurring_expense'
      expense = RecurringExpense.find_by(id: expense_id)
      return unless expense&.active?

      NotificationService.new(expense.user).notify_sip_reminder(expense)
      schedule_next(expense)
    end
  end

  def self.schedule_initial(expense)
    return unless expense.next_due_date

    set(wait_until: expense.next_due_date.beginning_of_day + 9.hours)
      .perform_later(expense.class.name.demodulize.underscore, expense.id)
  end

  private

  def schedule_next(expense)
    due_date = expense.next_due_date
    return unless due_date

    frequency_map = { 'weekly' => 1.week, 'monthly' => 1.month, 'quarterly' => 3.months, 'yearly' => 1.year }
    interval = frequency_map[expense.frequency] || 1.month
    next_due = due_date + interval
    self.class.set(wait_until: next_due.beginning_of_day + 9.hours)
        .perform_later('recurring_expense', expense.id)
  end
end
