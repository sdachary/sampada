class Api::InvestmentsController < Api::BaseController
  def index
    investments = Investment.joins(:portfolio)
      .where(portfolios: { user_id: current_user.id })
      .order(created_at: :desc)
    render_success(investments.map { |i| investment_json(i) })
  end

  def create
    portfolio = current_user.portfolios.find(params[:portfolio_id])
    investment = portfolio.investments.create!(investment_params)
    render_success(investment_json(investment), status: :created)
  end

  def update
    investment = Investment.joins(:portfolio)
      .where(portfolios: { user_id: current_user.id })
      .find(params[:id])
    investment.update!(investment_params)
    render_success(investment_json(investment))
  end

  def destroy
    investment = Investment.joins(:portfolio)
      .where(portfolios: { user_id: current_user.id })
      .find(params[:id])
    investment.destroy!
    render_success({}, message: "Investment deleted")
  end

  private

  def investment_params
    params.permit(:symbol, :name, :shares, :buy_price, :investment_type, :sector, :notes,
                  :currency_code, :exchange)
  end

  def investment_json(i)
    shares = i.shares.to_f
    buy_price = i.buy_price.to_f
    current_price = i.current_price.to_f
    current_value = shares * current_price
    cost_basis = shares * buy_price
    gain_loss = current_value - cost_basis
    gain_loss_pct = cost_basis > 0 ? ((gain_loss / cost_basis) * 100).round(2) : 0
    cc = i.currency_code.presence || "INR"

    { id: i.id, symbol: i.symbol, name: i.name, shares: shares,
      buy_price: buy_price, current_price: current_price,
      current_value: current_value, gain_loss: gain_loss,
      gain_loss_pct: gain_loss_pct, dividend_yield: i.dividend_yield&.to_f,
      sector: i.sector, investment_type: i.investment_type,
      currency_code: cc, currency_symbol: Currency.symbol_for(cc),
      exchange: i.exchange }
  end
end
