class Api::PortfoliosController < Api::BaseController
  def index
    portfolios = current_user.portfolios.order(created_at: :desc)
    render_success(portfolios.map { |p| portfolio_json(p) })
  end

  def show
    portfolio = current_user.portfolios.find(params[:id])
    render_success(portfolio_json(portfolio))
  end

  def create
    portfolio = current_user.portfolios.create!(portfolio_params)
    render_success(portfolio_json(portfolio), status: :created)
  end

  def update
    portfolio = current_user.portfolios.find(params[:id])
    portfolio.update!(portfolio_params)
    render_success(portfolio_json(portfolio))
  end

  def destroy
    current_user.portfolios.find(params[:id]).destroy!
    head :no_content
  end

  def rebalance
    portfolio = current_user.portfolios.find(params[:id])
    investments = current_user.investments.where(portfolio_id: portfolio.id)
    stocks = investments.select { |i| %w[stock etf].include?(i.investment_type.to_s) }

    if stocks.empty?
      return render_success({ message: "No stock or ETF investments to rebalance" })
    end

    assets = stocks.map do |inv|
      {
        symbol: inv.symbol,
        expected_return: inv.expected_return || 0.10,
        volatility: inv.volatility || 0.20
      }
    end

    service = PortfolioService.new(assets, risk_tolerance: portfolio.risk_tolerance || 0.5)
    result = service.optimize

    render_success(result)
  end

  def research
    portfolio = current_user.portfolios.find(params[:id])
    investments = current_user.investments.where(portfolio_id: params[:id])
    stocks = investments.select { |i| %w[stock etf].include?(i.investment_type.to_s) }

    if stocks.empty?
      return render_success({ message: "No stock or ETF investments to research" })
    end

    stocks.each do |inv|
      DexterResearchJob.perform_async(params[:id], inv.symbol, inv.respond_to?(:exchange) ? (inv.exchange || "US") : "US")
    end

    render_success({
      message: "Research queued for #{stocks.size} investment(s)",
      queued_count: stocks.size
    })
  end

  def prices
    portfolio = current_user.portfolios.find(params[:id])
    investments = current_user.investments.where(portfolio_id: params[:id])
    adapter = Providers::AlphaVantageAdapter.new
    prices = investments.map do |inv|
      quote = adapter.fetch_quote(inv.yahoo_symbol)
      next unless quote
      gain = quote[:price] && inv.buy_price ? (quote[:price] - inv.buy_price) * (inv.shares || 0) : nil
      { id: inv.id, symbol: inv.symbol, name: inv.name, price: quote[:price],
        change: quote[:change], change_pct: quote[:change_pct],
        buy_price: inv.buy_price, shares: inv.shares, gain: gain&.round(2) }
    end.compact
    render_success({ portfolio_id: portfolio.id, prices: prices, updated_at: Time.current })
  end

  private

  def portfolio_params
    source = params[:portfolio].presence || params
    source.permit(:name, :goal, :risk_tolerance, :currency_code, :description,
                  target_allocation: {}, current_allocation: {})
  end

  def portfolio_json(p)
    total_value = p.respond_to?(:total_value) ? p.total_value.to_f : p.amount.to_f
    all_sectors = p.allocation_summary

    {
      id: p.id, name: p.name, goal: p.goal, risk_tolerance: p.risk_tolerance&.to_f,
      total_value: total_value,
      allocation_summary: all_sectors,
      investments: p.investments.map { |i| investment_json(i) },
      dividend_sips: p.dividend_sips.map { |ds|
        { id: ds.id, amount: ds.amount.to_f, frequency: ds.frequency, status: ds.status,
          target_income: ds.target_income.to_f, next_execution: ds.next_execution }
      },
      research_analyses: p.research_analyses.order(created_at: :desc).limit(5).map { |ra|
        { id: ra.id, ticker: ra.ticker, company_name: ra.company_name, status: ra.status,
          sector: ra.sector, created_at: ra.created_at }
      },
      created_at: p.created_at
    }
  end

  def investment_json(i)
    {
      id: i.id, symbol: i.symbol, name: i.name,
      investment_type: i.investment_type, exchange: i.exchange,
      shares: i.shares, buy_price: i.buy_price.to_f,
      current_price: i.current_price.to_f,
      current_value: i.current_value.round(2),
      cost_basis: i.cost_basis.round(2),
      gain_loss: i.gain_loss.round(2),
      gain_loss_pct: i.gain_loss_percentage,
      dividend_yield: i.dividend_yield.to_f,
      sector: i.sector, currency_code: i.currency_code
    }
  end
end
