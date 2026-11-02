class RebalanceConfig < TenantRecord
  belongs_to :portfolio

  TARGET_MODES = %w[equal current invested].freeze

  validates :contribution, numericality: { greater_than_or_equal_to: 0 }
  validates :dividend_ratio, :growth_ratio, numericality: { greater_than_or_equal_to: 0 }
  validate :ratios_not_both_zero
  validates :target_mode, inclusion: { in: TARGET_MODES }
  validates :max_position_weight, numericality: { greater_than: 0, less_than_or_equal_to: 1 }
  validates :max_sector_weight, numericality: { greater_than: 0, less_than_or_equal_to: 1 }
  validates :max_add_share, numericality: { greater_than: 0, less_than_or_equal_to: 1 }
  validates :fee_reserve_pct, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 0.1 }
  validates :min_order_value, numericality: { greater_than_or_equal_to: 0 }
  validates :max_orders, numericality: { greater_than: 0, only_integer: true }

  after_initialize :set_defaults, if: :new_record?

  def to_engine_config
    {
      contribution: contribution.to_f,
      dividendRatio: dividend_ratio.to_f,
      growthRatio: growth_ratio.to_f,
      dipThreshold: dip_threshold.to_f,
      dipBoost: dip_boost.to_f,
      trendDownPenalty: trend_down_penalty.to_f,
      momentumTilt: momentum_tilt.to_f,
      maxPositionWeight: max_position_weight.to_f,
      maxSectorWeight: max_sector_weight.to_f,
      maxAddShare: max_add_share.to_f,
      feeReservePct: fee_reserve_pct.to_f,
      minOrderValue: min_order_value.to_f,
      maxOrders: max_orders,
      targetMode: target_mode,
    }
  end

  def sleeve_mix
    { dividend: dividend_ratio.to_f, growth: growth_ratio.to_f }
  end

  private

  def set_defaults
    self.contribution ||= 21000
    self.dividend_ratio ||= 0.6
    self.growth_ratio ||= 0.4
    self.dip_threshold ||= -0.10
    self.dip_boost ||= 1.25
    self.trend_down_penalty ||= 0.5
    self.momentum_tilt ||= 0.25
    self.max_position_weight ||= 0.10
    self.max_sector_weight ||= 0.25
    self.max_add_share ||= 0.30
    self.fee_reserve_pct ||= 0.003
    self.min_order_value ||= 500
    self.max_orders ||= 8
    self.target_mode ||= 'equal'
  end

  def ratios_not_both_zero
    if dividend_ratio.to_f <= 0 && growth_ratio.to_f <= 0
      errors.add(:base, 'At least one of dividend_ratio or growth_ratio must be greater than zero')
    end
  end
end