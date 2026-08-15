require 'rails_helper'

RSpec.describe RecurringExpenseService, type: :service do
  describe '#generate_events' do
    it 'generates daily events correctly' do
      expenses = [
        { id: 1, name: 'Daily Coffee', amount: 5.0, frequency: 'daily', start_date: '2026-05-01' }
      ]
      service = described_class.new(expenses)
      events = service.generate_events('2026-05-01', '2026-05-03')
      expect(events.length).to eq(3)
      expect(events.first[:frequency]).to eq('daily')
    end

    it 'generates weekly events correctly' do
      expenses = [
        { id: 2, name: 'Weekly Class', amount: 50.0, frequency: 'weekly', start_date: '2026-05-04' }
      ]
      service = described_class.new(expenses)
      events = service.generate_events('2026-05-01', '2026-05-31')
      expect(events).to be_an(Array)
      events.each do |event|
        expect(event[:frequency]).to eq('weekly')
        expect(event[:title]).to eq('Weekly Class')
      end
    end

    it 'generates monthly events correctly' do
      expenses = [
        { id: 3, name: 'Rent', amount: 2000.0, frequency: 'monthly', start_date: '2026-05-01' }
      ]
      service = described_class.new(expenses)
      events = service.generate_events('2026-05-01', '2026-07-31')
      expect(events.length).to be >= 3
    end

    it 'generates yearly events correctly' do
      expenses = [
        { id: 4, name: 'Insurance', amount: 1200.0, frequency: 'yearly', start_date: '2026-01-01' }
      ]
      service = described_class.new(expenses)
      events = service.generate_events('2026-01-01', '2027-12-31')
      yearly_events = events.select { |e| e[:title] == 'Insurance' }
      expect(yearly_events.length).to eq(2)
    end

    it 'respects end_date' do
      expenses = [
        { id: 5, name: 'Gym', amount: 30.0, frequency: 'monthly', start_date: '2026-01-01' }
      ]
      service = described_class.new(expenses)
      events = service.generate_events('2026-01-01', '2026-03-31')
      events.each do |event|
        expect(event[:date]).to be <= Date.parse('2026-03-31')
      end
    end

    it 'returns events sorted by date' do
      expenses = [
        { id: 6, name: 'Expense1', amount: 100.0, frequency: 'monthly', start_date: '2026-05-15' },
        { id: 7, name: 'Expense2', amount: 200.0, frequency: 'monthly', start_date: '2026-05-01' }
      ]
      service = described_class.new(expenses)
      events = service.generate_events('2026-05-01', '2026-06-30')
      dates = events.pluck(:date)
      expect(dates).to eq(dates.sort)
    end
  end

  describe 'event attributes' do
    it 'includes all required fields' do
      expenses = [
        { id: 1, name: 'Test', amount: 100.0, frequency: 'monthly', start_date: '2026-05-01' }
      ]
      service = described_class.new(expenses)
      events = service.generate_events('2026-05-01', '2026-05-31')
      expect(events.first).to have_key(:id)
      expect(events.first).to have_key(:title)
      expect(events.first).to have_key(:date)
      expect(events.first).to have_key(:amount)
      expect(events.first).to have_key(:frequency)
    end
  end

  describe 'initialization' do
    it 'accepts expenses array' do
      expenses = [{ id: 1, name: 'Test', amount: 100.0, frequency: 'monthly' }]
      service = described_class.new(expenses)
      expect(service).to be_a(described_class)
    end

    it 'handles empty expenses array' do
      service = described_class.new([])
      events = service.generate_events('2026-05-01', '2026-05-31')
      expect(events).to eq([])
    end
  end
end
