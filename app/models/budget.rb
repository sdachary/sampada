class Budget < TenantRecord
  belongs_to :user
  belongs_to :budget_category
  belongs_to :household, optional: true

  validates :monthly_limit, numericality: { greater_than: 0 }
  validates :period, inclusion: { in: %w[weekly monthly quarterly yearly] }
  validates :currency_code, inclusion: { in: Currency::CURRENCY_SYMBOLS.keys }, allow_nil: true

  scope :active, -> { where("(start_date IS NULL OR start_date <= ?) AND (end_date IS NULL OR end_date >= ?)", Date.today, Date.today) }

  def spent_this_period
    date_range = current_period_range
    budget_category.transactions
      .where(user_id: user_id)
      .where(transaction_date: date_range)
      .sum(:amount)
  end

  # Alias for backwards compatibility
  def spent_this_month
    spent_this_period
  end

  def period_limit
    case period
    when "weekly" then monthly_limit / 4.0
    when "monthly" then monthly_limit
    when "quarterly" then monthly_limit * 3
    when "yearly" then monthly_limit * 12
    else monthly_limit
    end
  end

  def remaining
    period_limit - spent_this_period
  end

  def usage_percentage
    limit = period_limit
    return 0.0 if limit <= 0
    [(spent_this_period / limit * 100).round(1), 100.0].min
  end

  def on_track?
    limit = period_limit
    return true if limit <= 0

    case period
    when "weekly"
      days_passed = Date.today.wday
      expected_pct = (days_passed.to_f / 7 * 100)
    when "monthly"
      days_passed = Date.today.day
      days_in_period = Date.today.end_of_month.day
      expected_pct = (days_passed.to_f / days_in_period * 100)
    when "quarterly"
      quarter_start = Date.new(Date.today.year, ((Date.today.month - 1) / 3 * 3) + 1, 1)
      days_passed = (Date.today - quarter_start).to_i
      quarter_end = quarter_start + 3.months - 1.day
      days_in_period = (quarter_end - quarter_start).to_i + 1
      expected_pct = (days_passed.to_f / days_in_period * 100)
    when "yearly"
      days_passed = Date.today.yday
      days_in_period = Date.today.leap? ? 366 : 365
      expected_pct = (days_passed.to_f / days_in_period * 100)
    else
      days_passed = Date.today.day
      days_in_period = Date.today.end_of_month.day
      expected_pct = (days_passed.to_f / days_in_period * 100)
    end

    usage_percentage <= expected_pct * 1.2
  end

  private

  def current_period_range
    case period
    when "weekly"
      start = Date.today.beginning_of_week
      start..Date.today
    when "monthly"
      start = Date.today.beginning_of_month
      start..Date.today
    when "quarterly"
      start = Date.today.beginning_of_quarter
      start..Date.today
    when "yearly"
      start = Date.today.beginning_of_year
      start..Date.today
    else
      start = Date.today.beginning_of_month
      start..Date.today
    end
  end
end
