class Portfolio < TenantRecord
  belongs_to :user
  has_many :investments, dependent: :destroy
  has_many :dividend_sips, dependent: :destroy
  has_one :rebalance_config, dependent: :destroy

  validates :name, presence: true
  validates :risk_tolerance, numericality: { greater_than: 0, less_than_or_equal_to: 1 }, allow_nil: true
  validates :goal, inclusion: { in: %w[growth income balanced conservative] }, allow_nil: true
  validates :currency_code, inclusion: { in: Currency::CURRENCY_SYMBOLS.keys }, allow_nil: true

  def total_value
    investments.sum { |i| (i.shares || 0) * (i.current_price || 0) }
  end

  def allocation_summary
    by_sector = investments.group_by(&:sector).transform_values do |inv|
      inv.sum do |i|
        (i.shares || 0) * (i.current_price || 0)
      end
    end
    { sectors: by_sector, dividend_sips: dividend_sips.sum(:amount) }
  end

  def rebalance_config_or_build
    rebalance_config || build_rebalance_config
  end

  def holdings_for_rebalance
    investments.where.not(current_price: [nil, 0]).where.not(shares: [nil, 0]).map(&:to_holding_position)
  end
end