# frozen_string_literal: true

module Ai
  class Provider
    def initialize(user)
      @user = user
    end

    def call(prompt, system_prompt)
      client = OpenAI::Client.new(
        access_token: api_token,
        uri_base: ai_uri,
        log_errors: Rails.env.development?
      )

      messages = [
        { role: "system", content: system_prompt },
        { role: "user", content: prompt }
      ]

      response = client.chat(
        parameters: {
          model: ai_model,
          messages: messages,
          temperature: 0.3,
          max_tokens: 1024
        }
      )

      response.dig("choices", 0, "message", "content")
    rescue Faraday::Error, OpenAI::Error => e
      Rails.logger.warn "[AI] API call failed: #{e.message}"
      nil
    end

    def configured?
      provider_setting.present? && api_token.present? && ai_uri.present? && ai_model.present?
    end

    def cloud_provider?
      provider_setting.present?
    end

    def self.presets
      {
        "openai"     => { uri: "https://api.openai.com/v1",        model: "gpt-4o-mini" },
        "gemini"     => { uri: "https://generativelanguage.googleapis.com/v1beta/openai/", model: "gemini-1.5-flash" },
        "grok"       => { uri: "https://api.x.ai/v1",              model: "grok-beta" },
        "openrouter" => { uri: "https://openrouter.ai/api/v1",     model: "openai/gpt-4o-mini" }
      }
    end

    private

    def provider_setting
      Setting.get("ai_provider", user: @user)
    end

    def api_token
      if provider_setting.present?
        Setting.get("ai_api_key", user: @user).presence || ENV["OPENAI_ACCESS_TOKEN"]
      else
        "ollama"
      end
    end

    def ai_uri
      Setting.get("ai_uri", user: @user).presence ||
        ENV["OPENAI_URI_BASE"].presence ||
        "http://localhost:11434/v1"
    end

    def ai_model
      Setting.get("ai_model", user: @user).presence ||
        ENV["OPENAI_MODEL"].presence ||
        "gemma:2b"
    end
  end
end
