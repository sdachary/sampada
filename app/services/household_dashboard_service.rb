class HouseholdDashboardService
  def initialize(household)
    @household = household
    @members = household.members
    @base_currency = household.currency
    @exchange = ExchangeRateService.new
  end

  def overview
    {
      name: @household.name,
      member_count: @members.count,
      currency: @base_currency,
      currency_symbol: Currency.symbol_for(@base_currency),
      net_worth: aggregated_net_worth,
      monthly_spending: monthly_aggregate,
      shared_assets: shared_asset_summary,
      members: member_summaries
    }
  end

  def member_finances(user)
    {
      debts: user.debts.sum { |d| convert(d.remaining_amount, d.currency_code) },
      portfolios: user.portfolios.sum(&:total_value),
      monthly_expenses: user.recurring_expenses.active.sum(&:monthly_amount),
      transactions: Transaction.where(user: user, transaction_date: 30.days.ago..)
        .sum { |t| convert(t.amount, t.currency_code) }
    }
  end

  private

  def aggregated_net_worth
    total_assets = 0.0
    total_liabilities = 0.0

    @members.each do |user|
      total_liabilities += user.debts.sum { |d| convert(d.remaining_amount, d.currency_code) }
      total_assets += user.portfolios.sum(&:total_value)
    end

    @household.debts.each { |d| total_liabilities += convert(d.remaining_amount, d.currency_code) }
    @household.portfolios.each { |p| total_assets += p.total_value }

    {
      total_assets: total_assets.round(2),
      total_liabilities: total_liabilities.round(2),
      net_worth: (total_assets - total_liabilities).round(2)
    }
  end

  def monthly_aggregate
    total = 0.0
    @members.each do |user|
      total += user.recurring_expenses.active.sum(&:monthly_amount)
    end
    @household.recurring_expenses.active.each do |e|
      total += e.monthly_amount
    end
    { total_monthly: total.round(2) }
  end

  def shared_asset_summary
    {
      debts: @household.debts.count,
      portfolios: @household.portfolios.count,
      recurring_expenses: @household.recurring_expenses.count,
      transactions: @household.transactions.count,
      budgets: @household.budgets.count
    }
  end

  def member_summaries
    @members.includes(:household_memberships).map do |user|
      membership = user.household_memberships.find_by(household: @household)
      finances = member_finances(user)
      {
        id: user.id,
        name: [user.first_name, user.last_name].compact.join(" "),
        email: user.email,
        role: membership&.role,
        joined_at: membership&.joined_at,
        total_debt: finances[:debts].round(2),
        total_investments: finances[:portfolios].round(2),
        monthly_expenses: finances[:monthly_expenses].round(2)
      }
    end
  end

  def convert(amount, from_currency)
    @exchange.convert(amount, from: from_currency || @base_currency, to: @base_currency) || amount
  end
end
