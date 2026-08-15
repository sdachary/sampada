module Api
  class PayoffPlansController < Api::BaseController
    def index
      plans = current_user.debt_payoffs.order(created_at: :desc)
      render_success(plans.map { |p| plan_json(p) })
    end

    def show
      plan = current_user.debt_payoffs.find(params[:id])
      render_success(plan_json(plan))
    end

    def create
      plan = current_user.debt_payoffs.create!(plan_params)
      calculate_and_save(plan)
      render_success(plan_json(plan), status: :created)
    end

    def update
      plan = current_user.debt_payoffs.find(params[:id])
      plan.update!(plan_params)
      calculate_and_save(plan)
      render_success(plan_json(plan))
    end

    def destroy
      current_user.debt_payoffs.find(params[:id]).destroy!
      head :no_content
    end

    private

    def plan_params
      params.permit(:name, :strategy, :extra_payment, debt_ids: [])
    end

    def plan_json(p)
      { id: p.id, name: p.name, strategy: p.strategy,
        extra_payment: p.extra_payment&.to_f,
        months_saved: p.months_saved,
        debt_free_date: p.debt_free_date,
        total_interest_paid: p.total_interest_paid&.to_f,
        total_interest_saved: p.total_interest_saved&.to_f,
        schedule: p.schedule,
        debts: p.debts.map do |d|
          { id: d.id, name: d.name, amount: d.amount.to_f,
            interest_rate: d.interest_rate&.to_f,
            emi_amount: d.emi_amount&.to_f }
        end,
        currency_code: p.currency_code,
        created_at: p.created_at }
    end

    def calculate_and_save(plan)
      debts_data = plan.debts.map do |d|
        { id: d.id, balance: d.amount, interest_rate: d.interest_rate,
          min_payment: d.emi_amount }
      end
      return if debts_data.empty?

      calc = lambda { |extra|
        DebtPayoffService.new(debts_data, extra_payment: extra)
      }
      strategy = plan.strategy.to_sym

      result = calc.call(plan.extra_payment.to_f).public_send("#{strategy}_plan")
      baseline = calc.call(0).public_send("#{strategy}_plan")

      plan.update_columns(
        months_saved: [baseline[:months] - result[:months], 0].max,
        debt_free_date: Time.zone.today + result[:months].months,
        total_interest_paid: result[:total_interest],
        total_interest_saved: [baseline[:total_interest] - result[:total_interest], 0].max,
        schedule: result[:schedule]
      )
    end
  end
end
