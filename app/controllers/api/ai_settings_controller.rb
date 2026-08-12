# frozen_string_literal: true

class Api::AiSettingsController < Api::BaseController
  PRESET_KEYS = %w[ai_provider ai_api_key ai_uri ai_model].freeze

  def show
    provider = Setting.get("ai_provider", user: current_user)
    configured = Ai::Provider.new(current_user).configured?
    render_success({
      provider: provider,
      configured: configured,
      key_present: Setting.get("ai_api_key", user: current_user).present?,
      model: Setting.get("ai_model", user: current_user) || Ai::Provider.presets.dig(provider, :model),
      presets: Ai::Provider.presets
    })
  end

  def update
    provider = params[:provider].to_s.downcase
    preset = Ai::Provider.presets[provider]

    unless preset
      return render_error("Unsupported provider — choose: #{Ai::Provider.presets.keys.join(', ')}", status: :unprocessable_entity)
    end

    Setting.set("ai_provider", provider, user: current_user)

    if params[:api_key].present?
      Setting.set("ai_api_key", params[:api_key], user: current_user)
    else
      Setting.find_by(user: current_user, key: "ai_api_key")&.destroy
    end

    Setting.set("ai_uri", params[:uri].presence || preset[:uri], user: current_user)
    Setting.set("ai_model", params[:model].presence || preset[:model], user: current_user)

    render_success({
      provider: provider,
      configured: Ai::Provider.new(current_user).configured?,
      key_present: Setting.get("ai_api_key", user: current_user).present?
    })
  end

  def destroy
    Setting.where(user: current_user, key: PRESET_KEYS).delete_all
    render_success({ configured: false })
  end
end