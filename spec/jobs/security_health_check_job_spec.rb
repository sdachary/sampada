require 'rails_helper'

RSpec.describe SecurityHealthCheckJob, type: :job do
  describe '#perform' do
    it 'queues import for investments missing prices' do
      user = create(:user)
      portfolio = create(:portfolio, user: user)
      create(:investment, portfolio: portfolio, symbol: 'AAPL', current_price: nil)

      expect(ImportMarketDataJob).to receive(:perform_async).once
      subject.perform
    end

    it 'does not queue import when all investments have prices' do
      user = create(:user)
      portfolio = create(:portfolio, user: user)
      create(:investment, portfolio: portfolio, symbol: 'AAPL', current_price: 150.0)

      expect(ImportMarketDataJob).not_to receive(:perform_async)
      subject.perform
    end
  end
end
