class ExpenseReminderCheckJob < ApplicationJob
  queue_as :default

  def perform
    due_soon = RecurringExpense.active.where(
      next_due_date: Time.zone.today..3.days.from_now.to_date
    )

    due_soon.find_each do |expense|
      ExpenseReminderJob.perform_later('recurring_expense', expense.id)
    end
  end
end
