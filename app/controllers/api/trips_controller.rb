module Api
  class TripsController < Api::BaseController
    def index
      trips = current_user.trips.order(created_at: :desc)
      render_success(trips.map { |t| trip_json(t) })
    end

    def show
      trip = current_user.trips.find(params[:id])
      render_success(trip_json(trip).merge(
                       members: trip.trip_members.order(:name).map { |m| member_json(m) },
                       expenses: trip.trip_expenses.includes(:trip_member, :trip_category)
                                     .order(expense_date: :desc)
                                     .map { |e| expense_json(e) },
                       settlements: trip.trip_settlements.includes(:from_member, :to_member)
                                        .order(created_at: :desc)
                                        .map { |s| settlement_json(s) },
                       balances: trip.balances.transform_keys(&:to_s),
                       suggested_settlements: trip.suggested_settlements,
                       budget_vs_actual: trip.budget_vs_actual,
                       total_spent: trip.total_spent
                     ))
    end

    def create
      trip = current_user.trips.create!(trip_params)
      render_success(trip_json(trip), status: :created)
    end

    def update
      trip = current_user.trips.find(params[:id])
      trip.update!(trip_params)
      render_success(trip_json(trip))
    end

    def destroy
      current_user.trips.find(params[:id]).destroy!
      render_success({})
    end

    private

    def trip_params
      params.permit(:name, :destination, :start_date, :end_date, :currency, :group_type, :status, :total_budget, :notes)
    end

    def trip_json(t)
      { id: t.id, name: t.name, destination: t.destination, start_date: t.start_date, end_date: t.end_date,
        currency: t.currency, group_type: t.group_type, status: t.status, total_budget: t.total_budget&.to_f,
        notes: t.notes, created_at: t.created_at, updated_at: t.updated_at }
    end

    def member_json(m)
      { id: m.id, name: m.name, email: m.email, role: m.role }
    end

    def expense_json(e)
      { id: e.id, trip_member_id: e.trip_member_id, payer: e.trip_member.name,
        trip_category_id: e.trip_category_id, category_name: e.trip_category&.name,
        amount: e.amount.to_f, description: e.description, expense_date: e.expense_date,
        split_type: e.split_type, split_details: e.split_details }
    end

    def settlement_json(s)
      { id: s.id, from_trip_member_id: s.from_trip_member_id, from_name: s.from_member.name,
        to_trip_member_id: s.to_trip_member_id, to_name: s.to_member.name,
        amount: s.amount.to_f, settled_at: s.settled_at, notes: s.notes }
    end
  end
end
