# frozen_string_literal: true

module Ai
  class AdviceService
    def initialize(user, formatter)
      @user = user
      @formatter = formatter
    end

    def debt_advice
      debts = @user.debts.active
      return "You don't have any debts tracked yet. Want to add one? Just tell me the name, amount, and interest rate!" if debts.empty?

      total = debts.sum(&:remaining_amount)
      highest = debts.max_by(&:interest_rate)
      lowest = debts.min_by(&:remaining_amount)

      text = "You have #{debts.count} active #{'debt'.pluralize(debts.count)} totaling #{@formatter.format_amount(total)}.\n\n"
      text += "**Strategy**: Since your highest interest debt is #{highest.name} at #{highest.interest_rate}%, "
      text += "I recommend the **avalanche method** — pay minimum on everything, "
      text += "put extra toward #{highest.name} first. It saves the most in interest.\n\n"
      text += "Alternatively, the **snowball method** (pay off #{lowest.name} first — #{@formatter.format_amount(lowest.remaining_amount)} — for quick wins) " if lowest != highest
      text += "\nWant me to create a detailed payoff plan?"
      text
    end

    def invest_advice
      portfolios = @user.portfolios
      return "You don't have any investment portfolios yet. Want to start one? " \
             "A monthly SIP of #{@formatter.currency_symbol}5,000 in large-cap stocks is a great beginning." if portfolios.empty?

      total = portfolios.sum(&:total_value)
      "You have #{portfolios.count} portfolio(s) worth #{@formatter.format_amount(total)}.\n\n" \
      "For dividend investing:\n" \
      "• Look for companies with 5+ years of consistent dividends\n" \
      "• Target dividend yield of 2-4%\n" \
      "• Reinvest dividends to compound returns\n\n" \
      "Want me to suggest a SIP allocation for your portfolio?"
    end

    def budget_advice
      expenses = @user.recurring_expenses.active
      return "No recurring expenses tracked yet. List your monthly bills and I'll help you optimize!" if expenses.empty?

      total = expenses.sum(&:monthly_amount)
      "You have #{expenses.count} recurring #{'expense'.pluralize(expenses.count)} at #{@formatter.format_amount(total)}/month.\n\n" \
      "**50/30/20 rule**:\n" \
      "• 50% Needs (#{@formatter.format_amount((total * 0.5).round)})\n" \
      "• 30% Wants (#{@formatter.format_amount((total * 0.3).round)})\n" \
      "• 20% Savings (#{@formatter.format_amount((total * 0.2).round)})\n\n" \
      "Does your current spending match this? Want to review specific categories?"
    end

    def overview
      debts = @user.debts.active
      portfolios = @user.portfolios
      expenses = @user.recurring_expenses.active
      journey = @user.journeys.first
      symbol = @formatter.currency_symbol

      parts = ["Here's your financial snapshot:\n"]
      total_debt = debts.sum(&:amount)
      total_inv = portfolios.sum(&:total_value)
      net = total_inv - total_debt
      parts << "💰 **Net Worth**: #{@formatter.format_amount(net)} (#{net >= 0 ? '✅ positive' : '⚠️ negative'})"
      parts << "💳 **Debt**: #{@formatter.format_amount(total_debt)} (#{debts.count} active)" if debts.any?
      parts << "📈 **Investments**: #{@formatter.format_amount(total_inv)}" if portfolios.any?
      parts << "📅 **Monthly Expenses**: #{@formatter.format_amount(expenses.sum(&:monthly_amount))}" if expenses.any?
      if journey&.zero_day_target
        parts << "🎯 **Debt Free**: #{journey.zero_day_target.strftime('%b %Y')} (#{(journey.zero_day_target - Date.today).to_i} days)"
      end
      parts.join("\n")
    end

    def greeting
      name = [@user.first_name, @user.last_name].compact.first
      greeting = name ? "Welcome back, #{name}!" : "Welcome to Kubera!"
      "#{greeting} I'm your financial freedom assistant.\n\n" \
      "Tell me about your finances and I'll help you plan your journey from debt to wealth. " \
      "Try saying: \"I have a credit card debt\" or \"Show me my overview\"."
    end

    def general_fallback(prompt)
      "I'm not sure how to help with that specifically. " \
      "I can help you record transactions, set budgets, analyze your debt, or give you a net worth overview. " \
      "What would you like to do?"
    end
  end
end
