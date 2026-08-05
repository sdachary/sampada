class Api::ReportsController < Api::BaseController
  def annual
    year = (params[:year] || Date.today.year).to_i
    report = AnnualReportService.new(current_user, year: year).generate
    render_success(report)
  end

  def cash_flow_forecast
    months = (params[:months] || 12).to_i
    service = CashFlowForecastService.new(current_user)
    render_success({
      summary: service.summary,
      forecast: service.forecast(months: months)
    })
  end

  def anomalies
    service = AnomalyDetectionService.new(current_user)
    render_success(service.summary)
  end

  def goal_charts
    service = GoalChartService.new(current_user)
    render_success({
      debt_free_progress: service.debt_free_progress,
      wealth_growth: service.wealth_growth,
      budget_chart: service.monthly_budget_chart,
      income_vs_expenses: service.income_vs_expenses
    })
  end

  def net_worth
    assets = current_user.portfolios.sum(&:total_value).to_f
    liabilities = current_user.debts.active.sum { |d| d.remaining_amount }.to_f
    render_success({ net_worth: assets - liabilities, assets: assets, liabilities: liabilities })
  end
end
