require 'rails_helper'

RSpec.describe InsurancePolicy, type: :model do
  let(:user) { create(:user) }

  describe 'associations' do
    it { is_expected.to belong_to(:user) }
  end

  describe 'validations' do
    subject { build(:insurance_policy, user: user) }

    it { is_expected.to validate_inclusion_of(:policy_type).in_array(%w[health term_life vehicle other]) }
    it { is_expected.to validate_presence_of(:provider_name) }
    it { is_expected.to validate_inclusion_of(:premium_frequency).in_array(%w[monthly quarterly yearly]) }

    it 'rejects negative premium' do
      policy = build(:insurance_policy, user: user, premium_amount: -1)
      expect(policy).to be_invalid
    end

    it 'rejects non-positive coverage' do
      policy = build(:insurance_policy, user: user, coverage_amount: 0)
      expect(policy).to be_invalid
    end
  end

  describe 'scopes' do
    it 'active returns policies with no renewal or future renewal' do
      active = create(:insurance_policy, user: user, renewal_date: nil)
      upcoming = create(:insurance_policy, user: user, renewal_date: 2.weeks.from_now)
      expired = create(:insurance_policy, user: user, renewal_date: 1.month.ago)
      expect(InsurancePolicy.active).to contain_exactly(active, upcoming)
      expect(InsurancePolicy.renewing_soon).to contain_exactly(upcoming)
    end
  end
end
