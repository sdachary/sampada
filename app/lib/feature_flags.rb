# frozen_string_literal: true

module FeatureFlags
  FEATURES = %w[pdf_import recurring_detection passkeys].freeze

  def self.enabled?(key, user:)
    FEATURES.include?(key.to_s) && Setting.get("#{key}_enabled", user: user) != 'off'
  end

  def self.all(user:)
    FEATURES.index_with { |key| enabled?(key, user: user) }
  end

  def self.enable(key, user:)
    Setting.set("#{key}_enabled", 'on', user: user)
  end

  def self.disable(key, user:)
    Setting.set("#{key}_enabled", 'off', user: user)
  end
end
