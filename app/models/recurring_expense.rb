class RecurringExpense < TenantRecord
  belongs_to :user

  validates :name, :amount, :frequency, presence: true
  validates :amount, numericality: { greater_than: 0 }
  validates :frequency, inclusion: { in: %w[daily weekly monthly quarterly yearly] }
  validates :currency_code, inclusion: { in: Currency::CURRENCY_SYMBOLS.keys }, allow_nil: true

  scope :active, -> { where(active: true) }

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
