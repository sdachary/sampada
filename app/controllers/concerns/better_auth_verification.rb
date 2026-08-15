# frozen_string_literal: true

module BetterAuthVerification
  extend ActiveSupport::Concern

  BETTER_AUTH_VERIFY_URL = ENV.fetch('BETTER_AUTH_VERIFY_URL', 'http://localhost:4000/api/auth/verify')
  BETTER_AUTH_APP_ID = ENV.fetch('BETTER_AUTH_APP_ID', 'sampada')
  BETTER_AUTH_CACHE_TTL = ENV.fetch('BETTER_AUTH_CACHE_TTL', 300).to_i # 5 minutes

  included do
    before_action :authenticate_with_better_auth
  end

  private

  def authenticate_with_better_auth
    token = extract_token
    return render_unauthorized('Missing authorization token') unless token

    user_data = verify_token_with_better_auth(token)
    return render_unauthorized('Invalid or expired token') unless user_data
    return render_unauthorized('Token not valid for this application') unless user_data[:app] == BETTER_AUTH_APP_ID

    @current_user = find_or_create_local_user(user_data)
    @current_better_auth_user_id = user_data[:id]
  end

  def extract_token
    request.headers['Authorization']&.delete_prefix('Bearer ')
  end

  def verify_token_with_better_auth(token)
    cache_key = "better_auth_token:#{Digest::SHA256.hexdigest(token)}"
    cached = Rails.cache.read(cache_key)
    return cached if cached

    response = Faraday.get(BETTER_AUTH_VERIFY_URL) do |req|
      req.headers['Authorization'] = "Bearer #{token}"
      req.options.timeout = 5
      req.options.open_timeout = 2
    end

    return nil unless response.success?

    data = JSON.parse(response.body, symbolize_names: true)
    return nil unless data[:valid] && data[:user]

    user_data = data[:user]
    Rails.cache.write(cache_key, user_data, expires_in: BETTER_AUTH_CACHE_TTL)
    user_data
  rescue Faraday::Error, JSON::ParserError => e
    Rails.logger.warn "[BetterAuth] Verification failed: #{e.message}"
    nil
  end

  def find_or_create_local_user(user_data)
    better_auth_user_id = user_data[:id]
    email = user_data[:email]
    name = user_data[:name]

    user = User.find_by(better_auth_user_id: better_auth_user_id)
    return user if user

    # Try to find by email for existing users being migrated
    user = User.find_by(email: email)
    if user
      user.update!(better_auth_user_id: better_auth_user_id)
      return user
    end

    # Create new user
    first_name, last_name = split_name(name)
    User.create!(
      email: email,
      first_name: first_name,
      last_name: last_name,
      better_auth_user_id: better_auth_user_id,
      onboarded: false
    )
  end

  def split_name(name)
    return ['', ''] if name.blank?

    parts = name.strip.split(' ', 2)
    [parts[0], parts[1] || '']
  end

  def current_user
    @current_user
  end

  def current_better_auth_user_id
    @current_better_auth_user_id
  end
end
