require 'rails_helper'

RSpec.describe Portfolio, type: :model do
  it { is_expected.to have_many(:dividend_sips) }
  it { is_expected.to belong_to(:user) }

  describe 'associations' do
    it 'can have multiple dividend sips' do
      portfolio = create(:portfolio)
      create(:dividend_sip, portfolio: portfolio)
      create(:dividend_sip, portfolio: portfolio)
      expect(portfolio.dividend_sips.count).to eq(2)
    end
  end

  describe 'attributes' do
    it 'has name attribute' do
      portfolio = create(:portfolio, name: 'Equity Portfolio')
      expect(portfolio.name).to eq('Equity Portfolio')
    end

    it 'has risk_tolerance attribute' do
      portfolio = create(:portfolio, risk_tolerance: 0.7)
      expect(portfolio.risk_tolerance).to eq(0.7)
    end

    it 'has target_allocation as JSON' do
      allocation = { 'stocks' => 60, 'bonds' => 40 }
      portfolio = create(:portfolio, target_allocation: allocation)
      expect(portfolio.target_allocation).to eq(allocation)
    end

    it 'has current_allocation as JSON' do
      allocation = { 'stocks' => 55, 'bonds' => 45 }
      portfolio = create(:portfolio, current_allocation: allocation)
      expect(portfolio.current_allocation).to eq(allocation)
    end
  end
end
