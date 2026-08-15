require 'rails_helper'

RSpec.describe DividendScreenerService do
  subject(:screener) { described_class.new(provider: provider) }

  let(:provider) { instance_double(Providers::YahooFinanceAdapter) }

  let(:itc_quote) do
    { symbol: 'ITC.NS', price: 420.0, currency: 'INR', previous_close: 418.0 }
  end
  let(:itc_dividend) do
    { annual_dividend: 24.5, yield: 5.83, occurrences: 4 }
  end

  let(:reliance_quote) do
    { symbol: 'RELIANCE.NS', price: 2800.0, currency: 'INR', previous_close: 2780.0 }
  end
  let(:reliance_dividend) do
    { annual_dividend: 42.0, yield: 1.5, occurrences: 2 }
  end

  before do
    allow(provider).to receive(:fetch_quote).with('RELIANCE.NS').and_return(reliance_quote)
    allow(provider).to receive(:fetch_quote).with('TCS.NS').and_return(nil)
    allow(provider).to receive(:fetch_quote).with('HDFCBANK.NS').and_return(nil)
    allow(provider).to receive(:fetch_quote).with('INFY.NS').and_return(nil)
    allow(provider).to receive(:fetch_quote).with('ITC.NS').and_return(itc_quote)
    allow(provider).to receive(:fetch_quote).with('HINDUNILVR.NS').and_return(nil)
    allow(provider).to receive(:fetch_quote).with('NIFTYBEES.NS').and_return(nil)
    allow(provider).to receive(:fetch_quote).with('JUNIORBEES.NS').and_return(nil)

    allow(provider).to receive(:fetch_dividend).with('RELIANCE.NS').and_return(reliance_dividend)
    allow(provider).to receive(:fetch_dividend).with('ITC.NS').and_return(itc_dividend)
  end

  describe '#screen' do
    it 'returns top scored stocks sorted by score' do
      results = screener.screen
      expect(results).to be_an(Array)
      expect(results.size).to be <= 5
    end

    it 'filters out stocks without valid quotes' do
      results = screener.screen
      expect(results.pluck(:symbol)).to all(be_in(%w[ITC.NS RELIANCE.NS]))
    end

    it 'excludes stocks with yield below 0.5%' do
      low_yield_quote = { symbol: 'LOW.NS', price: 100.0, currency: 'INR', previous_close: 99.0 }
      low_yield_div = { annual_dividend: 0.1, yield: 0.1, occurrences: 1 }

      allow(provider).to receive(:fetch_quote).with('LOW.NS').and_return(low_yield_quote)
      allow(provider).to receive(:fetch_dividend).with('LOW.NS').and_return(low_yield_div)

      screener_with_low = described_class.new(provider: provider)
      allow(screener_with_low).to receive(:fetch_candidates).and_return([{ symbol: 'LOW.NS' }])

      results = screener_with_low.screen
      expect(results).to be_an(Array)
      expect(results).to be_empty
    end

    context 'with target income' do
      it 'includes required_capital on top result' do
        results = screener.screen(target_income: 100_000)
        expect(results.first).to have_key(:required_capital)
      end
    end
  end

  describe '#suggest_dividend_stocks' do
    it 'returns stocks with monthly_shares and projected_monthly_income' do
      result = screener.suggest_dividend_stocks(monthly_investment: 5000, years: 10)
      expect(result).to have_key(:stocks)
      expect(result).to have_key(:target_income)
      expect(result[:stocks].first).to have_key(:monthly_shares)
      expect(result[:stocks].first).to have_key(:projected_monthly_income)
    end
  end

  describe 'private methods' do
    describe '#fetch_candidates' do
      it 'returns default candidates plus ETF candidates' do
        candidates = screener.send(:fetch_candidates, 'IN')
        expect(candidates.size).to eq(8)
        expect(candidates.pluck(:symbol)).to include('ITC.NS', 'RELIANCE.NS', 'NIFTYBEES.NS')
      end
    end

    describe '#score' do
      let(:stock) do
        { symbol: 'TEST', price: 100.0, annual_dividend: 5.0, yield: 5.0 }
      end

      it 'assigns weighted score based on yield and dividend growth proxy' do
        score = screener.send(:score, stock)
        expected = (5.0 * 60) + (5.0 / 100.0 * 100 * 40)
        expect(score).to eq(expected)
      end
    end
  end
end
