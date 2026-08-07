require 'rails_helper'

RSpec.describe TripExpense, type: :model do
  describe '#split_shares' do
    let(:trip) { create(:trip) }
    let!(:member1) { create(:trip_member, trip: trip) }
    let!(:member2) { create(:trip_member, trip: trip) }
    let!(:member3) { create(:trip_member, trip: trip) }

    it 'splits equally in cents, distributing remainder to first members' do
      expense = build(:trip_expense, trip: trip, trip_member: member1, amount: 100.00, split_type: 'equal')
      shares = expense.split_shares
      expect(shares.values.sum).to eq(10_000)
      expect(shares[member1.id]).to eq(3334)
      expect(shares[member2.id]).to eq(3333)
      expect(shares[member3.id]).to eq(3333)
    end

    it 'splits by percentage in cents' do
      expense = build(:trip_expense, trip: trip, trip_member: member1, amount: 200.00, split_type: 'percentage',
                                     split_details: { member1.id => 50, member2.id => 30, member3.id => 20 })
      shares = expense.split_shares
      expect(shares[member1.id]).to eq(10_000)
      expect(shares[member2.id]).to eq(6000)
      expect(shares[member3.id]).to eq(4000)
    end

    it 'handles custom amounts by converting to cents' do
      expense = build(:trip_expense, trip: trip, trip_member: member1, amount: 200.00, split_type: 'custom',
                                     split_details: { member1.id => 120.0, member2.id => 80.0 })
      shares = expense.split_shares
      expect(shares[member1.id]).to eq(12_000)
      expect(shares[member2.id]).to eq(8000)
    end

    it 'returns empty hash when there are no members' do
      trip = create(:trip)
      expense = build(:trip_expense, trip: trip, trip_member: member1, amount: 100.00)
      # trip_member factory requires a trip, so simulate empty members
      allow(trip).to receive(:trip_members).and_return([])
      expect(expense.split_shares).to eq({})
    end
  end

  describe '#amount_cents' do
    it 'converts decimal amount to integer cents' do
      expense = build(:trip_expense, amount: 123.45)
      expect(expense.amount_cents).to eq(12_345)
    end
  end
end
