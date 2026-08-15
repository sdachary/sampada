require 'rails_helper'

RSpec.describe Currency, type: :model do
  describe 'validations' do
    it { is_expected.to validate_presence_of(:code) }

    it 'validates uniqueness of code' do
      create(:currency)
      new_currency = build(:currency)
      expect(new_currency).not_to be_valid
      expect(new_currency.errors[:code]).to include('has already been taken')
    end

    it { is_expected.to validate_presence_of(:name) }
  end

  describe '.symbol_for' do
    it 'returns ₹ for INR' do
      expect(described_class.symbol_for('INR')).to eq('₹')
    end

    it 'returns $ for USD' do
      expect(described_class.symbol_for('USD')).to eq('$')
    end

    it 'returns fallback for unknown codes' do
      expect(described_class.symbol_for('XYZ')).to eq('XYZ')
    end

    it 'returns ₹ for nil' do
      expect(described_class.symbol_for(nil)).to eq('₹')
    end

    it 'returns ₹ for empty string' do
      expect(described_class.symbol_for('')).to eq('₹')
    end
  end
end
