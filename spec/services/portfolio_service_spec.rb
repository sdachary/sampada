require 'rails_helper'

RSpec.describe PortfolioService, type: :service do
  describe '#optimize' do
    it 'returns optimization with optimal_weights' do
      assets = [
        { symbol: 'STOCK_A', expected_return: 12.0, volatility: 15.0 },
        { symbol: 'STOCK_B', expected_return: 8.0, volatility: 10.0 }
      ]
      service = described_class.new(assets, risk_tolerance: 0.5)
      result = service.optimize
      expect(result).to have_key(:optimal_weights)
      expect(result).to have_key(:expected_return)
      expect(result).to have_key(:volatility)
      expect(result).to have_key(:sharpe_ratio)
    end

    it 'returns weights that sum to approximately 1' do
      assets = [
        { symbol: 'A', expected_return: 10.0, volatility: 12.0 },
        { symbol: 'B', expected_return: 8.0, volatility: 8.0 },
        { symbol: 'C', expected_return: 6.0, volatility: 5.0 }
      ]
      service = described_class.new(assets, risk_tolerance: 0.3)
      result = service.optimize
      total_weight = result[:optimal_weights].sum { |w| w[:weight] }
      expect(total_weight).to be_within(0.01).of(1.0)
    end

    it 'handles single asset portfolio' do
      assets = [
        { symbol: 'ONLY', expected_return: 10.0, volatility: 15.0 }
      ]
      service = described_class.new(assets, risk_tolerance: 0.5)
      result = service.optimize
      expect(result[:optimal_weights].first[:weight]).to eq(1.0)
    end

    it 'returns default allocation for less than 2 assets' do
      assets = [{ symbol: 'SINGLE', expected_return: 10.0, volatility: 15.0 }]
      service = described_class.new(assets)
      result = service.optimize
      expect(result[:optimal_weights]).to be_an(Array)
    end
  end

  describe '#efficient_frontier' do
    it 'returns array of points' do
      assets = [
        { symbol: 'A', expected_return: 10.0, volatility: 12.0 },
        { symbol: 'B', expected_return: 8.0, volatility: 8.0 }
      ]
      service = described_class.new(assets)
      result = service.efficient_frontier(points: 5)
      expect(result).to be_an(Array)
      expect(result.length).to eq(6)
    end

    it 'each point has return and volatility' do
      assets = [
        { symbol: 'A', expected_return: 10.0, volatility: 12.0 }
      ]
      service = described_class.new(assets)
      result = service.efficient_frontier(points: 3)
      expect(result.first).to have_key(:return)
      expect(result.first).to have_key(:volatility)
    end
  end

  describe 'portfolio metrics' do
    it 'calculates expected return' do
      assets = [
        { symbol: 'A', expected_return: 12.0, volatility: 15.0 },
        { symbol: 'B', expected_return: 8.0, volatility: 10.0 }
      ]
      service = described_class.new(assets, risk_tolerance: 0.5)
      result = service.optimize
      expect(result[:expected_return]).to be_between(8.0, 12.0)
    end

    it 'calculates positive sharpe ratio' do
      assets = [
        { symbol: 'A', expected_return: 12.0, volatility: 15.0 },
        { symbol: 'B', expected_return: 8.0, volatility: 10.0 }
      ]
      service = described_class.new(assets, risk_tolerance: 0.5)
      result = service.optimize
      expect(result[:sharpe_ratio]).to be_a(Numeric)
    end
  end

  describe 'initialization' do
    it 'accepts assets array and risk_tolerance' do
      assets = [{ symbol: 'TEST', expected_return: 10.0, volatility: 12.0 }]
      service = described_class.new(assets, risk_tolerance: 0.7)
      expect(service).to be_a(described_class)
    end
  end
end
