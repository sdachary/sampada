# frozen_string_literal: true

require 'rails_helper'

RSpec.describe GoalForecastService, type: :service do
  let(:user) { create(:user) }

  describe '#projection' do
    subject(:service) { described_class.new(goal) }

    context 'with a moderate allocation goal' do
      let(:goal) do
        create(:goal, user: user, monthly_sip: 25_000, target_amount: 5_000_000, target_year: Date.current.year + 5, allocation: 'moderate', equity_growth: 12, debt_growth: 7, gold_growth: 8)
      end

      it 'returns a projection with yearly points' do
        result = service.projection
        expect(result).to have_key(:projection)
        expect(result).to have_key(:final_corpus)
        expect(result).to have_key(:months)
        expect(result[:projection]).to be_an(Array)
        expect(result[:projection].first).to have_key(:year)
        expect(result[:projection].first).to have_key(:projected_corpus)
        expect(result[:projection].first).to have_key(:goal_target)
      end

      it 'returns positive final corpus' do
        result = service.projection
        expect(result[:final_corpus]).to be > 0
      end

      it 'has correct number of months' do
        result = service.projection
        expect(result[:months]).to eq(60)
      end
    end

    context 'with top-up' do
      let(:goal) do
        create(:goal, user: user, monthly_sip: 25_000, top_up_amount: 10_000, top_up_frequency: 'quarterly', target_amount: 5_000_000, target_year: Date.current.year + 5, allocation: 'moderate')
      end

      it 'includes top-up in projection' do
        goal_with_topup = service.projection
        goal_without_topup = create(:goal, user: user, monthly_sip: 25_000, top_up_amount: 0, target_amount: 5_000_000, target_year: Date.current.year + 5, allocation: 'moderate')
        goal_no_topup = described_class.new(goal_without_topup).projection
        expect(goal_with_topup[:final_corpus]).to be > goal_no_topup[:final_corpus]
      end
    end

    context 'with zero months remaining' do
      let(:goal) do
        create(:goal, user: user, target_year: Date.current.year, monthly_sip: 0)
      end

      it 'returns empty projection' do
        result = service.projection
        expect(result[:months]).to eq(0)
      end
    end
  end

  describe '#risk_comparison' do
    subject(:service) { described_class.new(goal) }

    let(:goal) do
      create(:goal, user: user, monthly_sip: 25_000, target_amount: 5_000_000, target_year: Date.current.year + 5, allocation: 'moderate', equity_growth: 12, debt_growth: 7, gold_growth: 8)
    end

    it 'returns comparison for all three allocations' do
      result = service.risk_comparison
      expect(result).to have_key('conservative')
      expect(result).to have_key('moderate')
      expect(result).to have_key('aggressive')
    end

    it 'aggressive has higher final corpus than conservative' do
      result = service.risk_comparison
      expect(result['aggressive'][:final_corpus]).to be > result['conservative'][:final_corpus]
    end

    it 'includes blended_cagr for each allocation' do
      result = service.risk_comparison
      result.each_value do |v|
        expect(v).to have_key(:blended_cagr)
        expect(v[:blended_cagr]).to be > 0
      end
    end
  end
end
