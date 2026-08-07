class Api::DebtsController < Api::BaseController
  def index
    debts = current_user.debts.order(created_at: :desc)
    debts = debts.active if params[:active]
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
    current_user.debts.find(params[:id]).destroy!
    render_success({}, message: "Debt deleted")
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
    render_success(service.avalanche_plan)
  end

  private

  def debt_params
    params.permit(:name, :category, :amount, :interest_rate, :emi_amount,
                  :due_date, :status, :started_at, :paid_amount, :notes, :currency_code)
  end

  def debt_json(d)
    remaining = (d.amount.to_f - d.paid_amount.to_f).clamp(0, d.amount.to_f)
    progress = d.amount.to_f > 0 ? (d.paid_amount.to_f / d.amount.to_f * 100).round(1) : 0.0
    months_remaining = d.emi_amount.to_f > 0 ? (remaining / d.emi_amount.to_f).ceil : 0
    debt_free = months_remaining > 0 ? (Date.today + months_remaining.months) : nil

    { id: d.id, name: d.name, category: d.category, amount: d.amount.to_f,
      interest_rate: d.interest_rate&.to_f, emi_amount: d.emi_amount&.to_f,
      due_date: d.due_date, status: d.status, paid_amount: d.paid_amount.to_f,
      remaining: remaining, progress: progress,
      debt_free_date: debt_free, months_remaining: months_remaining,
      started_at: d.started_at, notes: d.notes, created_at: d.created_at,
      currency_code: d.currency_code.presence || "INR",
      currency_symbol: Currency.symbol_for(d.currency_code.presence || "INR") }
  end
end
