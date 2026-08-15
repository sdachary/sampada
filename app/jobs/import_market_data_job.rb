class ImportMarketDataJob
  include Sidekiq::Job

  sidekiq_options queue: :market_data, retry: 3, backtrace: true

  def perform(*_args)
    provider = Providers::YahooFinanceAdapter.new
    Investment.find_each do |investment|
      next if investment.symbol.blank?

      quote = provider.fetch_quote(investment.symbol)
      next unless quote

      investment.update!(
        current_price: quote[:price],
        currency_code: quote[:currency] || investment.currency_code
      )
      update_dividend(investment, provider)
    end
    Rails.logger.info "[ImportMarketData] Updated #{Investment.count} investments"
  end

  private

  def update_dividend(investment, provider)
    div = provider.fetch_dividend(investment.symbol)
    return unless div

    investment.update!(dividend_yield: div[:yield])
  end
end
