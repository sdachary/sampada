class DebtPayoffService
  def initialize(debts, extra_payment: 0, lump_sum_amount: 0, annual_extra: 0, custom_extra_payments: [])
    @debts = debts.map { |d| d.respond_to?(:attributes) ? d.attributes.symbolize_keys : d.symbolize_keys }
    @extra_payment = extra_payment.to_f
    @lump_sum = lump_sum_amount.to_f
    @annual_extra = annual_extra.to_f
    @custom_extras = custom_extra_payments.map { |ce| [ce[:month].to_i, ce[:amount].to_f] }.to_h
  end

  def avalanche_plan
    calculate_plan(@debts.sort_by { |d| -d[:interest_rate] })
  end

  def snowball_plan
    calculate_plan(@debts.sort_by { |d| d[:balance] })
  end

  private

  def calculate_plan(prioritized_debts)
    debts = prioritized_debts.map { |d| d.dup }
    months = 0
    total_interest = 0
    schedule = []

    while debts.any? { |d| d[:balance] > 0 }
      months += 1
      payment = @extra_payment
      month_interest = 0
      month_principal = 0

      debts.each_with_index do |debt, index|
        next if debt[:balance] <= 0
        interest = debt[:balance] * (debt[:interest_rate] / 100 / 12)
        debt[:balance] += interest
        total_interest += interest
        month_interest += interest
        monthly_min = [debt[:min_payment], debt[:balance]].min
        debt[:balance] -= monthly_min
        month_principal += monthly_min
        payment += monthly_min if index == debts.find_index { |d| d[:balance] > 0 }
      end

      extra = payment
      extra += @lump_sum if months == 1
      extra += @annual_extra if months % 12 == 0
      extra += @custom_extras[months].to_f if @custom_extras[months]

      priority_debt = debts.find { |d| d[:balance] > 0 }
      if priority_debt && extra > 0
        amount = [extra, priority_debt[:balance]].min
        priority_debt[:balance] -= amount
        month_principal += amount
      end

      schedule << {
        month: months,
        payment: (month_principal + month_interest).round(2),
        interest: month_interest.round(2),
        principal: month_principal.round(2),
        balance: debts.sum { |d| d[:balance] }.round(2)
      }
    end

    { months: months, total_interest: total_interest.round(2), schedule: schedule }
  end
end
