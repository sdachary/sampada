# frozen_string_literal: true

class PriceRefreshJob
  include Sidekiq::Job
  sidekiq_options queue: :default, retry: 3, backtrace: true

  QUOTE_CACHE_PREFIX = "portfolio_quote:"
  QUOTE_CACHE_TTL = 15.minutes

  def perform(portfolio_id)
    portfolio = Portfolio.find_by(id: portfolio_id)
    return unless portfolio

    adapter = Providers::AlphaVantageAdapter.new
    fresh = portfolio.investments.filter_map do |inv|
      quote = adapter.fetch_quote(inv.yahoo_symbol)
      next unless quote

      {
        id: inv.id,
        symbol: inv.symbol,
        name: inv.name,
        price: quote[:price],
        change: quote[:change],
        change_pct: quote[:change_pct],
        buy_price: inv.buy_price,
        shares: inv.shares,
        gain: quote[:price] && inv.buy_price ? (quote[:price] - inv.buy_price) * (inv.shares || 0) : nil
      }
    end

    Rails.cache.write("#{QUOTE_CACHE_PREFIX}#{portfolio.id}", fresh, expires_in: QUOTE_CACHE_TTL)
    Rails.logger.info "[PriceRefresh] cached #{fresh.size} quotes for portfolio #{portfolio.id}"
  end
end