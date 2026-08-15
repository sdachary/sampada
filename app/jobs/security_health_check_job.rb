class SecurityHealthCheckJob
  include Sidekiq::Job

  sidekiq_options queue: :maintenance, retry: 2

  def perform(*_args)
    stale_investments = Investment.where(updated_at: ...7.days.ago)
    Rails.logger.info "[SecurityHealthCheck] #{stale_investments.count} investments stale (not updated in 7 days)"

    stale_investments.find_each do |inv|
      Rails.logger.warn "[SecurityHealthCheck] Stale: #{inv.symbol} (#{inv.name}) — last updated #{inv.updated_at}"
    end

    missing_prices = Investment.where(current_price: nil).where.not(symbol: nil)
    return unless missing_prices.any?

    Rails.logger.warn "[SecurityHealthCheck] #{missing_prices.count} investments missing prices"
    ImportMarketDataJob.perform_async
  end
end
