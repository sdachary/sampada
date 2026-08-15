class SyncCleanerJob
  include Sidekiq::Job

  sidekiq_options queue: :low_priority, retry: 1

  def perform(*_args)
    stale_rates = ExchangeRate.stale
    return unless stale_rates.any?

    ExchangeRateSyncJob.perform_async
    Rails.logger.info "[SyncCleaner] Queued exchange rate sync for #{stale_rates.count} stale rates"
  end
end
