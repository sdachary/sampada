require 'rails_helper'

RSpec.describe DividendSip, type: :model do
  it { is_expected.to belong_to(:portfolio) }
  it { is_expected.to validate_presence_of(:amount) }

  describe 'validations' do
    it 'is valid with valid attributes' do
      portfolio = create(:portfolio)
      dividend_sip = build(:dividend_sip, portfolio: portfolio, amount: 5000)
      expect(dividend_sip).to be_valid
    end

    it 'is invalid without amount' do
      dividend_sip = build(:dividend_sip, amount: nil)
      expect(dividend_sip).not_to be_valid
      expect(dividend_sip.errors[:amount]).to include("can't be blank")
    end
  end

  describe 'associations' do
    it 'belongs to a portfolio' do
      portfolio = create(:portfolio)
      dividend_sip = create(:dividend_sip, portfolio: portfolio)
      expect(dividend_sip.portfolio).to eq(portfolio)
    end
  end

  describe 'attributes' do
    it 'has monthly_investment attribute' do
      dividend_sip = create(:dividend_sip, monthly_investment: 5000.0)
      expect(dividend_sip.monthly_investment).to eq(5000.0)
    end

    it 'has target_income attribute' do
      dividend_sip = create(:dividend_sip, target_income: 10_000.0)
      expect(dividend_sip.target_income).to eq(10_000.0)
    end

    it 'has dividend_yield attribute' do
      dividend_sip = create(:dividend_sip, dividend_yield: 3.5)
      expect(dividend_sip.dividend_yield).to eq(3.5)
    end
  end
end
