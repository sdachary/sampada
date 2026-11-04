# frozen_string_literal: true

module Api
  class FeatureFlagsController < Api::BaseController
    def index
      render_success({ flags: FeatureFlags.all(user: current_user) })
    end

    def update
      key = params[:key].to_s
      return render_error('Unknown feature flag', status: :not_found) unless FeatureFlags::FEATURES.include?(key)

      enabled = ActiveModel::Type::Boolean.new.cast(params[:enabled])
      if enabled
        FeatureFlags.enable(key, user: current_user)
      else
        FeatureFlags.disable(key, user: current_user)
      end

      render_success({ key: key, enabled: FeatureFlags.enabled?(key, user: current_user) })
    end
  end
end
