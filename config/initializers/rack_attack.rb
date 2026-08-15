module Rack
  class Attack
    cache.store = if ENV['REDIS_URL'].present?
                    ActiveSupport::Cache::RedisCacheStore.new(url: ENV['REDIS_URL'], pool: false)
                  else
                    ActiveSupport::Cache::MemoryStore.new
                  end

    # Throttle all POST/PUT/PATCH/DELETE to /api/ (write operations)
    throttle('api/write', limit: 30, period: 1.minute) do |req|
      req.ip if req.path.start_with?('/api/') && (req.post? || req.put? || req.patch? || req.delete?)
    end

    # Throttle conversation creation
    throttle('conversations/create', limit: 10, period: 1.minute) do |req|
      req.ip if req.post? && req.path == '/conversations'
    end

    # Throttle message creation per conversation
    throttle('messages/create', limit: 30, period: 1.minute) do |req|
      req.ip if req.post? && req.path.match?(%r{^/conversations/\d+/messages$})
    end

    # Block IPs with suspicious request patterns
    blocklist('fail2ban auth') do |req|
      Rack::Attack::Fail2Ban.filter(
        "fail2ban-#{req.ip}",
        maxretry: 20,
        findtime: 10.minutes,
        bantime: 30.minutes
      ) do
        req.path.start_with?('/admin', '/wp-', '/.env', '/wp-login.php', '/xmlrpc.php')
      end
    end
  end
end

Rails.application.config.middleware.use Rack::Attack
