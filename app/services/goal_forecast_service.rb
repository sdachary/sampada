# frozen_string_literal: true

class GoalForecastService
  ALLOCATIONS = {
    'conservative' => { equity: 30, debt: 50, gold: 20 },
    'moderate' => { equity: 50, debt: 30, gold: 20 },
    'aggressive' => { equity: 70, debt: 20, gold: 10 }
  }.freeze

  def initialize(goal)
    @goal = goal
  end

  def projection
    monthly = @goal.monthly_sip.to_f
    top_up = @goal.top_up_monthly
    months = (@goal.target_year - Date.current.year) * 12
    return empty_projection if months <= 0

    preset = ALLOCATIONS[@goal.allocation]
    blended = blended_cagr(preset, @goal.equity_growth.to_f, @goal.debt_growth.to_f, @goal.gold_growth.to_f)
    rate = blended / 100.0
    monthly_rate = (1.0 + rate) ** (1.0 / 12.0) - 1.0

    corpus = 0.0
    yearly_points = []

    (1..months).each do |m|
      corpus += monthly + top_up
      corpus *= (1.0 + monthly_rate)

      year_num = (m / 12.0).ceil
      if (m % 12).zero?
        yearly_points << {
          year: Date.current.year + year_num,
          projected_corpus: corpus.round(2),
          goal_target: @goal.target_amount.to_f
        }
      end
    end

    final_target_year = Date.current.year + (months / 12.0).ceil
    if yearly_points.last&.dig(:year) != final_target_year
      yearly_points << {
        year: final_target_year,
        projected_corpus: corpus.round(2),
        goal_target: @goal.target_amount.to_f
      }
    end

    { projection: yearly_points, final_corpus: corpus.round(2), months: months }
  end

  def risk_comparison
    monthly = @goal.monthly_sip.to_f
    top_up = @goal.top_up_monthly
    months = (@goal.target_year - Date.current.year) * 12
    return empty_comparison if months <= 0

    results = {}
    ALLOCATIONS.each do |name, preset|
      blended = blended_cagr(preset, @goal.equity_growth.to_f, @goal.debt_growth.to_f, @goal.gold_growth.to_f)
      rate = blended / 100.0
      monthly_rate = (1.0 + rate) ** (1.0 / 12.0) - 1.0

      corpus = 0.0
      yearly_points = []

      (1..months).each do |m|
        corpus += monthly + top_up
        corpus *= (1.0 + monthly_rate)

        if (m % 12).zero?
          year_num = (m / 12.0).ceil
          yearly_points << {
            year: Date.current.year + year_num,
            projected_corpus: corpus.round(2)
          }
        end
      end

      results[name] = {
        points: yearly_points,
        final_corpus: corpus.round(2),
        blended_cagr: blended.round(2),
        equity_pct: preset[:equity],
        debt_pct: preset[:debt],
        gold_pct: preset[:gold]
      }
    end

    results
  end

  private

  def blended_cagr(preset, equity_growth, debt_growth, gold_growth)
    (preset[:equity] / 100.0 * equity_growth) +
      (preset[:debt] / 100.0 * debt_growth) +
      (preset[:gold] / 100.0 * gold_growth)
  end

  def empty_projection
    { projection: [{ year: Date.current.year, projected_corpus: 0, goal_target: @goal.target_amount.to_f }],
      final_corpus: 0, months: 0 }
  end

  def empty_comparison
    ALLOCATIONS.each_with_object({}) do |(name, preset), h|
      h[name] = {
        points: [{ year: Date.current.year, projected_corpus: 0 }],
        final_corpus: 0,
        blended_cagr: blended_cagr(preset, @goal.equity_growth.to_f, @goal.debt_growth.to_f, @goal.gold_growth.to_f).round(2),
        equity_pct: preset[:equity], debt_pct: preset[:debt], gold_pct: preset[:gold]
      }
    end
  end
end
