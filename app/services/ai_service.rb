# frozen_string_literal: true

class AiService
  def initialize(user:)
    @user = user
    @formatter = Ai::Formatter.new(user)
    @provider = Ai::Provider.new(user)
    @setup = Ai::SetupService.new(user)
    @parser = Ai::CommandParser.new(user, @formatter)
    @advice = Ai::AdviceService.new(user, @formatter)
  end

  def ask(prompt)
    return @setup.handle(prompt) if @setup.setup_conversation?(prompt)

    if @provider.configured?
      response = @provider.call(prompt, system_prompt)
      return AiResponse.new(text: response) if response
    end

    text = rule_response(prompt)
    text += ai_setup_prompt if !@provider.configured? && !prompt.to_s.downcase.include?("setup")
    AiResponse.new(text: text)
  end

  private

  def rule_response(prompt)
    down = prompt.to_s.downcase

    case @parser.request_type(prompt)
    when :transaction then @parser.create_transaction(prompt)
    when :budget then @parser.create_budget(prompt)
    when :categorize then @parser.categorize_recent_transactions
    when :anomaly then anomaly_report
    when :forecast then cash_flow_forecast
    when :export then export_instructions
    else
      fallback_advice(down, prompt)
    end
  end

  def fallback_advice(down, prompt)
    if down.include?("debt") || down.include?("loan") || down.include?("emi") || down.include?("credit card")
      @advice.debt_advice
    elsif down.include?("invest") || down.include?("sip") || down.include?("dividend") || down.include?("stock")
      @advice.invest_advice
    elsif down.include?("budget") || down.include?("expense") || down.include?("spend") || down.include?("save")
      @advice.budget_advice
    elsif down.include?("overview") || down.include?("summary") || down.include?("net worth")
      @advice.overview
    elsif down.match?(/\b(hi|hello|hey)\b/) && prompt.length < 20
      @advice.greeting
    else
      @advice.general_fallback(prompt)
    end
  end

  def anomaly_report
    anomalies = AnomalyDetectionService.new(@user).detect
    return "✅ No anomalies detected! Your spending patterns look normal." if anomalies.empty?

    text = "⚠️ #{anomalies.length} anomaly(ies) detected:\n\n"
    anomalies.first(5).each do |a|
      icon = a[:severity] >= 8 ? "🔴" : a[:severity] >= 4 ? "🟡" : "🟢"
      text += "#{icon} **#{a[:title]}**: #{a[:description]}\n"
    end
    text += "\n...and #{anomalies.length - 5} more. Check your dashboard for details." if anomalies.length > 5
    text
  end

  def cash_flow_forecast
    forecast = CashFlowForecastService.new(@user).summary
    text = "📊 **Cash Flow Forecast**\n\n"
    text += "Monthly Income: #{@formatter.format_amount(forecast[:monthly_income])}\n"
    text += "Monthly Expenses: #{@formatter.format_amount(forecast[:monthly_expenses])}\n"
    text += "Net: #{@formatter.format_amount(forecast[:net_monthly])}\n"
    text += "Health: #{forecast[:health].upcase}\n"
    text += "⚠️ At current burn rate, savings will last #{forecast[:runway_months]} months\n" if forecast[:runway_months]
    text
  end

  def export_instructions
    "📁 **Export Options**:\n\n" \
    "• Say \"export my debts\" for CSV\n" \
    "• Say \"export transactions\" for CSV\n" \
    "• Say \"export portfolio\" for CSV\n" \
    "• Say \"export net worth\" for CSV\n" \
    "• Say \"generate annual report\" for a full-year summary\n\n" \
    "Exports are available from the Reports section of your dashboard."
  end

  def ai_setup_prompt
    "\n\n💡 **Want smarter AI-powered answers?** " \
    "Say **'setup'** and I'll check your system and help you configure AI " \
    "(local or cloud, whatever works best for you)."
  end

  def system_prompt
    debts = @user.debts.active
    portfolios = @user.portfolios
    journey = @user.journeys.first
    symbol = @formatter.currency_symbol
    code = @formatter.currency_code

    context = []
    context << "User's debts: #{debts.map { |d| "#{d.name}: #{symbol}#{d.remaining_amount.to_i} remaining at #{d.interest_rate}% (#{d.currency_code})" }.join(', ')}" if debts.any?
    context << "User's portfolios: #{portfolios.map(&:name).join(', ')} (#{code})" if portfolios.any?
    context << "Journey phase: #{journey.phase}, debt-free target: #{journey.zero_day_target}" if journey
    context << "User's base currency: #{code} (#{symbol})"
    context_str = context.any? ? "\n\nCurrent financial data:\n#{context.join("\n")}" : ""

    provider_notice = @provider.cloud_provider? ? "\n\nPrivacy: This user chose cloud AI. Only share necessary financial data. Do not store or log their information beyond this conversation." : ""

    <<~PROMPT
      You are Sampada, an AI financial freedom assistant. You help users manage their
      personal finances with a "debt-first" philosophy: negative (debt) → zero (free) →
      positive (wealthy).

      The user's base currency is #{code} (#{symbol}). Use #{symbol} or #{code} when
      discussing their finances. The user may have assets and debts in multiple currencies
      (USD, EUR, GBP, INR, etc.) — note the currency when discussing specific items.

      Guidelines:
      - Explain concepts simply, like talking to a friend who isn't tech-savvy
      - Never give specific stock picks — suggest strategies, not securities; point to the
        in-app Dividend Screener for dividend-stock candidates and note its disclaimer
      - Support both Indian (NSE/BSE) and international markets (NYSE, NASDAQ, LSE)
      - Keep responses concise and actionable (2-4 paragraphs max)
      - Reference the user's saved financial data when relevant
      - Be encouraging — financial journeys are hard
      #{context_str}
      #{provider_notice}
    PROMPT
  end
end
