require 'rails_helper'

RSpec.describe AnnualReportService, type: :service do
  subject(:service) { described_class.new(user, year: 2025) }

  let(:user) { create(:user) }

  describe '#generate' do
    it 'returns comprehensive report' do
      report = service.generate
      expect(report).to have_key(:year)
      expect(report).to have_key(:summary)
      expect(report).to have_key(:monthly_breakdown)
      expect(report).to have_key(:categories)
      expect(report).to have_key(:net_worth_trajectory)
    end

    it 'includes monthly data for all 12 months' do
      report = service.generate
      expect(report[:monthly_breakdown].length).to eq(12)
    end
  end
end
