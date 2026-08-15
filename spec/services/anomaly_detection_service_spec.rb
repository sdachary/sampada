require 'rails_helper'

RSpec.describe AnomalyDetectionService, type: :service do
  subject(:service) { described_class.new(user) }

  let(:user) { create(:user) }

  describe '#detect' do
    it 'returns array of anomalies' do
      result = service.detect
      expect(result).to be_an(Array)
    end
  end

  describe '#summary' do
    it 'returns anomaly summary with counts' do
      result = service.summary
      expect(result).to have_key(:total_anomalies)
      expect(result).to have_key(:critical)
      expect(result).to have_key(:warnings)
    end
  end
end
