class DividendSipService
  def initialize(stocks, investment_amount)
    @stocks = stocks.map(&:symbolize_keys)
    @investment_amount = investment_amount.to_f
  end

  def analyze
    {
      total_yield: weighted_yield,
      recommendations: allocate_sip,
      stock_analysis: @stocks.map { |s| analyze_stock(s) }
    }
  end

  private

  def weighted_yield
    total_weight = @stocks.sum { |s| s[:weight] || 1 }
    @stocks.sum { |s| (s[:dividend_yield] || 0) * (s[:weight] || 1) / total_weight }
  end

  def allocate_sip
    total_score = @stocks.sum { |s| score_stock(s) }
    @stocks.map do |stock|
      allocation = (@investment_amount * score_stock(stock) / total_score).round(2)
      {
        stock: stock[:symbol],
        allocation: allocation,
        percentage: ((allocation / @investment_amount) * 100).round(2)
      }
    end
  end

  def score_stock(stock)
    yield_score = stock[:dividend_yield] || 0
    growth_score = stock[:growth_rate] || 0
    ((yield_score * 0.6) + (growth_score * 0.4)) * (stock[:weight] || 1)
  end

  def analyze_stock(stock)
    {
      symbol: stock[:symbol],
      dividend_yield: stock[:dividend_yield],
      score: score_stock(stock).round(2),
      recommendation: stock[:dividend_yield].to_f > 3 ? 'buy' : 'hold'
    }
  end
end
