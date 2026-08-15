require 'rails_helper'

RSpec.describe Household, type: :model do
  describe 'validations' do
    it { is_expected.to validate_presence_of(:name) }
  end

  describe 'associations' do
    it { is_expected.to have_many(:household_memberships).dependent(:destroy) }
    it { is_expected.to have_many(:members).through(:household_memberships) }
    it { is_expected.to have_many(:debts) }
    it { is_expected.to have_many(:portfolios) }
  end

  describe '#add_member' do
    it 'adds a user to the household' do
      household = create(:household)
      user = create(:user)
      expect { household.add_member(user) }
        .to change { household.members.count }.by(1)
    end
  end

  describe '#member?' do
    it 'returns true for members' do
      household = create(:household)
      user = create(:user)
      household.add_member(user)
      expect(household.member?(user)).to be true
    end
  end
end
