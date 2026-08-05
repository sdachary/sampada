class Api::DebtPayoffsController < Api::BaseController
  def index
    debts = current_user.debts.order(created_at: :desc)
    render_success(debts.map { |d| debt_json(d) })
  end

  def show
    debt = current_user.debts.find(params[:id])
    render_success(debt_json(debt))
  end

  def create
    debt = current_user.debts.create!(debt_params)
    render_success(debt_json(debt), status: :created)
  end

  def update
    debt = current_user.debts.find(params[:id])
    debt.update!(debt_params)
    render_success(debt_json(debt))
  end

  def destroy
    debt = current_user.debts.find(params[:id])
    debt.destroy!
    head :no_content
  end

  def simulate
    debt = current_user.debts.find(params[:id])
    service = DebtPayoffService.new(
      [{ id: debt.id, balance: debt.remaining_amount, interest_rate: debt.interest_rate, min_payment: debt.emi_amount }],
      extra_payment: (params[:extra_monthly_payment] || 0).to_f,
      lump_sum_amount: (params[:lump_sum_amount] || 0).to_f,
      annual_extra: (params[:annual_extra] || 0).to_f,
      custom_extra_payments: params[:custom_extra_payments] || []
    )
    plan = service.avalanche_plan
    render_success(plan)
  end

  private

  def debt_json(d)
    { id: d.id, name: d.name, amount: d.amount.to_f, interest_rate: d.interest_rate&.to_f,
      emi_amount: d.emi_amount&.to_f, status: d.status, category: d.category,
      due_date: d.due_date, started_at: d.started_at, paid_amount: d.paid_amount&.to_f,
      currency_code: d.currency_code }
  end

  def debt_params
    params.require(:debt).permit(:name, :amount, :interest_rate, :emi_amount, :status, :category, :due_date, :started_at, :currency_code)
  end
end
