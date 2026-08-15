class Journey < TenantRecord
  belongs_to :user

  validates :phase, inclusion: { in: %w[negative zero positive] }
  validates :monthly_sip_goal, numericality: { greater_than: 0 }, allow_nil: true
  validates :currency_code, inclusion: { in: Currency::CURRENCY_SYMBOLS.keys }, allow_nil: true

  def progress_percentage
    return 0.0 if monthly_sip_goal.nil? || monthly_sip_goal <= 0

    current_sip = dividend_sips_sum
    [(current_sip / monthly_sip_goal * 100).round(1), 100.0].min
  end

  def days_until_zero_day
    return nil if zero_day_target.nil?

    (zero_day_target - Time.zone.today).to_i
  end

  private

  def dividend_sips_sum
    DividendSip.joins(portfolio: :user).where(users: { id: user_id }).sum(:amount)
  end
end
