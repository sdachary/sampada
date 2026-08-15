class Transaction < TenantRecord
  belongs_to :user
  belongs_to :budget_category, optional: true
  belongs_to :household, optional: true

  validates :description, :amount, :transaction_date, presence: true
  validates :amount, numericality: { other_than: 0 }
  validates :transaction_type, inclusion: { in: %w[expense income transfer] }
  validates :currency_code, inclusion: { in: Currency::CURRENCY_SYMBOLS.keys }, allow_nil: true

  scope :expenses, -> { where(transaction_type: 'expense') }
  scope :income, -> { where(transaction_type: 'income') }
  scope :for_month, lambda { |year, month|
    where('EXTRACT(YEAR FROM transaction_date) = ? AND EXTRACT(MONTH FROM transaction_date) = ?', year, month)
  }
  scope :recent, -> { order(transaction_date: :desc).limit(50) }
  scope :uncategorized, -> { where(budget_category_id: nil) }

  def self.monthly_totals(user_id, months: 6)
    (0...months).map do |i|
      date = Time.zone.today - i.months
      expenses = where(user_id: user_id, transaction_type: 'expense')
                 .for_month(date.year, date.month).sum(:amount)
      income = where(user_id: user_id, transaction_type: 'income')
               .for_month(date.year, date.month).sum(:amount)
      {
        month: date.strftime('%Y-%m'),
        label: date.strftime('%b %Y'),
        expenses: expenses.to_f,
        income: income.to_f,
        net: (income - expenses).to_f
      }
    end
  end

  def self.detect_anomalies(user_id, threshold: 3.0)
    recent = where(user_id: user_id, transaction_type: 'expense')
             .where(transaction_date: 90.days.ago..)
    return [] if recent.count < 5

    amounts = recent.pluck(:amount)
    mean = amounts.sum / amounts.size
    variance = amounts.sum { |a| (a - mean)**2 } / amounts.size
    std_dev = Math.sqrt(variance)

    recent.select do |t|
      t.amount.positive? && (t.amount - mean).abs > threshold * std_dev
    end
  end
end
