require 'rails_helper'

RSpec.describe ExchangeRate, type: :model do
  describe 'validations' do
    it { is_expected.to validate_presence_of(:from_currency) }
    it { is_expected.to validate_presence_of(:to_currency) }
    it { is_expected.to validate_presence_of(:rate) }
    it { is_expected.to validate_presence_of(:fetched_at) }
    it { is_expected.to validate_numericality_of(:rate).is_greater_than(0) }
  end

  describe '.rate' do
    let!(:rate_usd_inr) do
      create(:exchange_rate, from_currency: 'USD', to_currency: 'INR', rate: 83.5, fetched_at: 1.hour.ago)
    end

    it 'returns rate when same currency' do
      expect(described_class.rate(from: 'USD', to: 'USD')).to eq(1.0)
    end

    it 'returns cached rate if recent' do
      expect(described_class.rate(from: 'USD', to: 'INR')).to eq(83.5)
    end

    it 'inverts rate if needed' do
      expect(described_class.rate(from: 'INR', to: 'USD')).to be_within(0.001).of(1 / 83.5)
    end

    it 'returns nil when no rate available' do
      expect(described_class.rate(from: 'EUR', to: 'GBP')).to be_nil
    end
  end

  describe '.convert' do
    let!(:rate) do
      create(:exchange_rate, from_currency: 'USD', to_currency: 'INR', rate: 83.0, fetched_at: 1.hour.ago)
    end

    it 'converts amount using cached rate' do
      expect(described_class.convert(100, from: 'USD', to: 'INR')).to eq(8300.0)
    end

    it 'returns same amount for same currency' do
      expect(described_class.convert(100, from: 'USD', to: 'USD')).to eq(100)
    end

    it 'returns nil when no rate' do
      expect(described_class.convert(100, from: 'EUR', to: 'GBP')).to be_nil
    end
  end
end
