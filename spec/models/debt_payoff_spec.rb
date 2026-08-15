require 'rails_helper'

RSpec.describe DebtPayoff, type: :model do
  it { is_expected.to have_many(:debts) }
  it { is_expected.to validate_presence_of(:strategy) }

  describe 'validations' do
    it 'is valid with valid attributes' do
      debt_payoff = build(:debt_payoff, strategy: 'avalanche')
      expect(debt_payoff).to be_valid
    end

    it 'is invalid without strategy' do
      debt_payoff = build(:debt_payoff, strategy: nil)
      expect(debt_payoff).not_to be_valid
      expect(debt_payoff.errors[:strategy]).to include("can't be blank")
    end

    it 'accepts avalanche strategy' do
      debt_payoff = build(:debt_payoff, strategy: 'avalanche')
      expect(debt_payoff).to be_valid
    end

    it 'accepts snowball strategy' do
      debt_payoff = build(:debt_payoff, strategy: 'snowball')
      expect(debt_payoff).to be_valid
    end
  end

  describe 'associations' do
    it 'can have multiple debts' do
      debt_payoff = create(:debt_payoff)
      debt1 = create(:debt)
      debt2 = create(:debt)
      create(:debt_payoff_debt, debt_payoff: debt_payoff, debt: debt1)
      create(:debt_payoff_debt, debt_payoff: debt_payoff, debt: debt2)
      expect(debt_payoff.debts).to include(debt1, debt2)
    end
  end
end
