require 'rails_helper'

RSpec.describe NetWorthSnapshot, type: :model do
  describe '#create_snapshot' do
    it 'creates a snapshot for a user' do
      user = create(:user, onboarded: true)
      snapshot = NetWorthSnapshot.create_snapshot(user)
      expect(snapshot).to be_persisted
      expect(snapshot.snapshot_date).to eq(Date.today)
    end

    it 'returns existing snapshot for the same day instead of duplicating' do
      user = create(:user, onboarded: true)
      first = NetWorthSnapshot.create_snapshot(user)
      second = NetWorthSnapshot.create_snapshot(user)
      expect(second).to eq(first)
      expect(NetWorthSnapshot.where(user: user).count).to eq(1)
    end
  end
end
