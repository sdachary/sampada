class ExchangeRateService
  PROVIDERS = {
    'yahoo_finance' => Providers::YahooFinanceAdapter
  }.freeze

  def initialize(provider: default_provider)
    @provider = provider
  end

  def fetch_rate(from:, to:)
    return 1.0 if from == to

    rate = fetch_from_provider(from, to)
    return nil unless rate&.positive?

    upsert_rate(from, to, rate)
    rate
  end

  def convert(amount, from:, to:)
    return amount if from == to

    rate = fetch_rate(from: from, to: to)
    return nil unless rate

    (amount * rate).round(4)
  end

  def convert_cents(amount_cents, from:, to:)
    return amount_cents if from == to

    rate = fetch_rate(from: from, to: to)
    return nil unless rate

    (amount_cents * rate).round
  end

  def self.sync_all(base_currency: 'USD')
    service = new
    Currency.active.pluck(:code).each do |code|
      next if code == base_currency

      service.fetch_rate(from: code, to: base_currency)
    end
  end

  private

  def default_provider
    ENV.fetch('EXCHANGE_RATE_PROVIDER', 'yahoo_finance')
  end

  def fetch_from_provider(from, to)
    adapter = PROVIDERS[@provider]&.new
    return nil unless adapter

    adapter.fetch_exchange_rate(from, to)
  end

  def upsert_rate(from, to, rate)
    exchange_rate = ExchangeRate.find_or_initialize_by(from_currency: from, to_currency: to)
    exchange_rate.update!(
      rate: rate,
      source: @provider,
      fetched_at: Time.current
    )
  rescue ActiveRecord::RecordInvalid => e
    Rails.logger.warn "[ExchangeRate] Failed to save #{from}->#{to}: #{e.message}"
  end
end
