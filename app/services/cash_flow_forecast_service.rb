class CashFlowForecastService
  def initialize(user)
    @user = user
    @exchange = ExchangeRateService.new
    @base_currency = user.currency
  end

  def forecast(months: 12)
    recurring = recurring_cash_flows
    historical = historical_averages

    (1..months).map do |month|
      month_date = Time.zone.today + month.months
      projected_income = projected(historical[:avg_monthly_income], recurring[:monthly_income], month)
      projected_expenses = projected(historical[:avg_monthly_expenses], recurring[:monthly_expenses], month)

      {
        month: month_date.strftime('%Y-%m'),
        label: month_date.strftime('%b %Y'),
        projected_income: projected_income.round(2),
        projected_expenses: projected_expenses.round(2),
        net_cash_flow: (projected_income - projected_expenses).round(2),
        confidence: confidence_score(month)
      }
    end
  end

  def summary
    rec = recurring_cash_flows
    hist = historical_averages
    projected_net = rec[:monthly_income] - rec[:monthly_expenses]
    runway_months = projected_net.positive? ? nil : (savings_buffer / [projected_net.abs, 1].max).floor

    {
      monthly_income: hist[:avg_monthly_income],
      monthly_expenses: hist[:avg_monthly_expenses],
      recurring_income: rec[:monthly_income],
      recurring_expenses: rec[:monthly_expenses],
      discretionary: hist[:avg_monthly_income] - rec[:monthly_expenses],
      net_monthly: projected_net.round(2),
      base_currency: @base_currency,
      runway_months: runway_months,
      savings_buffer: savings_buffer.round(2),
      health: health_status(projected_net)
    }
  end

  private

  def recurring_cash_flows
    expenses = @user.recurring_expenses.active.sum do |e|
      convert(e.monthly_amount, e.currency_code)
    end

    income = Transaction.where(user: @user, transaction_type: 'income', recurring: true)
                        .sum { |t| convert(t.amount, t.currency_code) }

    { monthly_income: income, monthly_expenses: expenses }
  end

  def historical_averages
    transactions = Transaction.where(user: @user)
                              .where(transaction_date: 6.months.ago..)

    expense_total = transactions.expenses.sum { |t| convert(t.amount, t.currency_code) }
    income_total = transactions.income.sum { |t| convert(t.amount, t.currency_code) }

    {
      avg_monthly_expenses: expense_total / 6.0,
      avg_monthly_income: income_total / 6.0
    }
  end

  def savings_buffer
    Transaction.where(user: @user, transaction_type: 'income')
               .sum { |t| convert(t.amount, t.currency_code) } -
      Transaction.where(user: @user, transaction_type: 'expense')
                 .sum { |t| convert(t.amount, t.currency_code) }
  end

  def projected(base, recurring, month)
    decay = 1.0 - ((month - 1) * 0.02)
    [(base * (1 - (0.01 * month))) + recurring, base * decay].max
  end

  def confidence_score(month)
    [100 - ((month - 1) * 8), 20].max
  end

  def health_status(net)
    if net.positive?
      net > recurring_cash_flows[:monthly_expenses] * 0.2 ? 'healthy' : 'stable'
    elsif net > -recurring_cash_flows[:monthly_expenses] * 0.1
      'caution'
    else
      'critical'
    end
  end

  def convert(amount, from_currency)
    @exchange.convert(amount, from: from_currency || @base_currency, to: @base_currency) || amount
  end
end
