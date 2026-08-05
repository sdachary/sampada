# frozen_string_literal: true

class Api::JourneyController < Api::BaseController
  def show
    journey = current_user.journeys.first || current_user.journeys.create!(phase: "negative")
    total_debt = current_user.debts.active.sum { |d| d.remaining_amount }.to_f
    total_emi = current_user.debts.active.sum(:emi_amount).to_f
    total_investments = current_user.portfolios.sum(&:total_value).to_f
    snapshot = NetWorthSnapshot.current(current_user)

    payoff_service = nil
    debts = current_user.debts.active
    if debts.any?
      debt_attrs = debts.map { |d| { id: d.id, balance: d.remaining_amount.to_f, interest_rate: d.interest_rate.to_f, min_payment: d.emi_amount.to_f } }
      payoff_service = DebtPayoffService.new(debt_attrs)
    end

    payoff_plan = payoff_service&.avalanche_plan
    milestones = build_milestones(journey, debts, payoff_plan, snapshot)

    render_success({
      debt: { total_debt: total_debt, total_emi: total_emi },
      sip: { monthly_goal: journey.monthly_sip_goal.to_f, progress: journey.progress_percentage },
      net_worth: { net_worth: snapshot.net_worth.to_f, assets: total_investments, liabilities: total_debt },
      milestones: milestones
    })
  end

  def progress
    journey = current_user.journeys.first
    total_debt = current_user.debts.active.sum { |d| d.remaining_amount }.to_f
    paid_debt = current_user.debts.where(status: "paid_off").sum(:amount).to_f
    original_debt = total_debt + paid_debt
    debt_reduction_pct = original_debt > 0 ? (paid_debt / original_debt * 100).round(1) : 0

    snapshot = NetWorthSnapshot.current(current_user)
    nw_target = 5000000
    nw_progress_pct = snapshot&.net_worth.to_f > 0 ? [(snapshot.net_worth.to_f / nw_target * 100).round(1), 100.0].min : 0

    debts = current_user.debts.active
    payoff_service = nil
    if debts.any?
      debt_attrs = debts.map { |d| { id: d.id, balance: d.remaining_amount.to_f, interest_rate: d.interest_rate.to_f, min_payment: d.emi_amount.to_f } }
      payoff_service = DebtPayoffService.new(debt_attrs)
    end

    payoff_plan = payoff_service&.avalanche_plan
    milestones = build_milestones(journey, debts, payoff_plan, snapshot)

    # Net worth trajectory from WealthJourneyTracker
    tracker = WealthJourneyTracker.new(current_user)
    net_worth_traj = tracker.net_worth_trajectory(months: 12)

    render_success({
      debt_progress: { total_debt: total_debt, paid_debt: paid_debt, original_debt: original_debt, reduction_pct: debt_reduction_pct },
      sip_progress: { monthly_goal: journey&.monthly_sip_goal.to_f, progress: journey&.progress_percentage || 0 },
      net_worth_progress: { current: snapshot&.net_worth.to_f, target: nw_target, progress_pct: nw_progress_pct },
      net_worth_trajectory: net_worth_traj[:trajectory],
      milestones: milestones
    })
  end

  private

  def build_milestones(journey, debts, payoff_plan, snapshot)
    milestones = []

    # Milestone 1: Debt-free
    if debts.any? && payoff_plan
      milestones << {
        id: "debt_free",
        title: "Debt-Free",
        target_date: Date.today + payoff_plan[:months].months,
        description: "Pay off all active debts",
        progress: journey.progress_percentage || 0,
        status: payoff_plan[:months] == 0 ? "completed" : "in_progress"
      }
    else
      milestones << {
        id: "debt_free",
        title: "Debt-Free",
        target_date: nil,
        description: "No active debts — you're already debt-free!",
        progress: 100,
        status: "completed"
      }
    end

    # Milestone 2: First ₹1L net worth
    if snapshot
      nw_progress = snapshot.net_worth.to_f >= 100000 ? 100 : [(snapshot.net_worth.to_f / 100000.0 * 100).round(1), 0].max
      milestones << {
        id: "net_worth_1l",
        title: "₹1 Lakh Net Worth",
        target_date: nil,
        description: "Build net worth to ₹1,00,000",
        progress: nw_progress,
        status: snapshot.net_worth.to_f >= 100000 ? "completed" : "in_progress"
      }
    end

    # Milestone 3: SIP goal progress
    if journey&.monthly_sip_goal.to_f > 0
      sip_progress = journey.progress_percentage || 0
      milestones << {
        id: "sip_goal",
        title: "Monthly SIP Goal",
        target_date: nil,
        description: "Reach monthly SIP target of #{Currency.symbol_for(current_user.currency)}#{journey.monthly_sip_goal.to_i}",
        progress: sip_progress,
        status: sip_progress >= 100 ? "completed" : "in_progress"
      }
    end

    milestones
  end

  def net_worth
    snapshot = NetWorthSnapshot.current(current_user)
    render_success({
      net_worth: snapshot.net_worth.to_f,
      trajectory: []
    })
  end
end
