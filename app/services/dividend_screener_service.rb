class DividendScreenerService
  DEFAULT_CANDIDATES = {
    "IN" => %w[RELIANCE.NS TCS.NS HDFCBANK.NS INFY.NS ITC.NS HINDUNILVR.NS],
    "US" => %w[AAPL MSFT JNJ KO PEP PG O VZ DUK SO],
    "UK" => %w[ULVR.L SHEL.L GSK.L BATS.L BLND.L],
    "JP" => %w[7203.T 8306.T 9432.T 4502.T],
    "CA" => %w[RY.TO TD.TO ENB.TO BNS.TO]
  }.freeze
  INDIAN_ETF_CANDIDATES = %w[NIFTYBEES.NS JUNIORBEES.NS]
  DISCLAIMER = "Educational purposes only — not investment advice. Dividend yields and " \
               "prices change; past performance does not guarantee future returns. " \
               "Consult a SEBI-registered financial adviser before investing.".freeze

  def initialize(provider: nil)
    @provider = provider || Providers::YahooFinanceAdapter.new
  end

  def screen(target_income: nil, risk_tolerance: "moderate", market: "IN")
    candidates = fetch_candidates(market)
    screened = candidates.map { |s| enrich(s) }.compact

    screened = screened.select { |s| s[:yield] >= 0.5 }
    screened = screened.sort_by { |s| -score(s) }

    if target_income
      if screened.any?
        required_capital = target_income / (screened.first[:yield] / 100.0) rescue 0
        screened.first[:required_capital] = required_capital.round(2)
      end
    end

    screened.first(5)
  end

  def suggest_dividend_stocks(monthly_investment: 5000, years: 10, market: "IN")
    target_income = monthly_investment * 12 * years * 0.06
    results = screen(target_income: target_income, market: market)

    results.each do |r|
      shares = monthly_investment / r[:price] rescue 0
      r[:monthly_shares] = shares.round(2)
      r[:projected_monthly_income] = ((r[:annual_dividend] / 12) * shares).round(2)
    end

    { stocks: results, target_income: target_income.round(2), market: market, disclaimer: DISCLAIMER }
  end

  private

  def fetch_candidates(market)
    stocks = (DEFAULT_CANDIDATES[market] || DEFAULT_CANDIDATES["IN"]).map { |s| { symbol: s, market: market } }
    stocks + INDIAN_ETF_CANDIDATES.map { |s| { symbol: s, market: "IN" } }
  end

  def enrich(stock)
    quote = @provider.fetch_quote(stock[:symbol])
    return nil unless quote && quote[:price].to_f > 0

    div = @provider.fetch_dividend(stock[:symbol])
    stock.merge(
      price: quote[:price],
      currency: quote[:currency] || "INR",
      annual_dividend: div ? div[:annual_dividend] : 0,
      yield: div ? div[:yield] : 0,
      previous_close: quote[:previous_close],
      name: stock[:name],
      market: stock[:market]
    )
  end

  def score(stock)
    score = 0.0
    score += stock[:yield] * 60
    score += stock[:annual_dividend] / stock[:price] * 100 * 40
    score
  end
end
