source "https://rubygems.org"
ruby file: ".ruby-version"

gem "rails", "~> 7.2.2"
gem "pg"
gem "puma", ">= 5.0"

gem "rack-cors"
gem "bootsnap", require: false
gem "dotenv-rails"
gem "money-rails"
gem "sidekiq"
gem "sidekiq-cron"
gem "ruby-openai"
gem "rack-attack"
gem "redis", "~> 5.0"
gem "sentry-ruby"
gem "sentry-rails"
gem "faraday"
gem "faraday-retry"

# DPDP — Google Sheets sync
gem "google-apis-sheets_v4", "~> 0.36"
gem "googleauth", "~> 1.11"

group :development, :test do
  gem "rspec-rails"
  gem "factory_bot_rails"
  gem "faker"
end

group :test do
  gem "simplecov", require: false
  gem "webmock"
  gem "shoulda-matchers"
end

group :development do
  gem "rubocop", require: false
  gem "rubocop-rails", require: false
  gem "rubocop-rspec", require: false
end
