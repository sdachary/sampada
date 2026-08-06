require_relative "boot"
require "rails/all"
Bundler.require(*Rails.groups)

module Sampada
  class Application < Rails::Application
    config.load_defaults 7.2
    config.autoload_lib(ignore: %w[tasks generators])
    config.autoload_paths += %W[#{config.root}/app/middleware]
    config.i18n.fallbacks = true
  end
end
