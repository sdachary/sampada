require 'rails_helper'

RSpec.describe Providers::YahooFinanceAdapter do
  subject(:adapter) { described_class.new }

  describe '#fetch_quote' do
    context 'when API responds successfully' do
      let(:response_body) do
        {
          chart: {
            result: [
              {
                meta: {
                  symbol: 'ITC.NS',
                  currency: 'INR',
                  regularMarketPrice: 420.50,
                  previousClose: 418.00,
                  regularMarketTime: 1_700_000_000
                },
                indicators: {
                  quote: [
                    {
                      close: [418.0, 420.5],
                      high: [419.0, 422.0],
                      low: [417.0, 419.5],
                      volume: [1_000_000, 1_200_000]
                    }
                  ]
                }
              }
            ]
          }
        }.to_json
      end

      before do
        stub_request(:get, 'https://query1.finance.yahoo.com/v8/finance/chart/ITC.NS')
          .with(headers: { 'User-Agent' => 'Mozilla/5.0' })
          .to_return(status: 200, body: response_body, headers: { 'Content-Type' => 'application/json' })
      end

      it 'returns parsed quote data' do
        result = adapter.fetch_quote('ITC.NS')
        expect(result).to include(
          symbol: 'ITC.NS',
          price: 420.5,
          currency: 'INR',
          previous_close: 418.0,
          day_high: 422.0,
          day_low: 419.5,
          volume: 1_200_000
        )
      end

      it 'returns market_time as Time' do
        result = adapter.fetch_quote('ITC.NS')
        expect(result[:market_time]).to be_a(Time)
      end
    end

    context 'when API returns failure' do
      before do
        stub_request(:get, 'https://query1.finance.yahoo.com/v8/finance/chart/UNKNOWN')
          .with(headers: { 'User-Agent' => 'Mozilla/5.0' })
          .to_return(status: 404, body: '{}')
      end

      it 'returns nil' do
        expect(adapter.fetch_quote('UNKNOWN')).to be_nil
      end
    end

    context 'when network error occurs' do
      before do
        stub_request(:get, 'https://query1.finance.yahoo.com/v8/finance/chart/TIMEOUT')
          .with(headers: { 'User-Agent' => 'Mozilla/5.0' })
          .to_timeout
      end

      it 'returns nil and logs warning' do
        expect(Rails.logger).to receive(:warn).with(/Failed to fetch TIMEOUT/)
        expect(adapter.fetch_quote('TIMEOUT')).to be_nil
      end
    end
  end

  describe '#search' do
    context 'when results found' do
      let(:response_body) do
        {
          quotes: [
            { symbol: 'ITC.NS', longname: 'ITC Limited', exchange: 'NSI', typeDisp: 'Equity' },
            { symbol: 'TCS.NS', longname: 'Tata Consultancy Services', exchange: 'NSI', typeDisp: 'Equity' },
            { symbol: 'NIFTY', longname: 'Nifty Index', exchange: 'NSI', typeDisp: 'Index' }
          ]
        }.to_json
      end

      before do
        stub_request(:get, 'https://query1.finance.yahoo.com/v1/finance/search?q=ITC')
          .with(headers: { 'User-Agent' => 'Mozilla/5.0' })
          .to_return(status: 200, body: response_body, headers: { 'Content-Type' => 'application/json' })
      end

      it 'returns only equity matches' do
        results = adapter.search('ITC')
        expect(results.size).to eq(2)
        expect(results).to all(include(:symbol, :name, :exchange))
      end

      it 'excludes non-equity types' do
        results = adapter.search('ITC')
        expect(results.pluck(:symbol)).not_to include('NIFTY')
      end
    end

    context 'when API fails' do
      before do
        stub_request(:get, 'https://query1.finance.yahoo.com/v1/finance/search?q=FAIL')
          .with(headers: { 'User-Agent' => 'Mozilla/5.0' })
          .to_return(status: 500, body: '{}')
      end

      it 'returns empty array' do
        expect(adapter.search('FAIL')).to eq([])
      end
    end
  end

  describe '#fetch_dividend' do
    context 'when dividends exist' do
      let(:response_body) do
        {
          chart: {
            result: [
              {
                meta: { regularMarketPrice: 420.0 },
                events: {
                  dividends: {
                    ev1: { amount: 6.0, date: 1_700_000_000 },
                    ev2: { amount: 6.0, date: 1_710_000_000 },
                    ev3: { amount: 6.25, date: 1_720_000_000 },
                    ev4: { amount: 6.25, date: 1_730_000_000 }
                  }
                }
              }
            ]
          }
        }.to_json
      end

      before do
        stub_request(:get, 'https://query1.finance.yahoo.com/v8/finance/chart/ITC.NS?range=1y&interval=1mo')
          .with(headers: { 'User-Agent' => 'Mozilla/5.0' })
          .to_return(status: 200, body: response_body, headers: { 'Content-Type' => 'application/json' })
      end

      it 'calculates annual dividend and yield' do
        result = adapter.fetch_dividend('ITC.NS')
        expect(result).to include(
          annual_dividend: 24.5,
          yield: 5.83,
          occurrences: 4
        )
      end
    end

    context 'when no dividends' do
      let(:response_body) do
        {
          chart: {
            result: [
              { meta: { regularMarketPrice: 100.0 }, events: {} }
            ]
          }
        }.to_json
      end

      before do
        stub_request(:get, 'https://query1.finance.yahoo.com/v8/finance/chart/NODIV.NS?range=1y&interval=1mo')
          .with(headers: { 'User-Agent' => 'Mozilla/5.0' })
          .to_return(status: 200, body: response_body, headers: { 'Content-Type' => 'application/json' })
      end

      it 'returns nil' do
        expect(adapter.fetch_dividend('NODIV.NS')).to be_nil
      end
    end

    context 'when API fails' do
      before do
        stub_request(:get, 'https://query1.finance.yahoo.com/v8/finance/chart/FAIL.NS?range=1y&interval=1mo')
          .with(headers: { 'User-Agent' => 'Mozilla/5.0' })
          .to_return(status: 500, body: '{}')
      end

      it 'returns nil' do
        expect(adapter.fetch_dividend('FAIL.NS')).to be_nil
      end
    end
  end

  describe '#fetch_exchange_rate' do
    before do
      stub_request(:get, 'https://query1.finance.yahoo.com/v8/finance/chart/USDINR=X')
        .with(headers: { 'User-Agent' => 'Mozilla/5.0' })
        .to_return(status: 200, body: {
          chart: {
            result: [
              {
                meta: { regularMarketPrice: 83.50, symbol: 'USDINR=X' },
                indicators: { quote: [{}] }
              }
            ]
          }
        }.to_json, headers: { 'Content-Type' => 'application/json' })
    end

    it 'returns exchange rate' do
      expect(adapter.fetch_exchange_rate('USD', 'INR')).to eq(83.50)
    end
  end
end
