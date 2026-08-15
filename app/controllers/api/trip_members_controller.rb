module Api
  class TripMembersController < Api::BaseController
    before_action :find_trip

    def index
      render_success(@trip.trip_members.order(:name).map { |m| member_json(m) })
    end

    def create
      member = @trip.trip_members.create!(member_params)
      render_success(member_json(member), status: :created)
    end

    def destroy
      @trip.trip_members.find(params[:id]).destroy!
      render_success({})
    end

    private

    def find_trip
      @trip = current_user.trips.find(params[:trip_id])
    end

    def member_params
      params.permit(:name, :email, :role)
    end

    def member_json(m)
      { id: m.id, name: m.name, email: m.email, role: m.role }
    end
  end
end
