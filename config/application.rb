require_relative 'boot'
require_relative '../app/middleware/idempotency_key_replay'
require 'rails/all'
Bundler.require(*Rails.groups)

module Sampada
  class Application < Rails::Application
    config.load_defaults 8.1

    # Replay offline-queue retries that carry an Idempotency-Key (app/middleware).
    config.middleware.insert_before ActionDispatch::Executor, IdempotencyKeyReplay

    config.autoload_lib(ignore: %w[tasks generators])
    config.i18n.fallbacks = true
  end
end
