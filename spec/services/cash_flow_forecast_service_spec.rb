require 'rails_helper'

RSpec.describe CashFlowForecastService, type: :service do
  subject(:service) { described_class.new(user) }

  let(:user) { create(:user) }

  describe '#forecast' do
    it 'returns monthly projections' do
      result = service.forecast(months: 3)
      expect(result.length).to eq(3)
      expect(result.first).to have_key(:projected_income)
      expect(result.first).to have_key(:projected_expenses)
      expect(result.first).to have_key(:net_cash_flow)
    end
  end

  describe '#summary' do
    it 'returns financial health summary' do
      result = service.summary
      expect(result).to have_key(:health)
      expect(result).to have_key(:net_monthly)
      expect(result).to have_key(:base_currency)
    end
  end
end
