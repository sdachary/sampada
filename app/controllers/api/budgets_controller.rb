module Api
  class BudgetsController < Api::BaseController
    def index
      budgets = current_user.budgets.includes(:budget_category).order(created_at: :desc)
      render_success(budgets.map { |b| budget_json(b) })
    end

    def show
      budget = current_user.budgets.find(params[:id])
      render_success(budget_json(budget))
    end

    def create
      budget = current_user.budgets.create!(budget_params)
      render_success(budget_json(budget), status: :created)
    end

    def update
      budget = current_user.budgets.find(params[:id])
      budget.update!(budget_params)
      render_success(budget_json(budget))
    end

    def destroy
      current_user.budgets.find(params[:id]).destroy!
      head :no_content
    end

    def overview
      budgets = current_user.budgets.includes(:budget_category)
      render_success(budgets.map { |b| budget_detail(b) })
    end

    private

    def budget_params
      source = params[:budget].presence || params
      source.permit(:budget_category_id, :monthly_limit, :currency_code,
                    :period, :start_date, :end_date, :notes, :household_id)
    end

    def budget_json(b)
      { id: b.id, budget_category_id: b.budget_category_id,
        category_name: b.budget_category_id, monthly_limit: b.monthly_limit.to_f,
        currency_code: b.currency_code.presence || 'INR',
        period: b.period, start_date: b.start_date, end_date: b.end_date,
        created_at: b.created_at }
    end

    def budget_detail(b)
      budget_json(b).merge(
        spent: b.spent_this_month.to_f,
        remaining: b.remaining.to_f,
        usage_pct: b.usage_percentage,
        on_track: b.on_track?
      )
    end
  end
end
