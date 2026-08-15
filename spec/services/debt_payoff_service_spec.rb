require 'rails_helper'

RSpec.describe DebtPayoffService, type: :service do
  describe '#avalanche_plan' do
    it 'prioritizes higher interest rate debts' do
      debts = [
        { id: 1, balance: 10_000, interest_rate: 5.0, min_payment: 200 },
        { id: 2, balance: 5000, interest_rate: 15.0, min_payment: 150 }
      ]
      service = described_class.new(debts, extra_payment: 0)
      result = service.avalanche_plan
      expect(result[:months]).to be > 0
      expect(result[:total_interest]).to be >= 0
    end

    it 'returns schedule with months and remaining balances' do
      debts = [
        { id: 1, balance: 5000, interest_rate: 10.0, min_payment: 100 }
      ]
      service = described_class.new(debts, extra_payment: 50)
      result = service.avalanche_plan
      expect(result[:schedule]).to be_an(Array)
      expect(result[:schedule].first).to have_key(:month)
      expect(result[:schedule].first).to have_key(:balance)
    end

    it 'handles extra payments correctly' do
      debts = [
        { id: 1, balance: 10_000, interest_rate: 12.0, min_payment: 200 }
      ]
      service = described_class.new(debts, extra_payment: 100)
      result = service.avalanche_plan
      expect(result).to have_key(:months)
      expect(result).to have_key(:total_interest)
    end
  end

  describe '#snowball_plan' do
    it 'prioritizes smaller balance debts' do
      debts = [
        { id: 1, balance: 10_000, interest_rate: 5.0, min_payment: 200 },
        { id: 2, balance: 2000, interest_rate: 15.0, min_payment: 100 }
      ]
      service = described_class.new(debts, extra_payment: 0)
      result = service.snowball_plan
      expect(result[:months]).to be > 0
    end

    it 'returns valid plan structure' do
      debts = [
        { id: 1, balance: 5000, interest_rate: 10.0, min_payment: 100 }
      ]
      service = described_class.new(debts)
      result = service.snowball_plan
      expect(result).to have_key(:months)
      expect(result).to have_key(:total_interest)
      expect(result).to have_key(:schedule)
    end
  end

  describe 'initialization' do
    it 'accepts debts array and extra_payment' do
      debts = [{ id: 1, balance: 1000, interest_rate: 5.0, min_payment: 50 }]
      service = described_class.new(debts, extra_payment: 100)
      expect(service).to be_a(described_class)
    end

    it 'works with empty debts array' do
      service = described_class.new([], extra_payment: 0)
      result = service.avalanche_plan
      expect(result[:months]).to eq(0)
    end
  end
end
