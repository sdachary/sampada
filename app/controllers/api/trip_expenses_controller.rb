module Api
  class TripExpensesController < Api::BaseController
    before_action :find_trip

    def index
      render_success(@trip.trip_expenses.includes(:trip_member, :trip_category).order(expense_date: :desc).map do |e|
        expense_json(e)
      end)
    end

    def create
      expense = @trip.trip_expenses.create!(expense_params)
      render_success(expense_json(expense), status: :created)
    end

    def destroy
      @trip.trip_expenses.find(params[:id]).destroy!
      render_success({})
    end

    private

    def find_trip
      @trip = current_user.trips.find(params[:trip_id])
    end

    def expense_params
      params.permit(:trip_member_id, :trip_category_id, :amount, :description, :expense_date, :split_type,
                    split_details: {})
    end

    def expense_json(e)
      { id: e.id, trip_member_id: e.trip_member_id, payer: e.trip_member.name,
        trip_category_id: e.trip_category_id, category_name: e.trip_category&.name,
        amount: e.amount.to_f, description: e.description, expense_date: e.expense_date,
        split_type: e.split_type, split_details: e.split_details, created_at: e.created_at }
    end
  end
end
