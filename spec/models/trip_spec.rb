require 'rails_helper'

RSpec.describe Trip, type: :model do
  describe '#balances' do
    it 'computes balances in cents: payer credited, others debited' do
      trip = create(:trip)
      alice = create(:trip_member, trip: trip, name: 'Alice')
      bob = create(:trip_member, trip: trip, name: 'Bob')
      create(:trip_expense, trip: trip, trip_member: alice, amount: 1000.00, split_type: 'equal')

      balances = trip.balances
      expect(balances[alice.id]).to eq(50_000)   # paid 1000, owes 500
      expect(balances[bob.id]).to eq(-50_000)    # owes 500
    end

    it 'includes settlements (from_member gains, to_member loses)' do
      trip = create(:trip)
      alice = create(:trip_member, trip: trip, name: 'Alice')
      bob = create(:trip_member, trip: trip, name: 'Bob')
      create(:trip_expense, trip: trip, trip_member: alice, amount: 1000.00, split_type: 'equal')
      create(:trip_settlement, trip: trip, from_member: bob, to_member: alice, amount: 200.00)

      balances = trip.balances
      expect(balances[alice.id]).to eq(30_000)
      expect(balances[bob.id]).to eq(-30_000)
    end

    it 'returns zero balance for a trip with no expenses' do
      trip = create(:trip)
      alice = create(:trip_member, trip: trip, name: 'Alice')
      expect(trip.balances[alice.id]).to eq(0)
    end
  end

  describe '#suggested_settlements' do
    it 'returns the minimal set of transfers to zero everyone out' do
      trip = create(:trip)
      alice = create(:trip_member, trip: trip, name: 'Alice')
      bob = create(:trip_member, trip: trip, name: 'Bob')
      carol = create(:trip_member, trip: trip, name: 'Carol')
      # Alice paid 1500 for three people => she's owed 1000 total
      create(:trip_expense, trip: trip, trip_member: alice, amount: 1500.00, split_type: 'equal')

      settlements = trip.suggested_settlements
      expect(settlements).not_to be_empty
      expect(settlements.map { |s| s[:amount_cents] }.sum).to eq(100_000)
      expect(settlements.all? { |s| s[:to] == alice.id }).to be true
    end

    it 'returns empty array when everything is settled' do
      trip = create(:trip)
      create(:trip_member, trip: trip, name: 'Alice')
      expect(trip.suggested_settlements).to eq([])
    end

    it 'returns integer cent amounts' do
      trip = create(:trip)
      alice = create(:trip_member, trip: trip, name: 'Alice')
      bob = create(:trip_member, trip: trip, name: 'Bob')
      create(:trip_expense, trip: trip, trip_member: alice, amount: 1000.00, split_type: 'equal')
      expect(trip.suggested_settlements.first[:amount_cents]).to eq(50_000)
    end
  end

  describe '#total_spent' do
    it 'sums all expenses' do
      trip = create(:trip)
      alice = create(:trip_member, trip: trip, name: 'Alice')
      create(:trip_expense, trip: trip, trip_member: alice, amount: 100.00)
      create(:trip_expense, trip: trip, trip_member: alice, amount: 50.00)
      expect(trip.total_spent).to eq(150.0)
    end
  end

  describe 'destroy with expenses and settlements' do
    it 'destroys without NotNullViolation (members, expenses, settlements cascade)' do
      trip = create(:trip)
      alice = create(:trip_member, trip: trip, name: 'Alice')
      bob = create(:trip_member, trip: trip, name: 'Bob')
      create(:trip_expense, trip: trip, trip_member: alice, amount: 1000.00, split_type: 'equal')
      create(:trip_settlement, trip: trip, from_member: bob, to_member: alice, amount: 200.00)

      expect { trip.destroy }.not_to raise_error
      expect(Trip.where(id: trip.id)).to be_empty
      expect(TripMember.where(trip_id: trip.id)).to be_empty
      expect(TripExpense.where(trip_id: trip.id)).to be_empty
      expect(TripSettlement.where(trip_id: trip.id)).to be_empty
    end
  end
end
