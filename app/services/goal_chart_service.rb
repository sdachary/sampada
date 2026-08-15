class GoalChartService
  def initialize(user)
    @user = user
    @tracker = WealthJourneyTracker.new(user)
  end

  def debt_free_progress
    dp = @tracker.debt_progress
    debts = @user.debts.active
    total = debts.sum(&:amount)
    paid = debts.sum(&:paid_amount)
    months = debts.map(&:months_remaining).compact.max || 0
    monthly_emi = debts.sum(&:emi_amount)
    projection = (0..[months, 60].min).map do |m|
      month_date = Time.zone.today + m.months
      paid_so_far = monthly_emi * m
      {
        month: month_date.strftime('%Y-%m'),
        label: month_date.strftime('%b %Y'),
        remaining: [(total - paid) - paid_so_far, 0].max.round(2),
        target: 0
      }
    end
    {
      total_debt: total.to_f, paid_so_far: paid.to_f,
      remaining: (total - paid).to_f,
      progress_pct: dp[:progress_percentage],
      projection: projection
    }
  end

  def wealth_growth
    @tracker.wealth_growth_projection.map do |w|
      { year: w[:year], label: w[:year].to_s, projected: w[:projected_net_worth],
        conservative: (w[:projected_net_worth] * 0.97).round(2),
        aggressive: (w[:projected_net_worth] * 1.02).round(2) }
    end
  end

  def monthly_budget_chart
    BudgetCategory.where(user: @user).active.map do |cat|
      spent = cat.monthly_spending(@user.id)
      limit = cat.budgets.active.first&.monthly_limit

      {
        category: cat.name,
        spent: spent.to_f,
        budgeted: limit.to_f,
        remaining: (limit.to_f - spent.to_f).round(2),
        color: cat.color
      }
    end
  end

  def income_vs_expenses(months: 12)
    Transaction.monthly_totals(@user.id, months: months)
  end
end
