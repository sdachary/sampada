require 'rails_helper'

RSpec.describe ExchangeRateService, type: :service do
  subject(:service) { described_class.new }

  describe '#fetch_rate' do
    it 'returns 1.0 for same currency' do
      expect(service.fetch_rate(from: 'USD', to: 'USD')).to eq(1.0)
    end

    it 'fetches and caches rate from provider' do
      stub_request(:get, /query1\.finance\.yahoo\.com/)
        .to_return(status: 200, body: '{"chart":{"result":[{"meta":{"regularMarketPrice":83.5}}]}}')
      rate = service.fetch_rate(from: 'USD', to: 'INR')
      expect(rate).to be_a(Numeric)
      expect(rate).to be > 0
    end
  end

  describe '#convert' do
    it 'returns same amount for same currency' do
      expect(service.convert(100, from: 'USD', to: 'USD')).to eq(100)
    end

    it 'converts using fetched rate' do
      allow(service).to receive(:fetch_rate).with(from: 'USD', to: 'INR').and_return(83.0)
      expect(service.convert(100, from: 'USD', to: 'INR')).to eq(8300.0)
    end
  end

  describe '.sync_all' do
    it 'fetches rates for all active currencies' do
      create(:currency, code: 'EUR', name: 'Euro', symbol: '€')
      create(:currency, code: 'GBP', name: 'Pound', symbol: '£')
      create(:currency, code: 'USD', name: 'Dollar', symbol: '$')

      stub_request(:get, /query1\.finance\.yahoo\.com/)
        .to_return(status: 200, body: '{"chart":{"result":[{"meta":{"regularMarketPrice": 1.0}}]}}')

      expect { described_class.sync_all(base_currency: 'USD') }
        .to change(ExchangeRate, :count).by(2)
    end
  end
end
