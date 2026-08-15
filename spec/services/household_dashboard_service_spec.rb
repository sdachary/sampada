require 'rails_helper'

RSpec.describe HouseholdDashboardService, type: :service do
  subject(:service) { described_class.new(household) }

  let(:household) { create(:household) }
  let(:owner) { create(:user) }

  before do
    household.add_member(owner, role: 'owner')
  end

  describe '#overview' do
    it 'returns household financial overview' do
      result = service.overview
      expect(result).to have_key(:name)
      expect(result).to have_key(:member_count)
      expect(result).to have_key(:net_worth)
      expect(result).to have_key(:members)
    end
  end

  describe '#member_finances' do
    it 'returns member financial summary' do
      result = service.member_finances(owner)
      expect(result).to have_key(:debts)
      expect(result).to have_key(:portfolios)
    end
  end
end
