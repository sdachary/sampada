module Api
  class RecurringExpensesController < Api::BaseController
    def index
      expenses = current_user.recurring_expenses.order(created_at: :desc)
      render_success(expenses.map { |e| expense_json(e) })
    end

    def show
      expense = current_user.recurring_expenses.find(params[:id])
      render_success(expense_json(expense))
    end

    def create
      expense = current_user.recurring_expenses.create!(expense_params)
      render_success(expense_json(expense), status: :created)
    end

    def update
      expense = current_user.recurring_expenses.find(params[:id])
      expense.update!(expense_params)
      render_success(expense_json(expense))
    end

    def destroy
      current_user.recurring_expenses.find(params[:id]).destroy!
      head :no_content
    end

    def calendar
      expenses = if params[:id]
                   [current_user.recurring_expenses.find(params[:id])]
                 else
                   current_user.recurring_expenses.order(created_at: :desc)
                 end
      render_success({ expenses: expenses.map { |e| expense_json(e) } })
    end

    private

    def expense_params
      source = params[:recurring_expense].presence || params
      source.permit(:name, :amount, :frequency, :next_due_date, :category,
                    :auto_debit, :active, :notes, :currency_code)
    end

    def expense_json(e)
      cc = e.currency_code.presence || 'INR'
      { id: e.id, name: e.name, amount: e.amount.to_f, frequency: e.frequency,
        next_due_date: e.next_due_date, next_due_days: nil,
        monthly_amount: e.amount.to_f, category: e.category,
        auto_debit: e.auto_debit, active: e.active, notes: e.notes,
        created_at: e.created_at, currency_code: cc,
        currency_symbol: Currency.symbol_for(cc) }
    end
  end
end
