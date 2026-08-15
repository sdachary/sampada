class AnomalyDetectionService
  def initialize(user)
    @user = user
    @exchange = ExchangeRateService.new
    @base_currency = user.currency
  end

  def detect
    anomalies = []

    anomalies.concat(detect_transaction_anomalies)
    anomalies.concat(detect_spending_trend_breaks)
    anomalies.concat(detect_budget_breaches)

    anomalies.sort_by { |a| -a[:severity] }
  end

  def summary
    anomalies = detect
    {
      total_anomalies: anomalies.count,
      critical: anomalies.count { |a| a[:severity] >= 8 },
      warnings: anomalies.count { |a| a[:severity] >= 4 && a[:severity] < 8 },
      info: anomalies.count { |a| a[:severity] < 4 },
      anomalies: anomalies.first(10)
    }
  end

  private

  def detect_transaction_anomalies
    Transaction.detect_anomalies(@user.id).map do |t|
      cat = t.budget_category&.name || 'Uncategorized'
      {
        type: 'unusual_transaction',
        severity: calculate_severity(t.amount, t.budget_category&.monthly_spending(@user.id) || 0),
        title: "Unusual #{cat} transaction",
        description: "#{format_amount(t.amount)} on #{t.description} (#{t.transaction_date}) is significantly above normal",
        date: t.transaction_date,
        amount: t.amount.to_f,
        currency_code: t.currency_code,
        category: cat,
        transaction_id: t.id
      }
    end
  end

  def detect_spending_trend_breaks
    anomalies = []
    current_month = Transaction.where(user: @user, transaction_type: 'expense')
                               .for_month(Time.zone.today.year, Time.zone.today.month)
                               .sum do |t|
      convert(t.amount,
              t.currency_code)
    end

    prev_month = Transaction.where(user: @user, transaction_type: 'expense')
                            .for_month((Time.zone.today - 1.month).year, (Time.zone.today - 1.month).month)
                            .sum { |t| convert(t.amount, t.currency_code) }

    if prev_month.positive? && current_month > prev_month * 1.5
      anomalies << {
        type: 'spending_surge',
        severity: 6,
        title: 'Spending surge this month',
        description: "Current month spending (#{format_amount(current_month)}) is #{(((current_month / prev_month) - 1) * 100).round(0)}% higher than last month",
        date: Time.zone.today,
        amount: (current_month - prev_month).round(2),
        currency_code: @base_currency
      }
    end

    anomalies
  end

  def detect_budget_breaches
    Budget.where(user: @user).active.select do |b|
      b.usage_percentage > 90
    end.map do |b|
      {
        type: 'budget_breach',
        severity: b.usage_percentage > 100 ? 7 : 4,
        title: "#{b.budget_category.name} budget nearly exhausted",
        description: "#{b.usage_percentage}% used (#{format_amount(b.spent_this_month)} of #{format_amount(b.monthly_limit)})",
        date: Time.zone.today,
        amount: b.spent_this_month.to_f,
        currency_code: b.currency_code,
        budget_id: b.id,
        category: b.budget_category.name
      }
    end
  end

  def calculate_severity(amount, category_total)
    return 1 if category_total <= 0

    ratio = amount / category_total
    if ratio > 3 then 9
    elsif ratio > 2 then 7
    elsif ratio > 1.5 then 5
    else 3
    end
  end

  def format_amount(amount)
    "#{Currency.symbol_for(@base_currency)}#{amount.to_i}"
  end

  def convert(amount, from_currency)
    @exchange.convert(amount, from: from_currency || @base_currency, to: @base_currency) || amount
  end
end
