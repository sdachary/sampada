require 'rails_helper'

RSpec.describe Providers::AlphaVantageAdapter do
  subject(:adapter) { described_class.new }

  describe "#fetch_quote" do
    let(:url) { "https://www.alphavantage.co/query" }

    context "when API responds successfully" do
      let(:response_body) do
        {
          "Global Quote" => {
            "01. symbol" => "IBM",
            "03. high" => "185.0000",
            "04. low" => "182.4000",
            "05. price" => "184.3200",
            "06. volume" => "3280000",
            "07. latest trading day" => "2026-08-12",
            "09. change" => "1.0200",
            "10. change percent" => "0.5561%"
          }
        }
      end

      before do
        stub_request(:get, url)
          .with(query: hash_including(function: "GLOBAL_QUOTE", symbol: "IBM"))
          .to_return(status: 200, body: response_body.to_json, headers: { "Content-Type" => "application/json" })
      end

      it "parses quote fields" do
        result = adapter.fetch_quote("IBM")
        expect(result).to include(
          symbol: "IBM",
          price: 184.32,
          change: 1.02,
          change_pct: 0.5561,
          high: 185.0,
          low: 182.4,
          volume: 3_280_000,
          latest_trading_day: "2026-08-12"
        )
      end
    end

    context "when API returns an empty quote" do
      before do
        stub_request(:get, url).with(query: hash_including(symbol: "UNKNOWN"))
          .to_return(status: 200, body: { "Global Quote" => {} }.to_json, headers: { "Content-Type" => "application/json" })
      end

      it "returns nil" do
        expect(adapter.fetch_quote("UNKNOWN")).to be_nil
      end
    end

    context "when the request fails" do
      before do
        stub_request(:get, url).with(query: hash_including(symbol: "TIMEOUT"))
          .to_timeout
      end

      it "returns nil and logs a warning" do
        expect(Rails.logger).to receive(:warn).with(/Failed to fetch TIMEOUT/)
        expect(adapter.fetch_quote("TIMEOUT")).to be_nil
      end
    end
  end

  describe "#fetch_price" do
    it "returns price when quote exists" do
      allow(adapter).to receive(:fetch_quote).with("IBM").and_return(price: 184.32)
      expect(adapter.fetch_price("IBM")).to eq(184.32)
    end

    it "returns nil when quote missing" do
      allow(adapter).to receive(:fetch_quote).with("IBM").and_return(nil)
      expect(adapter.fetch_price("IBM")).to be_nil
    end
  end
end
