# frozen_string_literal: true

module Ai
  class SetupService
    def initialize(user)
      @user = user
    end

    def setup_conversation?(prompt)
      down = prompt.to_s.downcase
      !configured? && (
        down.include?('setup') || down.include?('configure') ||
        down.include?('enable ai') || down.include?('turn on ai') ||
        down.match?(/\b(ollama|openrouter|api.key|api_key)\b/)
      )
    end

    def handle(prompt)
      down = prompt.to_s.downcase
      sys = SystemDetector.summary

      if down.include?('ollama') && !sys[:ollama_installed]
        return AiResponse.new(
          text: "Ollama isn't installed on your system yet. To install it:\n\n" \
                "1. Visit https://ollama.com and download the installer\n" \
                "2. After installing, run: `ollama pull gemma:2b`\n" \
                "3. Then tell me 'Ollama is ready' and I'll configure Sampada to use it!\n\n" \
                "Your system has #{sys[:ram_mb]}MB RAM — it can run smaller models well.",
          setup: { type: :awaiting_ollama_ready }
        )
      end

      if down.include?('ollama') && sys[:ollama_installed] && !sys[:ollama_running]
        return AiResponse.new(
          text: "Ollama is installed but not running. Can you start it?\n\n" \
                "Open a terminal and run: `ollama serve`\n" \
                "Then pull a model: `ollama pull gemma:2b`\n" \
                "Once it's running, tell me 'Ollama is ready'!",
          setup: { type: :awaiting_ollama_start }
        )
      end

      if down.include?('ollama') && sys[:ollama_running]
        save_setting('ai_provider', 'ollama')
        save_setting('ai_model', 'gemma:2b')
        save_setting('ai_uri', 'http://localhost:11434/v1')
        return AiResponse.new(
          text: "Perfect! I've configured Sampada to use Ollama locally with Gemma 2B. " \
                "Your data stays on your machine — completely private.\n\n" \
                'Now, what financial question can I help you with?',
          setup: { type: :complete, provider: 'ollama' }
        )
      end

      if down.include?('openrouter') || down.include?('api key') || down.include?('api_key')
        if down.include?('sk-or-')
          save_setting('ai_provider', 'openrouter')
          save_setting('ai_api_key', extract_key(prompt))
          save_setting('ai_model', 'google/gemini-2.0-flash-lite-001')
          save_setting('ai_uri', 'https://openrouter.ai/api/v1')
          return AiResponse.new(
            text: "Got your OpenRouter key! I've saved it securely. You're all set up.\n\n" \
                  '🔒 **Privacy note**: When using cloud AI, your financial summaries ' \
                  '(debt amounts, portfolio values) are sent to help me answer accurately. ' \
                  "No personal info (names, emails) is shared.\n\n" \
                  'What would you like to work on?',
            setup: { type: :complete, provider: 'openrouter' }
          )
        end

        return AiResponse.new(
          text: "To use OpenRouter's free AI:\n\n" \
                "1. Go to https://openrouter.ai/keys\n" \
                "2. Sign up (free) and create a key\n" \
                "3. Paste the key here (it starts with 'sk-or-') and I'll save it\n\n" \
                'The free tier includes models like Gemini Flash — perfect for personal finance.',
          setup: { type: :awaiting_api_key, provider: 'openrouter' }
        )
      end

      if down.include?('no') || down.include?('skip') || down.include?('not now')
        save_setting('ai_provider', 'disabled')
        return AiResponse.new(
          text: "No problem! I'll use my built-in financial knowledge to help you. " \
                "You can always enable AI later by saying 'setup AI'.",
          setup: { type: :skipped }
        )
      end

      if sys[:local_ai_viable?]
        AiResponse.new(
          text: "Great news! Your system (#{sys[:ram_mb]}MB RAM, #{sys[:cpu_cores]} cores) " \
                "can run a local AI model.\n\n" \
                "**Option 1: Local AI (Ollama)** — Fully private, runs on your machine\n" \
                "**Option 2: OpenRouter (Cloud)** — Smarter models, needs a free API key\n" \
                "**Option 3: No AI** — I'll use built-in financial advice\n\n" \
                "Which sounds best? Just say 'Ollama', 'OpenRouter', or 'skip'.",
          setup: { type: :awaiting_choice }
        )
      else
        AiResponse.new(
          text: "Your system has #{sys[:ram_mb]}MB RAM — not enough for local AI " \
                "(needs 8GB+). But you can still use cloud AI!\n\n" \
                "**Option 1: OpenRouter (Cloud)** — Free tier available, needs API key\n" \
                "**Option 2: No AI** — I'll use built-in financial advice\n\n" \
                "Which sounds best? Say 'OpenRouter' or 'skip'.",
          setup: { type: :awaiting_choice }
        )
      end
    end

    private

    def configured?
      Setting.get('ai_provider', user: @user).present?
    end

    def save_setting(key, value)
      Setting.set(key, value, user: @user)
    end

    def extract_key(text)
      text[/sk-or-[a-zA-Z0-9]{32,}/] || text[/sk-[a-zA-Z0-9]{32,}/] || text.strip
    end
  end
end
