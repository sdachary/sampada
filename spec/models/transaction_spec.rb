require 'rails_helper'

RSpec.describe Transaction, type: :model do
  describe 'validations' do
    it { is_expected.to validate_presence_of(:description) }
    it { is_expected.to validate_presence_of(:amount) }
    it { is_expected.to validate_presence_of(:transaction_date) }
    it { is_expected.to validate_numericality_of(:amount).is_other_than(0) }
  end

  describe 'associations' do
    it { is_expected.to belong_to(:user) }
    it { is_expected.to belong_to(:budget_category).optional }
    it { is_expected.to belong_to(:household).optional }
  end

  describe '.monthly_totals' do
    it 'returns monthly breakdowns' do
      user = create(:user)
      totals = described_class.monthly_totals(user.id, months: 3)
      expect(totals.length).to eq(3)
      expect(totals.first).to have_key(:month)
      expect(totals.first).to have_key(:expenses)
      expect(totals.first).to have_key(:income)
    end
  end

  describe '.detect_anomalies' do
    it 'returns empty when few transactions' do
      user = create(:user)
      expect(described_class.detect_anomalies(user.id)).to be_empty
    end
  end
end
