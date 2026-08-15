require 'rails_helper'

RSpec.describe BudgetCategory, type: :model do
  describe 'validations' do
    it { is_expected.to validate_presence_of(:name) }

    it 'validates uniqueness of name scoped to user_id' do
      user = create(:user)
      create(:budget_category, user: user, name: 'Food')
      new_category = build(:budget_category, user: user, name: 'Food')
      expect(new_category).not_to be_valid
      expect(new_category.errors[:name]).to include('has already been taken')
    end
  end

  describe 'associations' do
    it { is_expected.to belong_to(:user) }
    it { is_expected.to have_many(:transactions) }
    it { is_expected.to have_many(:budgets) }
  end

  describe '.seed_for' do
    it 'creates default categories for a user' do
      user = create(:user)
      expect { described_class.seed_for(user) }
        .to change { described_class.where(user: user).count }.by_at_least(10)
    end

    it 'is idempotent' do
      user = create(:user)
      described_class.seed_for(user)
      expect { described_class.seed_for(user) }
        .not_to(change { described_class.where(user: user).count })
    end
  end
end
