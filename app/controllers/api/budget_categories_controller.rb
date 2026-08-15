module Api
  class BudgetCategoriesController < Api::BaseController
    def index
      categories = current_user.budget_categories.order(sort_order: :asc)
      active = categories.reject { |c| c.active.to_s == 'false' }
      render_success(active.map { |c| category_json(c) })
    end

    def create
      cat = current_user.budget_categories.create!(category_params)
      render_success(category_json(cat), status: :created)
    end

    def update
      cat = current_user.budget_categories.find(params[:id])
      cat.update!(category_params)
      render_success(category_json(cat))
    end

    def destroy
      current_user.budget_categories.find(params[:id]).destroy!
      head :no_content
    end

    def seed
      BudgetCategory.seed_for(current_user)
      categories = current_user.budget_categories.order(sort_order: :asc)
      active = categories.reject { |c| c.active.to_s == 'false' }
      render_success(active.map { |c| category_json(c) })
    end

    private

    def category_params
      params.permit(:name, :icon, :color, :sort_order, :active)
    end

    def category_json(c)
      { id: c.id, name: c.name, icon: c.icon, color: c.color,
        sort_order: c.sort_order, active: c.active,
        transaction_count: 0 }
    end
  end
end
