# frozen_string_literal: true

require 'rails_helper'

# Ensures the three domain services are pure and Sidekiq-callable: they take
# explicit arguments and return plain data (Hash/Array), and can be exercised
# without a Rails request cycle. No behavior changes are asserted here beyond
# the contract.

RSpec.describe 'Pure domain service contract', type: :service do
  describe DebtPayoffService do
    it 'accepts plain hashes and returns a plain hash (Sidekiq-callable)' do
      debts = [{ id: 1, balance: 5000, interest_rate: 10.0, min_payment: 100 }]
      result = described_class.new(debts, extra_payment: 50).avalanche_plan
      expect(result).to be_a(Hash)
      expect(result).to include(:months, :total_interest, :schedule)
      expect(result[:schedule]).to be_an(Array)
    end
  end

  describe CashFlowForecastService do
    it 'accepts a user and returns plain hashes' do
      user = create(:user)
      service = described_class.new(user)
      expect(service.summary).to be_a(Hash)
      expect(service.forecast(months: 3)).to be_an(Array)
      expect(service.forecast(months: 3).first).to be_a(Hash)
    end
  end

  describe AnomalyDetectionService do
    it 'accepts a user and returns a plain summary hash' do
      user = create(:user)
      service = described_class.new(user)
      summary = service.summary
      expect(summary).to be_a(Hash)
      expect(summary).to include(:total_anomalies, :anomalies)
      expect(summary[:anomalies]).to be_an(Array)
    end
  end
end
