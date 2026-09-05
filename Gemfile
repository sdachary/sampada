source 'https://rubygems.org'
ruby file: '.ruby-version'

gem 'pg'
gem 'puma', '>= 5.0'
gem 'rails', '~> 7.2.2'

gem 'bootsnap', require: false
gem 'dotenv-rails'
gem 'faraday'
gem 'faraday-retry'
gem 'rack-attack'
gem 'rack-cors'
gem 'redis', '~> 5.0'
gem 'ruby-openai'
gem 'sidekiq'
gem 'sidekiq-cron'
gem 'webpush'

# DPDP — Google Sheets sync. require: false → lazy-loaded inside the
# services, so they don't sit in every Puma/Sidekiq process baseline.
gem 'google-apis-sheets_v4', '~> 0.36', require: false
gem 'googleauth', '~> 1.11', require: false

group :development, :test do
  gem 'brakeman', require: false
  gem 'factory_bot_rails'
  gem 'faker'
  gem 'rspec-rails'
end

group :test do
  gem 'shoulda-matchers'
  gem 'simplecov', require: false
  gem 'webmock'
end

group :development do
  gem 'rubocop', require: false
  gem 'rubocop-rails', require: false
  gem 'rubocop-rspec', require: false
end
