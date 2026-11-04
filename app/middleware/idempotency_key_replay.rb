# frozen_string_literal: true

# Replays responses for /api/v1/* POSTs that carry an Idempotency-Key header
# (the offline retry queue re-sends queued mutations after a reconnect, and a
# request may already have succeeded before the client got the response).
# Keys are held for 24h; the key is reserved with SET NX while the request is
# in flight; Redis errors fail open before the app runs so availability is
# never reduced by this middleware.
class IdempotencyKeyReplay
  KEY_TTL = 24 * 60 * 60
  PREFIX = 'idem:'

  def self.redis_client
    @redis ||= Redis.new(url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0'))
  end

  def initialize(app)
    @app = app
  end

  def call(env)
    idem = env['HTTP_IDEMPOTENCY_KEY']
    return @app.call(env) unless idem && env['REQUEST_METHOD'] == 'POST' && env['PATH_INFO'].to_s.start_with?('/api/v1/')

    cache_key = "#{PREFIX}#{Digest::SHA256.hexdigest("#{env['PATH_INFO']}:#{idem}")}"
    begin
      redis = self.class.redis_client
      cached = redis.get(cache_key)
      return replay(cached) if cached
      reserved = redis.set(cache_key, 'pending', nx: true, ex: KEY_TTL)
    rescue Redis::BaseError
      return @app.call(env) # fail open: never block the request for Redis trouble
    end
    return conflict unless reserved

    status, headers, body = @app.call(env)
    begin
      if status.between?(200, 299)
        redis.set(cache_key, serialize(status, headers, body), ex: KEY_TTL)
      else
        redis.del(cache_key) # failed requests may be retried
      end
    rescue Redis::BaseError
      # the response is still returned; replay is best-effort here
    end
    [status, headers, body]
  end

  private

  def serialize(status, headers, body)
    JSON.generate(
      status: status,
      content_type: headers['Content-Type'],
      body: string_body(body)
    )
  end

  def string_body(body)
    return body if body.is_a?(String)

    parts = []
    body.each { |part| parts << part.to_s }
    parts.join
  ensure
    body.close if body.respond_to?(:close)
  end

  def replay(cached)
    payload = JSON.parse(cached)
    [payload['status'], { 'Content-Type' => payload['content_type'].to_s }, payload['body'].to_s]
  end

  def conflict
    [409, { 'Content-Type' => 'application/json' }, [JSON.generate(success: false, message: 'Request already in progress')]]
  end
end
