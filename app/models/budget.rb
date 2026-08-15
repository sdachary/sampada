class Budget < TenantRecord
  belongs_to :user
  belongs_to :budget_category
  belongs_to :household, optional: true

  validates :monthly_limit, numericality: { greater_than: 0 }
  validates :period, inclusion: { in: %w[weekly monthly quarterly yearly] }
  validates :currency_code, inclusion: { in: Currency::CURRENCY_SYMBOLS.keys }, allow_nil: true

  scope :active, lambda {
    where('(start_date IS NULL OR start_date <= ?) AND (end_date IS NULL OR end_date >= ?)', Time.zone.today, Time.zone.today)
  }

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
    when 'weekly' then monthly_limit / 4.0
    when 'monthly' then monthly_limit
    when 'quarterly' then monthly_limit * 3
    when 'yearly' then monthly_limit * 12
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
    when 'weekly'
      days_passed = Time.zone.today.wday
      expected_pct = (days_passed.to_f / 7 * 100)
    when 'monthly'
      days_passed = Time.zone.today.day
      days_in_period = Time.zone.today.end_of_month.day
      expected_pct = (days_passed.to_f / days_in_period * 100)
    when 'quarterly'
      quarter_start = Date.new(Time.zone.today.year, ((Time.zone.today.month - 1) / 3 * 3) + 1, 1)
      days_passed = (Time.zone.today - quarter_start).to_i
      quarter_end = quarter_start + 3.months - 1.day
      days_in_period = (quarter_end - quarter_start).to_i + 1
      expected_pct = (days_passed.to_f / days_in_period * 100)
    when 'yearly'
      days_passed = Time.zone.today.yday
      days_in_period = Time.zone.today.leap? ? 366 : 365
      expected_pct = (days_passed.to_f / days_in_period * 100)
    end

    usage_percentage <= expected_pct * 1.2
  end

  private

  def current_period_range
    start = case period
            when 'weekly'
              Time.zone.today.beginning_of_week
            when 'monthly'
              Time.zone.today.beginning_of_month
            when 'quarterly'
              Time.zone.today.beginning_of_quarter
            when 'yearly'
              Time.zone.today.beginning_of_year
            end
    start..Time.zone.today
  end
end
