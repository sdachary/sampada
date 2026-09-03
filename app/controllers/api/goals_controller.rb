# frozen_string_literal: true

module Api
  class GoalsController < Api::BaseController
    def index
      goals = current_user.goals.order(created_at: :desc)
      render_success(goals.map { |g| goal_json(g) })
    end

    def show
      goal = current_user.goals.find(params[:id])
      render_success(goal_json(goal))
    end

    def create
      goal = current_user.goals.create!(goal_params)
      render_success(goal_json(goal), status: :created)
    end

    def update
      goal = current_user.goals.find(params[:id])
      goal.update!(goal_params)
      render_success(goal_json(goal))
    end

    def destroy
      goal = current_user.goals.find(params[:id])
      goal.destroy!
      head :no_content
    end

    private

    def goal_params
      params.require(:goal).permit(:name, :target_amount, :target_year, :currency_code,
        :monthly_sip, :top_up_amount, :top_up_frequency, :allocation,
        :equity_growth, :debt_growth, :gold_growth)
    end

    def goal_json(g)
      forecast = GoalForecastService.new(g)
      proj = forecast.projection
      comparison = forecast.risk_comparison

      {
        id: g.id, name: g.name, target_amount: g.target_amount.to_f,
        target_year: g.target_year, currency_code: g.currency_code,
        currency_symbol: Currency.symbol_for(g.currency_code),
        monthly_sip: g.monthly_sip.to_f, top_up_amount: g.top_up_amount.to_f,
        top_up_frequency: g.top_up_frequency, allocation: g.allocation,
        equity_growth: g.equity_growth.to_f, debt_growth: g.debt_growth.to_f,
        gold_growth: g.gold_growth.to_f,
        years_remaining: g.years_remaining,
        projection: proj[:projection], final_corpus: proj[:final_corpus],
        risk_comparison: comparison,
        created_at: g.created_at, updated_at: g.updated_at
      }
    end
  end
end
