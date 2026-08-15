class DividendSip < TenantRecord
  belongs_to :portfolio

  attribute :monthly_investment, :decimal
  attribute :dividend_yield, :decimal

  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :frequency, inclusion: { in: %w[monthly quarterly yearly] }
  validates :status, inclusion: { in: %w[active paused completed] }
  validates :currency_code, inclusion: { in: Currency::CURRENCY_SYMBOLS.keys }, allow_nil: true

  def projected_annual_income(yield_rate = 0.04)
    monthly_contribution * 12 * yield_rate
  end

  def monthly_contribution
    case frequency
    when 'monthly' then amount
    when 'quarterly' then amount / 3.0
    when 'yearly' then amount / 12.0
    end
  end
end
