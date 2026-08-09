class Debt < TenantRecord
  belongs_to :user
  has_many :debt_payoff_debts, dependent: :destroy
  has_many :debt_payoffs, through: :debt_payoff_debts

  validates :name, presence: true
  validates :amount, numericality: { greater_than: 0 }
  validates :interest_rate, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :emi_amount, numericality: { greater_than: 0 }, allow_nil: true
  validates :status, inclusion: { in: %w[active paid_default paid_off frozen] }
  validates :category, inclusion: {
    in: %w[credit_card loan personal mortgage education other]
  }, allow_nil: true
  validates :currency_code, inclusion: { in: Currency::CURRENCY_SYMBOLS.keys }, allow_nil: true

  scope :active, -> { where(status: "active") }

  def active?
    status == "active"
  end

  after_create :schedule_reminders

  def months_remaining
    return 0 if emi_amount.nil? || emi_amount <= 0 || amount <= 0
    remaining = amount - paid_amount
    (remaining / emi_amount).ceil
  end

  def debt_free_date
    return nil if months_remaining <= 0
    (started_at || Date.today) + months_remaining.months
  end

  def progress_percentage
    return 0.0 if amount <= 0
    [(paid_amount / amount * 100).round(1), 100.0].min
  end

  def remaining_amount
    amount - paid_amount
  end

  private

  def schedule_reminders
    return unless emi_amount&.positive?
    ExpenseReminderJob.set(wait: 1.day).perform_later("debt", id)
  end
end
