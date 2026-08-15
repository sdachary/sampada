class AnnualReportService
  def initialize(user, year: Time.zone.today.year)
    @user = user
    @year = year
    @exchange = ExchangeRateService.new
    @base_currency = user.currency
  end

  def generate
    {
      year: @year,
      generated_at: Time.current,
      currency: @base_currency,
      currency_symbol: Currency.symbol_for(@base_currency),
      summary: full_summary,
      monthly_breakdown: monthly_data,
      categories: category_breakdown,
      net_worth_trajectory: net_worth_data,
      debts: debt_summary,
      investments: investment_summary
    }
  end

  private

  def full_summary
    year_start = Date.new(@year, 1, 1)
    year_end = Date.new(@year, 12, 31)

    total_income = @user.transactions.income
                        .where(transaction_date: year_start..year_end)
                        .sum { |t| convert(t.amount, t.currency_code) }

    total_expenses = @user.transactions.expenses
                          .where(transaction_date: year_start..year_end)
                          .sum { |t| convert(t.amount, t.currency_code) }

    start_nw = @user.net_worth_snapshots.where(snapshot_date: year_start).first
    end_nw = @user.net_worth_snapshots.where(snapshot_date: [year_end, Time.zone.today].min).first

    {
      total_income: total_income.round(2),
      total_expenses: total_expenses.round(2),
      net_savings: (total_income - total_expenses).round(2),
      savings_rate: total_income.positive? ? ((total_income - total_expenses) / total_income * 100).round(1) : 0,
      start_net_worth: start_nw&.net_worth&.to_f || 0,
      end_net_worth: end_nw&.net_worth&.to_f || 0,
      net_worth_change: (end_nw&.net_worth.to_f - start_nw&.net_worth.to_f).round(2)
    }
  end

  def monthly_data
    (1..12).map do |month|
      income = @user.transactions.income.for_month(@year, month)
                    .sum { |t| convert(t.amount, t.currency_code) }
      expenses = @user.transactions.expenses.for_month(@year, month)
                      .sum { |t| convert(t.amount, t.currency_code) }

      {
        month: Date.new(@year, month, 1).strftime('%b'),
        income: income.round(2),
        expenses: expenses.round(2),
        net: (income - expenses).round(2)
      }
    end
  end

  def category_breakdown
    BudgetCategory.where(user: @user).active.map do |cat|
      spent = cat.transactions
                 .where(user: @user)
                 .where('EXTRACT(YEAR FROM transaction_date) = ?', @year)
                 .sum { |t| convert(t.amount, t.currency_code) }
      {
        category: cat.name,
        total: spent.round(2),
        percentage: 0,
        transaction_count: cat.transactions
                              .where(user: @user)
                              .where('EXTRACT(YEAR FROM transaction_date) = ?', @year).count
      }
    end.sort_by { |c| -c[:total] }.tap do |cats|
      total = cats.sum { |c| c[:total] }
      cats.each { |c| c[:percentage] = total.positive? ? (c[:total] / total * 100).round(1) : 0 }
    end
  end

  def net_worth_data
    @user.net_worth_snapshots
         .where(snapshot_date: Date.new(@year, 1, 1)..)
         .ordered
         .map { |s| { date: s.snapshot_date, net_worth: s.net_worth.to_f } }
  end

  def debt_summary
    debts = @user.debts
    {
      total: debts.sum { |d| convert(d.remaining_amount, d.currency_code) }.round(2),
      active_count: debts.active.count,
      paid_off: debts.where(status: 'paid_off').count,
      by_category: debts.group(:category).count
    }
  end

  def investment_summary
    portfolios = @user.portfolios
    {
      total_value: portfolios.sum(&:total_value).round(2),
      count: portfolios.count,
      by_goal: portfolios.group(:goal).count
    }
  end

  def convert(amount, from_currency)
    @exchange.convert(amount, from: from_currency || @base_currency, to: @base_currency) || amount
  end
end
