require 'csv'

class ExportService
  FORMATS = %w[csv json].freeze

  def initialize(user)
    @user = user
    @exchange = ExchangeRateService.new
    @base_currency = user.currency
  end

  def export_debts(format: 'csv')
    data = @user.debts.order(created_at: :desc).map { |d| debt_row(d) }
    generate(data, format, 'debts')
  end

  def export_portfolios(format: 'csv')
    data = @user.portfolios.includes(:investments).map { |p| portfolio_row(p) }
    generate(data, format, 'portfolios')
  end

  def export_transactions(format: 'csv', start_date: nil, end_date: nil)
    scope = @user.transactions.order(transaction_date: :desc)
    scope = scope.where(transaction_date: start_date..) if start_date
    scope = scope.where(transaction_date: ..end_date) if end_date
    data = scope.map { |t| transaction_row(t) }
    generate(data, format, 'transactions')
  end

  def export_net_worth(format: 'csv')
    data = @user.net_worth_snapshots.ordered.map do |s|
      {
        date: s.snapshot_date,
        total_assets: s.total_assets.to_f,
        total_liabilities: s.total_liabilities.to_f,
        net_worth: s.net_worth.to_f,
        currency: s.currency_code
      }
    end
    generate(data, format, 'net_worth')
  end

  private

  def debt_row(d)
    {
      name: d.name, category: d.category, amount: d.amount.to_f,
      currency: d.currency_code, interest_rate: d.interest_rate,
      emi_amount: d.emi_amount.to_f, status: d.status,
      paid_amount: d.paid_amount.to_f, remaining: d.remaining_amount.to_f,
      started_at: d.started_at, due_date: d.due_date
    }
  end

  def portfolio_row(p)
    {
      portfolio: p.name, goal: p.goal, total_value: p.total_value.to_f,
      currency: p.currency_code,
      investments: p.investments.map do |i|
        "#{i.symbol} (#{i.shares} shares @ #{i.current_price})"
      end.join('; ')
    }
  end

  def transaction_row(t)
    {
      date: t.transaction_date, description: t.description,
      amount: t.amount.to_f, currency: t.currency_code,
      type: t.transaction_type, category: t.budget_category&.name,
      merchant: t.merchant, notes: t.notes, recurring: t.recurring
    }
  end

  def generate(data, format, _prefix)
    case format
    when 'csv' then generate_csv(data)
    when 'json' then generate_json(data)
    else raise ArgumentError, "Unsupported format: #{format}"
    end
  end

  def generate_csv(data)
    return 'No data' if data.empty?

    headers = data.first.keys
    CSV.generate do |csv|
      csv << headers
      data.each { |row| csv << headers.map { |h| row[h] } }
    end
  end

  def generate_json(data)
    JSON.pretty_generate(data)
  end
end
