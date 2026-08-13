# frozen_string_literal: true

class Api::DashboardController < Api::BaseController
  def show
    user = current_user
    total_debt = user.debts.active.sum("amount - paid_amount").to_f
    total_investments = Investment.joins(:portfolio)
                                    .where(portfolios: { user_id: user.id })
                                    .sum("COALESCE(shares, 0) * COALESCE(current_price, 0)").to_f
    monthly_expenses_expr = <<~SQL.squish
      CASE frequency
        WHEN 'weekly' THEN amount * 4.33
        WHEN 'monthly' THEN amount
        WHEN 'quarterly' THEN amount / 3.0
        WHEN 'yearly' THEN amount / 12.0
        ELSE amount END
    SQL
    monthly_expenses = user.recurring_expenses.active.sum(monthly_expenses_expr).to_f
    net_worth = total_investments - total_debt
    journey = user.journeys.first

    base_currency = user.currency
    render_success({
      total_debt: total_debt,
      total_investments: total_investments,
      monthly_expenses: monthly_expenses.round(2),
      net_worth: net_worth,
      debt_free_date: journey&.zero_day_target,
      wealth_score: journey&.wealth_score&.to_f,
      portfolio_count: user.portfolios.count,
      debt_count: user.debts.active.count,
      sip_count: DividendSip.joins(portfolio: :user)
                            .where(users: { id: user.id }, status: "active").count,
      unread_notifications: user.notifications.unread.count,
      base_currency: base_currency,
      currency_symbol: Currency.symbol_for(base_currency),
      recent_snapshots: user.net_worth_snapshots.recent.limit(12).map { |s|
        { date: s.snapshot_date, net_worth: s.net_worth.to_f, currency_code: s.currency_code }
      }
    })
  end

  def projection
    user = current_user
    journey = user.journeys.first
    monthly_sip = journey&.monthly_sip_goal&.to_f || 0
    total_debt = user.debts.active.sum("amount - paid_amount").to_f
    monthly_emi = user.debts.active.sum(:emi_amount).to_f

    projection = (1..60).map do |month|
      remaining_debt = [total_debt - (monthly_emi * month), 0].max
      invested = monthly_sip * month
      { month: month, debt: remaining_debt.round(2),
        investments: invested.round(2),
        net_worth: (invested - remaining_debt).round(2) }
    end

    render_success({ projection: projection })
  end
end
