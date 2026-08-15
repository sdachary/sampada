module Api
  class HouseholdsController < Api::BaseController
    def index
      households = current_user.households
      render_success(households.map { |h| household_summary(h) })
    end

    def show
      household = find_household
      service = HouseholdDashboardService.new(household)
      render_success(service.overview)
    end

    def create
      household = Household.create!(name: params[:name], currency: params[:currency] || 'INR')
      household.add_member(current_user, role: 'owner')
      render_success(household_summary(household), status: :created)
    end

    def update
      household = find_household
      household.update!(params.permit(:name, :currency, :description))
      render_success(household_summary(household))
    end

    def destroy
      find_household.destroy!
      head :no_content
    end

    def members
      household = find_household
      render_success(household.household_memberships.accepted.map do |m|
        { id: m.user_id, name: [m.user.first_name, m.user.last_name].compact.join(' '),
          email: m.user.email, role: m.role, joined_at: m.joined_at }
      end)
    end

    def invite
      household = find_household
      user = User.find_by(email: params[:email])
      return render_error('User not found', status: :not_found) unless user

      household.add_member(user, role: params[:role] || 'member')
      render_success({}, message: "Invited #{user.email} to #{household.name}")
    end

    def leave
      membership = current_user.household_memberships.find_by(household_id: params[:id])
      return render_error('Not a member', status: :not_found) unless membership

      membership.destroy!
      render_success({}, message: 'Left household')
    end

    def dashboard
      household = find_household
      service = HouseholdDashboardService.new(household)
      render_success(service.overview)
    end

    private

    def find_household
      current_user.households.find(params[:id])
    end

    def household_summary(h)
      { id: h.id, name: h.name, currency: h.currency,
        description: h.description, member_count: h.members.count,
        created_at: h.created_at }
    end
  end
end
