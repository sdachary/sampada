# frozen_string_literal: true

class Api::DividendSipsController < Api::BaseController
  def index
    sips = DividendSip.joins(portfolio: :user)
                      .where(users: { id: current_user.id })
                      .order(created_at: :desc)
    render_success(sips.map { |s| sip_json(s) })
  end

  def show
    sip = DividendSip.joins(portfolio: :user)
                     .where(users: { id: current_user.id })
                     .find(params[:id])
    render_success(sip_json(sip))
  end

  def create
    portfolio_id = sip_params[:portfolio_id]
    return render_error("Portfolio is required", status: :unprocessable_entity) unless portfolio_id
    portfolio = current_user.portfolios.find(portfolio_id)
    sip = portfolio.dividend_sips.create!(sip_params.except(:portfolio_id))
    render_success(sip_json(sip), status: :created)
  end

  def update
    sip = DividendSip.joins(portfolio: :user)
                     .where(users: { id: current_user.id })
                     .find(params[:id])
    sip.update!(sip_params)
    render_success(sip_json(sip))
  end

  def suggest
    sip = DividendSip.joins(portfolio: :user)
                     .where(users: { id: current_user.id })
                     .find(params[:id])
    monthly = (params[:monthly_investment] || sip.amount).to_f
    years = (params[:years] || 10).to_i
    target = monthly * 12 * years * 0.04
    render_success({ stocks: [], target_income: target.round(2),
                     disclaimer: DividendScreenerService::DISCLAIMER })
  end

  def destroy
    sip = DividendSip.joins(portfolio: :user)
                     .where(users: { id: current_user.id })
                     .find(params[:id])
    sip.destroy!
    head :no_content
  end

  private

  def sip_params
    source = params[:dividend_sip].presence || params
    p = source.permit(:portfolio_id, :name, :amount, :frequency, :status,
                      :target_income, :next_execution, :currency_code,
                      :monthly_investment, :dividend_yield)
    p[:amount] = p.delete(:monthly_investment) if p[:monthly_investment].present?
    p
  end

  def sip_json(s)
    monthly_inv = s.try(:monthly_investment) || s.amount.to_f
    { id: s.id, portfolio_id: s.portfolio_id, name: s.name,
      amount: s.amount.to_f, monthly_investment: monthly_inv,
      frequency: s.frequency, status: s.status,
      target_income: s.target_income&.to_f,
      monthly_contribution: s.monthly_contribution.to_f,
      projected_annual_income: s.projected_annual_income.to_f,
      next_execution: s.next_execution, created_at: s.created_at,
      currency_code: s.currency_code, currency_symbol: Currency.symbol_for(s.currency_code) }
  end
end
