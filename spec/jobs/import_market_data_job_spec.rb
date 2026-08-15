require 'rails_helper'

RSpec.describe ImportMarketDataJob, type: :job do
  describe '#perform' do
    it 'updates investments with fresh quotes' do
      user = create(:user)
      portfolio = create(:portfolio, user: user)
      investment = create(:investment, portfolio: portfolio, symbol: 'RELIANCE.NS')

      stub_request(:get, /query1\.finance\.yahoo\.com/)
        .to_return(status: 200, body: '{"chart":{"result":[{"meta":{"regularMarketPrice":420.5,"currency":"INR","regularMarketTime":1700000000},"indicators":{"quote":[{"close":[418.0,420.5],"high":[419.0,422.0],"low":[417.0,419.5],"volume":[1000000,1200000]}]}}]}}')
      expect { subject.perform }.to change { investment.reload.current_price }.from(nil).to be_a(Numeric)
    end
  end
end
