class NetWorthSnapshot < TenantRecord
  belongs_to :user

  validates :snapshot_date, presence: true
  validates :snapshot_date, uniqueness: { scope: :user_id }

  scope :ordered, -> { order(snapshot_date: :asc) }
  scope :recent, -> { order(snapshot_date: :desc).limit(30) }

  def self.current(user)
    where(user: user).ordered.last || create_snapshot(user)
  end

  def self.create_snapshot(user)
    existing = where(user: user, snapshot_date: Date.today).first
    return existing if existing

    currency = user.currency
    exchange_service = ExchangeRateService.new
    active_debts = Debt.where(user: user, status: "active")
    portfolio_value = Portfolio.where(user: user)

    total_liabilities = active_debts.sum do |d|
      remaining = d.remaining_amount
      exchange_service.convert(remaining, from: d.currency_code, to: currency) || remaining
    end

    total_assets = portfolio_value.sum do |p|
      pv = p.total_value
      exchange_service.convert(pv, from: p.currency_code, to: currency) || pv
    end

    net_worth = total_assets - total_liabilities

    create!(
      user: user,
      snapshot_date: Date.today,
      total_assets: total_assets,
      total_liabilities: total_liabilities,
      net_worth: net_worth,
      currency_code: currency,
      breakdown: {
        debts: total_liabilities,
        portfolios: total_assets,
        base_currency: currency
      }
    )
  end
end
