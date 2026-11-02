class Investment < TenantRecord
  belongs_to :portfolio
  belongs_to :sector, optional: true

  INSTRUMENT_SUB_TYPES = %w[Dividend Growth].freeze

  validates :investment_type, inclusion: {
    in: %w[stock etf mutual_fund bond other]
  }, allow_nil: true
  validates :currency_code, inclusion: { in: Currency::CURRENCY_SYMBOLS.keys }, allow_nil: true
  validates :exchange, inclusion: {
    in: %w[NSE BSE NYSE NASDAQ LSE TSE FRA ASX HKEX TSX OTHER]
  }, allow_nil: true
  validates :instrument_sub_type, inclusion: { in: INSTRUMENT_SUB_TYPES }

  EXCHANGE_SUFFIXES = {
    'NSE' => '.NS', 'BSE' => '.BO', 'NYSE' => '',
    'NASDAQ' => '', 'LSE' => '.L', 'TSE' => '.T',
    'FRA' => '.F', 'ASX' => '.AX', 'HKEX' => '.HK',
    'TSX' => '.TO'
  }.freeze

  def yahoo_symbol
    suffix = EXCHANGE_SUFFIXES[exchange]
    suffix.present? ? "#{symbol}#{suffix}" : symbol
  end

  def expected_return
    (dividend_yield || 0) / 100.0
  end

  def volatility
    0.20
  end

  def current_value
    (shares || 0) * (current_price || 0)
  end

  def cost_basis
    (shares || 0) * (buy_price || 0)
  end

  def gain_loss
    current_value - cost_basis
  end

  def gain_loss_percentage
    return 0.0 if cost_basis <= 0
    (gain_loss / cost_basis * 100).round(2)
  end

  def projected_annual_income
    current_value * (dividend_yield || 0) / 100.0
  end

  def calculate_sip(monthly_amount, months)
    total_invested = monthly_amount * months
    rate_per_period = (dividend_yield || 0) / 100.0 / 12
    projected_value = monthly_amount * ((((1 + rate_per_period)**months) - 1) / rate_per_period) * (1 + rate_per_period)
    projected_value = total_invested unless rate_per_period.positive?
    { projected_value: projected_value.round(2), total_invested: total_invested }
  end

  def project_income(principal)
    principal * (dividend_yield || 0) / 100.0
  end

  # Rebalance v2 helpers
  def rebalance_type
    instrument_sub_type
  end

  def rebalance_settings
    self[:rebalance_settings] || {}
  end

  def rebalance_target_weight
    rebalance_settings['targetWeight']
  end

  def rebalance_conviction
    rebalance_settings['conviction'] || false
  end

  def rebalance_paused
    rebalance_settings['paused'] || false
  end

  def rebalance_trend
    rebalance_settings['trend']
  end

  def rebalance_mom6m
    rebalance_settings['mom6m']
  end

  def rebalance_sector
    sector&.name || rebalance_settings['sector']
  end

  def to_holding_position
    {
      instrument: symbol,
      quantity: shares.to_f,
      avgCost: buy_price.to_f,
      ltp: (current_price || 0).to_f,
      type: rebalance_type,
      sector: rebalance_sector,
      targetWeight: rebalance_target_weight,
      conviction: rebalance_conviction,
      paused: rebalance_paused,
      trend: rebalance_trend,
      mom6m: rebalance_mom6m,
    }
  end
end