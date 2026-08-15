class ExchangeRateSyncJob
  include Sidekiq::Job

  sidekiq_options queue: :default, retry: 3, backtrace: true

  def perform(base_currency = 'USD')
    ExchangeRateService.sync_all(base_currency: base_currency)
    Rails.logger.info "[ExchangeRateSync] Synced all currencies against #{base_currency}"
  end
end
