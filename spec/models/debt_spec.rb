require 'rails_helper'

RSpec.describe Debt, type: :model do
  describe '#active?' do
    it 'is true when status is active' do
      debt = build(:debt, status: 'active')
      expect(debt.active?).to be(true)
    end

    it 'is false when status is not active' do
      debt = build(:debt, status: 'paid_off')
      expect(debt.active?).to be(false)
    end
  end

  describe '#months_remaining' do
    it 'calculates correct months remaining' do
      debt = build(:debt, amount: 10_000, emi_amount: 500, interest_rate: 10)
      expect(debt.months_remaining).to eq(20)
    end

    it 'returns 0 if interest_rate or emi_amount is 0' do
      debt = build(:debt, emi_amount: 0)
      expect(debt.months_remaining).to eq(0)
    end
  end

  describe '#debt_free_date' do
    it 'calculates a future date' do
      debt = build(:debt, amount: 1000, emi_amount: 100, interest_rate: 10)
      expect(debt.debt_free_date).to be > Time.zone.today
    end
  end
end
