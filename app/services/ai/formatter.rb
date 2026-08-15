# frozen_string_literal: true

module Ai
  class Formatter
    def initialize(user)
      @user = user
    end

    def currency_code
      @user.currency.presence || 'INR'
    end

    def currency_symbol
      Currency.symbol_for(currency_code)
    end

    def format_amount(amount)
      "#{currency_symbol}#{format_value(amount)}"
    end

    def format_value(amount)
      int = amount.to_i.to_s
      return int if int.length <= 3

      last3 = int[-3..]
      front = int[0...-3]
      front = front.reverse.gsub(/(\d{2})(?=\d)/, '\\1,').reverse
      "#{front},#{last3}"
    end

    alias sym currency_symbol
    alias format_rupee format_value
  end
end
