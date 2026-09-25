class RecurringExpense < TenantRecord
  belongs_to :user
  has_many :transactions, foreign_key: :recurring_expense_id, dependent: :nullify

  validates :name, :amount, :frequency, presence: true
  validates :amount, numericality: { greater_than: 0 }
  validates :frequency, inclusion: { in: %w[daily weekly monthly quarterly yearly] }
  validates :currency_code, inclusion: { in: Currency::CURRENCY_SYMBOLS.keys }, allow_nil: true

  scope :active, -> { where(active: true) }

  # Auto-log an expense transaction for this due date, once. Idempotency is
  # guaranteed by the partial unique index on (recurring_expense_id,
  # transaction_date), so a repeated run (job retry, check-job rerun) is a no-op.
  # Advances next_due_date so the following period logs a fresh date; the job's
  # scheduler then arms the next run from the advanced date.
  def log_due_transaction!
    return unless auto_debit? && active?
    return unless next_due_date && next_due_date <= Time.zone.today
    return if transactions.where(transaction_date: next_due_date).exists?

    self.class.transaction do
      transactions.create!(
        user_id:,
        household_id:,
        description: name,
        amount:,
        transaction_type: 'expense',
        transaction_date: next_due_date,
        currency_code:,
        recurring: true,
        recurring_frequency: frequency
      )
      update!(next_due_date: self.class.next_due_after(next_due_date, frequency))
    end
  rescue ActiveRecord::RecordNotUnique
    nil
  end

  def self.next_due_after(date, frequency)
    case frequency
    when 'daily' then date + 1.day
    when 'weekly' then date + 1.week
    when 'monthly' then date.next_month
    when 'quarterly' then date.advance(months: 3)
    when 'yearly' then date.next_year
    end
  end

  def monthly_amount
    case frequency
    when 'weekly' then amount * 4.33
    when 'monthly', 'daily' then amount
    when 'quarterly' then amount / 3.0
    when 'yearly' then amount / 12.0
    end
  end

  def next_due_days
    return nil if next_due_date.nil?

    (next_due_date - Time.zone.today).to_i
  end
end
