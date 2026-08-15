require 'rails_helper'

RSpec.describe 'Trips API', type: :request do
  let!(:user) { create(:user) }

  before do
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
  end

  describe 'GET /api/v1/trips/:id' do
    it 'includes suggested_settlements and balances in cents' do
      trip = create(:trip, user: user)
      alice = create(:trip_member, trip: trip, name: 'Alice')
      create(:trip_member, trip: trip, name: 'Bob')
      create(:trip_expense, trip: trip, trip_member: alice, amount: 1000.00, split_type: 'equal')

      get "/api/v1/trips/#{trip.id}"
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['balances'].values.map(&:to_i).sum).to eq(0)
      expect(json['suggested_settlements'].first['amount_cents']).to eq(50_000)
    end
  end

  describe 'POST /api/v1/trips/:id/trip_expenses' do
    it 'creates an expense' do
      trip = create(:trip, user: user)
      member = create(:trip_member, trip: trip)
      category = create(:trip_category, trip: trip)
      expect do
        post "/api/v1/trips/#{trip.id}/trip_expenses", params: {
          trip_member_id: member.id, trip_category_id: category.id,
          amount: 500.00, description: 'Dinner', expense_date: Time.zone.today, split_type: 'equal'
        }
      end.to change(TripExpense, :count).by(1)
      expect(response).to have_http_status(:created)
    end
  end
end
