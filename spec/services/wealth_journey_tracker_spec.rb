require 'rails_helper'

RSpec.describe WealthJourneyTracker, type: :service do
  let!(:user) { create(:user) }

  describe '#debt_progress' do
    it 'returns debt progress hash' do
      create(:debt, user: user, amount: 50_000, emi_amount: 1000)
      tracker = described_class.new(user)
      result = tracker.debt_progress
      expect(result).to have_key(:total_debt)
      expect(result).to have_key(:total_emi)
      expect(result).to have_key(:months_to_zero)
      expect(result).to have_key(:progress_percentage)
    end

    it 'calculates total debt correctly' do
      create(:debt, user: user, amount: 30_000)
      create(:debt, user: user, amount: 20_000)
      tracker = described_class.new(user)
      result = tracker.debt_progress
      expect(result[:total_debt]).to eq(50_000)
    end

    it 'calculates total emi correctly' do
      create(:debt, user: user, emi_amount: 500)
      create(:debt, user: user, emi_amount: 300)
      tracker = described_class.new(user)
      result = tracker.debt_progress
      expect(result[:total_emi]).to eq(800)
    end
  end

  describe '#sip_progress' do
    it 'returns sip progress hash' do
      tracker = described_class.new(user)
      result = tracker.sip_progress
      expect(result).to have_key(:goal)
      expect(result).to have_key(:current)
      expect(result).to have_key(:progress)
      expect(result).to have_key(:projected_income)
    end

    it 'has numeric progress values' do
      tracker = described_class.new(user)
      result = tracker.sip_progress
      expect(result[:goal]).to be_a(Numeric)
      expect(result[:current]).to be_a(Numeric)
      expect(result[:progress]).to be_a(Numeric)
    end
  end

  describe '#net_worth_trajectory' do
    it 'returns net worth trajectory hash' do
      tracker = described_class.new(user)
      result = tracker.net_worth_trajectory
      expect(result).to have_key(:net_worth)
      expect(result).to have_key(:assets)
      expect(result).to have_key(:liabilities)
      expect(result).to have_key(:trajectory)
    end

    it 'returns trajectory as array' do
      tracker = described_class.new(user)
      result = tracker.net_worth_trajectory
      expect(result[:trajectory]).to be_an(Array)
    end

    it 'calculates net worth based on debts' do
      create(:debt, user: user, amount: 100_000)
      tracker = described_class.new(user)
      result = tracker.net_worth_trajectory
      expect(result[:liabilities]).to eq(100_000)
    end
  end

  describe '#zero_day_milestone' do
    it 'returns milestone hash' do
      tracker = described_class.new(user)
      result = tracker.zero_day_milestone
      expect(result).to have_key(:reached)
      expect(result).to have_key(:estimated_date)
    end

    it 'has boolean reached value' do
      tracker = described_class.new(user)
      result = tracker.zero_day_milestone
      expect([true, false]).to include(result[:reached])
    end
  end

  describe 'initialization' do
    it 'accepts user parameter' do
      tracker = described_class.new(user)
      expect(tracker).to be_a(described_class)
    end
  end
end
