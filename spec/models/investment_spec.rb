require 'rails_helper'

RSpec.describe Investment, type: :model do
  describe '#calculate_sip' do
    it 'returns projected value and total invested' do
      investment = build(:investment)
      result = investment.calculate_sip(1000, 12)
      expect(result[:total_invested]).to eq(12_000)
      expect(result[:projected_value]).to eq(12_249.89)
    end
  end

  describe '#project_income' do
    it 'calculates income based on yield' do
      investment = build(:investment, dividend_yield: 5.0)
      expect(investment.project_income(1000)).to eq(50.0)
    end
  end
end
