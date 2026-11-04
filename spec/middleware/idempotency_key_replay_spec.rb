require 'rails_helper'

RSpec.describe IdempotencyKeyReplay do
  let(:middleware) { described_class.new(->(_env) { [200, { 'Content-Type' => 'application/json' }, ['{"success":true}']] }) }

  around do |example|
    example.run
    described_class.redis_client.keys('idem:*').each { |k| described_class.redis_client.del(k) }
  end

  def post_env(path: '/api/v1/debts', key: nil)
    Rack::MockRequest.env_for(path, method: 'POST').tap do |env|
      env['HTTP_IDEMPOTENCY_KEY'] = key if key
    end
  end

  def cached_entry(path, key)
    described_class.redis_client.get("idem:#{Digest::SHA256.hexdigest("#{path}:#{key}")}")
  end

  it 'passes through requests without an Idempotency-Key' do
    status, _headers, body = middleware.call(post_env)
    expect(status).to eq(200)
    expect(body.first).to eq('{"success":true}')
    expect(described_class.redis_client.keys('idem:*')).to be_empty
  end

  it 'ignores GETs even with a key' do
    called = 0
    inner = ->(_e) { called += 1; [200, {}, ['ok']] }
    env = Rack::MockRequest.env_for('/api/v1/debts', method: 'GET').tap { |e| e['HTTP_IDEMPOTENCY_KEY'] = 'k' }
    described_class.new(inner).call(env)
    expect(called).to eq(1)
    expect(described_class.redis_client.keys('idem:*')).to be_empty
  end

  it 'replays the cached response for a repeated key without re-executing' do
    calls = 0
    inner = ->(_e) { calls += 1; [200, { 'Content-Type' => 'application/json' }, ['{"success":true}']] }
    mw = described_class.new(inner)

    mw.call(post_env(key: 'k1'))
    expect(calls).to eq(1)

    status, headers, body = mw.call(post_env(key: 'k1'))
    expect(status).to eq(200)
    expect(headers['Content-Type']).to eq('application/json')
    expect(body.first).to eq('{"success":true}')
    expect(calls).to eq(1) # not re-executed
  end

  it 'keys storage per path' do
    middleware.call(post_env(path: '/api/v1/a', key: 'k'))
    middleware.call(post_env(path: '/api/v1/b', key: 'k'))
    expect(cached_entry('/api/v1/a', 'k')).to be_present
    expect(cached_entry('/api/v1/b', 'k')).to be_present
  end

  it 'does not cache failed responses so they can be retried' do
    failing = described_class.new(->(_e) { [422, { 'Content-Type' => 'application/json' }, ['{}']] })
    status, = failing.call(post_env(key: 'retry'))
    expect(status).to eq(422)
    expect(cached_entry('/api/v1/debts', 'retry')).to be_nil
  end

  it 'stores enough to reconstruct the response' do
    middleware.call(post_env(key: 'k9'))
    entry = JSON.parse(cached_entry('/api/v1/debts', 'k9'))
    expect(entry['status']).to eq(200)
    expect(entry['content_type']).to eq('application/json')
    expect(entry['body']).to eq('{"success":true}')
  end
end
