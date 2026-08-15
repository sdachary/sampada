# frozen_string_literal: true

module Ai
  class CommandParser
    def initialize(user, formatter)
      @user = user
      @formatter = formatter
    end

    def request_type(prompt)
      down = prompt.to_s.downcase
      if transaction_request?(down, prompt)
        :transaction
      elsif budget_request?(down)
        :budget
      elsif categorize_request?(down)
        :categorize
      elsif anomaly_request?(down)
        :anomaly
      elsif forecast_request?(down)
        :forecast
      elsif export_request?(down)
        :export
      end
    end

    def create_transaction(prompt)
      amounts = prompt.scan(/[\d,.]+/).map { |a| a.gsub(/[,\s]/, '').to_f }.reject(&:zero?)
      return "I couldn't find an amount in your message. Try: \"I spent ₹500 on groceries\"" if amounts.empty?

      amount = amounts.first
      type = expense_income_type(prompt)
      description = extract_description(prompt)
      category = extract_category(prompt)

      @user.transactions.create!(
        description: description,
        amount: amount,
        transaction_type: type,
        transaction_date: Time.zone.today,
        currency_code: @user.currency,
        budget_category: category
      )

      cat_name = category&.name || 'Uncategorized'
      "✅ Recorded: #{type == 'expense' ? 'Spent' : 'Received'} #{@formatter.format_amount(amount)} on #{description} (#{cat_name})"
    rescue ActiveRecord::RecordInvalid => e
      "Sorry, I couldn't save that transaction: #{e.message}"
    end

    def create_budget(prompt)
      amounts = prompt.scan(/[\d,.]+/).map { |a| a.gsub(/[,\s]/, '').to_f }.reject(&:zero?)
      return "I couldn't find a budget amount. Try: \"Set a ₹10,000 budget for Food\"" if amounts.empty?

      amount = amounts.first
      cat_name = extract_category_name(prompt)
      category = BudgetCategory.find_or_create_by!(user: @user, name: cat_name) do |c|
        c.sort_order = BudgetCategory::DEFAULT_CATEGORIES.index(cat_name) || 99
        c.color = BudgetCategory.category_colors[rand(BudgetCategory.category_colors.length)]
      end

      @user.budgets.create!(
        budget_category: category,
        monthly_limit: amount,
        currency_code: @user.currency,
        period: 'monthly'
      )

      "✅ Budget set: #{@formatter.format_amount(amount)}/month for #{category.name}"
    rescue ActiveRecord::RecordInvalid => e
      "Sorry, I couldn't create that budget: #{e.message}"
    end

    def categorize_recent_transactions
      uncategorized = @user.transactions.uncategorized.recent.limit(20)
      return 'No uncategorized transactions found!' if uncategorized.empty?

      categorized = 0
      uncategorized.each do |t|
        cat = suggest_category(t)
        if cat
          t.update!(budget_category: cat)
          categorized += 1
        end
      end

      "✅ Categorized #{categorized} transactions. #{uncategorized.count - categorized} need manual review."
    end

    private

    def transaction_request?(down, prompt)
      amounts = prompt.scan(/[\d,.]+/)
      (down.include?('spent') || down.include?('paid') || down.include?('earned') ||
       down.include?('received') || down.include?('bought') || down.include?('purchased')) &&
        amounts.any? { |a| a.gsub(/[,.]/, '').to_i.positive? }
    end

    def budget_request?(down)
      down.include?('set a budget') || down.include?('create a budget') ||
        down.include?('budget for') || (down.include?('limit') && down.include?('category'))
    end

    def categorize_request?(down)
      (down.include?('categorize') || down.include?('sort') || down.include?('organize')) &&
        (down.include?('transaction') || down.include?('expense') || down.include?('spending'))
    end

    def anomaly_request?(down)
      down.include?('anomaly') || down.include?('unusual') || down.include?('abnormal') ||
        down.include?('suspicious') || down.include?('detect') || down.include?('irregular')
    end

    def forecast_request?(down)
      down.include?('forecast') || down.include?('projection') || down.include?('predict') ||
        down.include?('future') || (down.include?('cash flow') && down.include?('look'))
    end

    def export_request?(down)
      down.include?('export') || down.include?('download') ||
        (down.include?('generate') && (down.include?('report') || down.include?('csv')))
    end

    def expense_income_type(prompt)
      down = prompt.to_s.downcase
      if down.include?('earned') || down.include?('received') || down.include?('salary') ||
         down.include?('income') || down.include?('deposited') || down.include?('paid me')
        'income'
      else
        'expense'
      end
    end

    def extract_description(prompt)
      prompt = prompt.to_s
      prompt = prompt.gsub(/\b(spent|paid|earned|received|bought|purchased|for|on)\b/i, '')
      prompt = prompt.gsub(/[\d,. ₹$€£¥]+/, '').strip
      prompt.presence || 'General expense'
    end

    def extract_category(prompt)
      down = prompt.to_s.downcase
      BudgetCategory.where(user: @user).active.each do |cat|
        return cat if down.include?(cat.name.downcase)
      end
      nil
    end

    def extract_category_name(prompt)
      down = prompt.to_s.downcase
      BudgetCategory::DEFAULT_CATEGORIES.each do |name|
        return name if down.include?(name.downcase)
      end
      'Other'
    end

    def suggest_category(transaction)
      desc = transaction.description.to_s.downcase
      keywords = {
        'Food' => %w[food restaurant grocery cafe lunch dinner snack zomato swiggy],
        'Transport' => %w[uber ola petrol fuel taxi bus train metro parking],
        'Utilities' => %w[electricity water gas bill broadband phone mobile],
        'Rent' => %w[rent lease apartment housing],
        'Entertainment' => %w[movie netflix spotify amazon prime game music],
        'Healthcare' => %w[hospital doctor medicine pharmacy clinic health],
        'Shopping' => %w[amazon flipkart cloth shoe apparel purchase],
        'Education' => %w[course book udemy coursera tuition fee class],
        'Insurance' => %w[insurance premium policy],
        'Savings' => %w[savings deposit fd fixed recurring rd],
        'Salary' => %w[salary payroll wage income],
        'Freelance' => %w[freelance contract project payment upwork fiverr],
        'Business' => %w[business revenue invoice vendor supplier]
      }

      keywords.each do |category, words|
        return BudgetCategory.find_or_create_by!(user: @user, name: category) if words.any? { |w| desc.include?(w) }
      end
      nil
    end
  end
end
