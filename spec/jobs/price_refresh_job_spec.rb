# frozen_string_literal: true

require "rails_helper"

RSpec.describe PriceRefreshJob, type: :job do
  let(:portfolio) { create(:portfolio) }
  let(:investment) { create(:investment, portfolio: portfolio, symbol: "AAPL", buy_price: 100, shares: 10) }

  before do
    investment
  end

  context "when the portfolio exists" do
    it "caches quotes from the adapter" do
      quote = { symbol: "AAPL", price: 120.0, previous_close: 119.0, currency: "USD", volume: 1000 }
      adapter = instance_double(Providers::YahooFinanceAdapter, fetch_quote: quote)
      allow(Providers::YahooFinanceAdapter).to receive(:new).and_return(adapter)

      expect(Rails.cache).to receive(:write).with(
        "#{PriceRefreshJob::QUOTE_CACHE_PREFIX}#{portfolio.id}",
        array_including(hash_including(symbol: "AAPL", price: 120.0, change: 1.0, change_pct: 0.84, gain: 200.0)),
        expires_in: PriceRefreshJob::QUOTE_CACHE_TTL
      )

      subject.perform(portfolio.id)
    end
  end

  context "when the portfolio does not exist" do
    it "does nothing" do
      expect(Providers::YahooFinanceAdapter).not_to receive(:new)
      subject.perform(999_999)
    end
  end
end