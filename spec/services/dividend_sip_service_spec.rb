require 'rails_helper'

RSpec.describe DividendSipService, type: :service do
  describe '#analyze' do
    it 'returns analysis with total_yield and recommendations' do
      stocks = [
        { symbol: 'TCS', dividend_yield: 4.0, growth_rate: 12.0, weight: 1 },
        { symbol: 'INFY', dividend_yield: 3.5, growth_rate: 10.0, weight: 1 }
      ]
      service = described_class.new(stocks, 10_000)
      result = service.analyze
      expect(result).to have_key(:total_yield)
      expect(result).to have_key(:recommendations)
      expect(result).to have_key(:stock_analysis)
    end

    it 'calculates weighted yield correctly' do
      stocks = [
        { symbol: 'A', dividend_yield: 2.0, growth_rate: 10.0, weight: 1 },
        { symbol: 'B', dividend_yield: 4.0, growth_rate: 8.0, weight: 1 }
      ]
      service = described_class.new(stocks, 10_000)
      result = service.analyze
      expect(result[:total_yield]).to be_between(2.0, 4.0)
    end

    it 'provides allocation recommendations' do
      stocks = [
        { symbol: 'ITC', dividend_yield: 3.8, growth_rate: 8.0, weight: 2 },
        { symbol: 'HUL', dividend_yield: 2.5, growth_rate: 12.0, weight: 1 }
      ]
      service = described_class.new(stocks, 5000)
      result = service.analyze
      expect(result[:recommendations]).to be_an(Array)
      expect(result[:recommendations].first).to have_key(:stock)
      expect(result[:recommendations].first).to have_key(:allocation)
    end

    it 'analyzes individual stocks' do
      stocks = [
        { symbol: 'RELIANCE', dividend_yield: 3.0, growth_rate: 15.0 }
      ]
      service = described_class.new(stocks, 10_000)
      result = service.analyze
      expect(result[:stock_analysis].first[:symbol]).to eq('RELIANCE')
      expect(result[:stock_analysis].first[:recommendation]).to be_in(%w[buy hold])
    end
  end

  describe 'stock scoring' do
    it 'gives higher score to stocks with higher yield and growth' do
      stocks = [
        { symbol: 'HIGH', dividend_yield: 5.0, growth_rate: 15.0, weight: 1 },
        { symbol: 'LOW', dividend_yield: 2.0, growth_rate: 5.0, weight: 1 }
      ]
      service = described_class.new(stocks, 10_000)
      result = service.analyze
      high_stock = result[:stock_analysis].find { |s| s[:symbol] == 'HIGH' }
      low_stock = result[:stock_analysis].find { |s| s[:symbol] == 'LOW' }
      expect(high_stock[:score]).to be > low_stock[:score]
    end
  end

  describe 'initialization' do
    it 'accepts stocks array and investment_amount' do
      stocks = [{ symbol: 'TEST', dividend_yield: 3.0, growth_rate: 10.0 }]
      service = described_class.new(stocks, 5000)
      expect(service).to be_a(described_class)
    end
  end
end
