class WealthJourneyTracker
  def initialize(user)
    @user = user
    @exchange_service = ExchangeRateService.new
    @base_currency = user.currency
  end

  def debt_progress
    debts = Debt.where(user: @user, status: 'active')
    total_debt = debts.sum { |d| convert(d.remaining_amount, d.currency_code) }
    total_emi = debts.sum { |d| convert(d.emi_amount.to_f, d.currency_code) }
    payoff = payoff_projection(debts)

    {
      total_debt: total_debt,
      total_emi: total_emi,
      debt_count: debts.count,
      months_to_zero: payoff ? payoff[:months] : 0,
      estimated_debt_free_date: payoff ? payoff[:debt_free_date] : nil,
      progress_percentage: debts.any? ? debts.sum(&:progress_percentage) / debts.count : 100.0,
      base_currency: @base_currency,
      debts: debts.map do |d|
        {
          id: d.id, name: d.name, amount: d.amount, remaining: d.remaining_amount,
          interest_rate: d.interest_rate, emi_amount: d.emi_amount,
          due_date: d.due_date, status: d.status,
          months_remaining: d.months_remaining, debt_free_date: d.debt_free_date,
          currency_code: d.currency_code
        }
      end
    }
  end

  def sip_progress
    sips = DividendSip.where(status: 'active')
    total_monthly = sips.sum { |s| convert(s.monthly_contribution, s.currency_code) }
    projected_annual = total_monthly * 12 * 0.08
    target_income = convert(sips.first&.target_income.to_f, sips.first&.currency_code || @base_currency)

    {
      active_sips: sips.count,
      total_monthly_contribution: total_monthly,
      target_monthly_income: target_income,
      projected_monthly_income: projected_annual / 12,
      goal: target_income,
      current: total_monthly,
      projected_income: projected_annual / 12,
      progress: target_income.positive? ? [(projected_annual / 12 / target_income * 100).round(1), 100.0].min : 0,
      base_currency: @base_currency,
      sips: sips.map do |s|
        {
          id: s.id, amount: s.amount, frequency: s.frequency,
          target_income: s.target_income, status: s.status,
          monthly_contribution: s.monthly_contribution,
          currency_code: s.currency_code
        }
      end
    }
  end

  def net_worth_trajectory(months: 12)
    current = NetWorthSnapshot.current(@user)
    debts = Debt.where(user: @user, status: 'active')
    total_emi = debts.sum { |d| convert(d.emi_amount.to_f, d.currency_code) }
    payoff = payoff_projection(debts)
    max_months = payoff ? payoff[:months] : 0

    trajectory = (0..months).map do |m|
      month_date = Time.zone.today + m.months
      debt_reduction = total_emi * [m, max_months].min
      asset_growth = current.total_assets * (1.005**m)
      liability = [current.total_liabilities - debt_reduction, 0].max

      {
        month: month_date.strftime('%Y-%m'),
        label: month_date.strftime('%b %Y'),
        net_worth: (asset_growth - liability).round(2),
        assets: asset_growth.round(2),
        liabilities: liability.round(2)
      }
    end

    {
      current_net_worth: current.net_worth,
      total_assets: current.total_assets,
      total_liabilities: current.total_liabilities,
      net_worth: current.net_worth,
      assets: current.total_assets,
      liabilities: current.total_liabilities,
      breakdown: current.breakdown,
      base_currency: @base_currency,
      trajectory: trajectory,
      projection_12m: trajectory.last[:net_worth]
    }
  end

  def wealth_growth_projection
    current = NetWorthSnapshot.current(@user)
    yearly_rate = 0.10
    monthly_contribution = DividendSip.where(status: 'active').sum do |s|
      convert(s.monthly_contribution, s.currency_code)
    end

    (1..30).map do |year|
      year_date = Time.zone.today + year.years
      current_net = current.net_worth.to_f
      projected = current_net * ((1 + yearly_rate)**year)
      projected += monthly_contribution * 12 * year * ((1 + (yearly_rate / 2))**year)

      {
        year: year_date.year,
        age: year,
        projected_net_worth: projected.round(2),
        monthly_passive_income: (projected * 0.04 / 12).round(2)
      }
    end
  end

  def zero_day_milestone
    debts = Debt.where(user: @user, status: 'active')
    return { reached: true, estimated_date: Time.zone.today, message: 'You are debt-free!' } if debts.empty?

    payoff = payoff_projection(debts)
    max_months = payoff ? payoff[:months] : debts.map(&:months_remaining).max || 0
    est_date = Time.zone.today + max_months.months

    {
      reached: false,
      estimated_date: est_date,
      months_remaining: max_months,
      total_debt: debts.sum { |d| convert(d.remaining_amount, d.currency_code) },
      base_currency: @base_currency,
      message: max_months.positive? ? "Debt-free by #{est_date.strftime('%b %Y')}" : 'No active debts'
    }
  end

  def summary
    debt = debt_progress
    sip = sip_progress
    net = net_worth_trajectory
    zero = zero_day_milestone

    {
      debt_summary: {
        total_debt: debt[:total_debt],
        debt_free_months: debt[:months_to_zero],
        progress: debt[:progress_percentage]
      },
      investment_summary: {
        monthly_sip: sip[:total_monthly_contribution],
        projected_income: sip[:projected_monthly_income],
        target_income: sip[:target_monthly_income]
      },
      net_worth: {
        current: net[:current_net_worth],
        projected_12m: net[:projection_12m],
        assets: net[:total_assets],
        liabilities: net[:total_liabilities]
      },
      base_currency: @base_currency,
      zero_day: zero,
      score: calculate_wealth_score(debt, sip, net)
    }
  end

  private

  def payoff_projection(debts)
    return nil if debts.empty?

    debt_attrs = debts.map do |d|
      { id: d.id, balance: d.remaining_amount.to_f, interest_rate: d.interest_rate.to_f,
        min_payment: d.emi_amount.to_f }
    end

    service = DebtPayoffService.new(debt_attrs)
    result = service.avalanche_plan
    return nil if result.nil? || result[:months].zero?

    {
      months: result[:months],
      total_interest: result[:total_interest],
      debt_free_date: Time.zone.today + result[:months].months
    }
  rescue StandardError => e
    Rails.logger.warn "[WealthJourneyTracker] Payoff projection failed: #{e.message}"
    nil
  end

  def convert(amount, from_currency)
    @exchange_service.convert(amount, from: from_currency || @base_currency, to: @base_currency) || amount
  end

  def calculate_wealth_score(debt, sip, net)
    debt_score = if debt[:total_debt].positive?
                   [(1 - (debt[:total_debt] / [net[:current_net_worth], 1].max)) * 40,
                    0].max
                 else
                   40
                 end
    sip_score = if sip[:target_monthly_income].positive?
                  [(sip[:projected_monthly_income] / sip[:target_monthly_income]) * 30,
                   30].min
                else
                  0
                end
    net_score = net[:current_net_worth].positive? ? (net[:current_net_worth] / 1_000_000 * 30).clamp(0, 30) : 0

    (debt_score + sip_score + net_score).round
  end
end
