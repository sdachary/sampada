module Api
  class TripSettlementsController < Api::BaseController
    before_action :find_trip

    def index
      render_success(@trip.trip_settlements.includes(:from_member, :to_member).order(created_at: :desc).map do |s|
        settlement_json(s)
      end)
    end

    def create
      settlement = @trip.trip_settlements.create!(settlement_params.merge(settled_at: Time.current))
      render_success(settlement_json(settlement), status: :created)
    end

    private

    def find_trip
      @trip = current_user.trips.find(params[:trip_id])
    end

    def settlement_params
      params.permit(:from_trip_member_id, :to_trip_member_id, :amount, :notes)
    end

    def settlement_json(s)
      { id: s.id, from_trip_member_id: s.from_trip_member_id, from_name: s.from_member.name,
        to_trip_member_id: s.to_trip_member_id, to_name: s.to_member.name,
        amount: s.amount.to_f, settled_at: s.settled_at, notes: s.notes, created_at: s.created_at }
    end
  end
end
