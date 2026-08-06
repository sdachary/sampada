class Portfolio < TenantRecord
  belongs_to :user
  has_many :investments, dependent: :destroy
  has_many :dividend_sips, dependent: :destroy

  validates :name, presence: true
  validates :risk_tolerance, numericality: { greater_than: 0, less_than_or_equal_to: 1 }, allow_nil: true
  validates :goal, inclusion: { in: %w[growth income balanced conservative] }, allow_nil: true
  validates :currency_code, inclusion: { in: Currency::CURRENCY_SYMBOLS.keys }, allow_nil: true

  def total_value
    investments.sum { |i| (i.shares || 0) * (i.current_price || 0) }
  end

  def allocation_summary
    by_sector = investments.group_by(&:sector).transform_values { |inv| inv.sum { |i| (i.shares || 0) * (i.current_price || 0) } }
    { sectors: by_sector, dividend_sips: dividend_sips.sum(:amount) }
  end
end
