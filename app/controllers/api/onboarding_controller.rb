class Api::OnboardingController < Api::BaseController
  def snapshot
    user = current_user
    render_success({
      money_in: user.transactions.income.sum(:amount).to_f,
      money_out: user.transactions.expenses.sum(:amount).to_f,
      total_owed: user.debts.active.sum(&:remaining_amount).to_f,
      checklist: {
        loans: user.debts.any?,
        investments: user.portfolios.any?,
        insurance: user.insurance_policies.any?,
        budget: user.budgets.any?,
      },
      onboarded: user.onboarded?,
      currency_symbol: Currency.symbol_for(user.currency)
    })
  end

  def complete
    current_user.update!(onboarded: true)
    render_success({ onboarded: true })
  end
end
