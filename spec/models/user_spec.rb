require 'rails_helper'

RSpec.describe User, type: :model do
  describe 'validations' do
    it 'is valid with valid attributes' do
      user = build(:user)
      expect(user).to be_valid
    end

    it 'requires an email' do
      user = build(:user, email: nil)
      expect(user).not_to be_valid
    end

    it 'requires a unique email' do
      create(:user, email: 'test@example.com')
      user = build(:user, email: 'test@example.com')
      expect(user).not_to be_valid
    end
  end

  describe '#active?' do
    it 'is true when onboarded' do
      user = build(:user, onboarded: true)
      expect(user.active?).to be(true)
    end

    it 'is false when not onboarded' do
      user = build(:user, onboarded: false)
      expect(user.active?).to be(false)
    end
  end

  describe 'associations' do
    it { is_expected.to have_many(:conversations).dependent(:destroy) }
    it { is_expected.to have_many(:debts).dependent(:destroy) }
    it { is_expected.to have_many(:portfolios).dependent(:destroy) }
    it { is_expected.to have_many(:journeys).dependent(:destroy) }
    it { is_expected.to have_many(:grievances).dependent(:destroy) }
  end

  describe 'scopes' do
    it '.active returns onboarded users' do
      active_user = create(:user, onboarded: true)
      inactive_user = create(:user, onboarded: false, email: 'inactive@example.com')
      expect(User.active).to include(active_user)
      expect(User.active).not_to include(inactive_user)
    end
  end
end
