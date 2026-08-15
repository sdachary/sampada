require 'rails_helper'

RSpec.describe Budget, type: :model do
  describe 'validations' do
    it { is_expected.to validate_numericality_of(:monthly_limit).is_greater_than(0) }
  end

  describe 'associations' do
    it { is_expected.to belong_to(:user) }
    it { is_expected.to belong_to(:budget_category) }
    it { is_expected.to belong_to(:household).optional }
  end

  describe '#usage_percentage' do
    it 'returns 0 when no spending' do
      user = create(:user)
      cat = create(:budget_category, user: user)
      budget = create(:budget, user: user, budget_category: cat, monthly_limit: 1000)
      expect(budget.usage_percentage).to eq(0.0)
    end
  end
end
