require 'sidekiq/web'

if Rails.env.production?
  Sidekiq::Web.use(Rack::Auth::Basic) do |username, password|
    configured_username = Digest::SHA256.hexdigest(ENV.fetch('SIDEKIQ_WEB_USERNAME', 'kubera'))
    configured_password = Digest::SHA256.hexdigest(ENV.fetch('SIDEKIQ_WEB_PASSWORD', 'kubera'))

    ActiveSupport::SecurityUtils.secure_compare(Digest::SHA256.hexdigest(username), configured_username) &
      ActiveSupport::SecurityUtils.secure_compare(Digest::SHA256.hexdigest(password), configured_password)
  end
end

redis_config = { url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0') }

Sidekiq.configure_server do |config|
  config.redis = redis_config
end

Sidekiq.configure_client do |config|
  config.redis = redis_config
end
