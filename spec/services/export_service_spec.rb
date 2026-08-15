require 'rails_helper'

RSpec.describe ExportService, type: :service do
  subject(:service) { described_class.new(user) }

  let(:user) { create(:user) }

  describe '#export_debts' do
    it 'generates CSV data' do
      create(:debt, user: user)
      csv = service.export_debts(format: 'csv')
      expect(csv).to include('name')
      expect(csv).to include('amount')
    end

    it 'generates JSON data' do
      create(:debt, user: user)
      json = service.export_debts(format: 'json')
      expect(json).to be_a(String)
      expect { JSON.parse(json) }.not_to raise_error
    end
  end

  describe '#export_transactions' do
    it 'generates CSV with headers' do
      create(:transaction, user: user)
      csv = service.export_transactions(format: 'csv')
      expect(csv).to include('date')
      expect(csv).to include('description')
    end
  end
end
