class PortfolioService
  def initialize(assets, risk_tolerance: 0.5)
    @assets = assets.map(&:symbolize_keys)
    @risk_tolerance = risk_tolerance.to_f
  end

  def optimize
    return default_allocation if @assets.length < 2

    {
      optimal_weights: calculate_optimal_weights,
      expected_return: portfolio_return,
      volatility: portfolio_volatility,
      sharpe_ratio: sharpe_ratio
    }
  end

  def efficient_frontier(points: 10)
    results = []
    (0..points).each do |i|
      target_return = min_return + ((max_return - min_return) * (i.to_f / points))
      results << { return: target_return.round(4), volatility: simulate_volatility(target_return).round(4) }
    end
    results
  end

  private

  def calculate_optimal_weights
    total_risk = @assets.sum do |a|
      (a[:expected_return].to_f * (1 - @risk_tolerance)) + (a[:volatility].to_f * @risk_tolerance)
    end
    @assets.map do |asset|
      weight = ((asset[:expected_return].to_f * (1 - @risk_tolerance)) + (asset[:volatility].to_f * @risk_tolerance)) / total_risk
      { asset: asset[:symbol], weight: weight.round(4) }
    end
  end

  def portfolio_return
    total_weight = calculate_optimal_weights.sum { |w| w[:weight] }
    calculate_optimal_weights.sum do |w|
      w[:weight] * @assets.find { |a|
        a[:symbol] == w[:asset]
      }[:expected_return].to_f
    end / total_weight
  end

  def portfolio_volatility
    weights = calculate_optimal_weights
    variance = weights.sum { |w| (w[:weight]**2) * (@assets.find { |a| a[:symbol] == w[:asset] }[:volatility].to_f**2) }
    Math.sqrt(variance).round(4)
  end

  def sharpe_ratio
    risk_free_rate = 0.05
    ((portfolio_return - risk_free_rate) / portfolio_volatility).round(2)
  end

  def min_return
    @assets.map { |a| a[:expected_return].to_f }.min
  end

  def max_return
    @assets.map { |a| a[:expected_return].to_f }.max
  end

  def simulate_volatility(_target_return)
    portfolio_volatility * (0.8 + (rand * 0.4))
  end

  def default_allocation
    weight = 1.0 / @assets.length
    { optimal_weights: @assets.map { |a| { asset: a[:symbol], weight: weight.round(4) } } }
  end
end
