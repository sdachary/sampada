module Api
  class HouseholdsController < Api::BaseController
    before_action :find_household, only: %i[show update destroy members invite accept_invite decline_invite leave dashboard]
    before_action :load_membership, only: %i[update destroy invite]

    def index
      households = current_user.households
      render_success(households.map { |h| household_summary(h) })
    end

    def show
      service = HouseholdDashboardService.new(@household)
      render_success(service.overview)
    end

    def create
      household = Household.create!(name: params[:name], currency: params[:currency] || 'INR')
      household.add_member(current_user, role: 'owner', invite_status: 'accepted')
      render_success(household_summary(household), status: :created)
    end

    def update
      authorize_owner_or_admin!
      @household.update!(params.permit(:name, :currency, :description))
      render_success(household_summary(@household))
    end

    def destroy
      authorize_owner!
      @household.destroy!
      head :no_content
    end

    def members
      render_success(@household.household_memberships.accepted.map do |m|
        { id: m.user_id, name: [m.user.first_name, m.user.last_name].compact.join(' '),
          email: m.user.email, role: m.role, joined_at: m.joined_at }
      end)
    end

    def invite
      authorize_owner_or_admin!
      user = User.find_by(email: params[:email])
      return render_error('User not found', status: :not_found) unless user

      role = params[:role] || 'member'
      unless %w[admin member viewer].include?(role)
        return render_error('Invalid role', status: :unprocessable_entity)
      end

      membership = @household.add_member(user, role: role, invite_status: 'pending')
      Notification.create!(user: user, notification_type: 'household_invite', message: "You've been invited to join #{@household.name} as #{role.humanize}")
      render_success({ membership_id: membership.id }, message: "Invitation sent to #{user.email}")
    end

    def accept_invite
      membership = current_user.household_memberships.pending.find_by(household_id: params[:id])
      return render_error('No pending invitation found', status: :not_found) unless membership

      membership.update!(invite_status: 'accepted')
      render_success({}, message: "Joined #{@household.name}")
    end

    def decline_invite
      membership = current_user.household_memberships.pending.find_by(household_id: params[:id])
      return render_error('No pending invitation found', status: :not_found) unless membership

      membership.destroy!
      render_success({}, message: 'Invitation declined')
    end

    def pending_invites
      memberships = current_user.household_memberships.pending.includes(:household)
      render_success(memberships.map { |m| { id: m.id, household: household_summary(m.household), role: m.role, invited_at: m.created_at } })
    end

    def leave
      membership = current_user.household_memberships.find_by(household_id: params[:id])
      return render_error('Not a member', status: :not_found) unless membership

      membership.destroy!
      render_success({}, message: 'Left household')
    end

    def dashboard
      service = HouseholdDashboardService.new(@household)
      render_success(service.overview)
    end

    private

    def find_household
      @household = current_user.households.find(params[:id])
    end

    def load_membership
      @membership = current_user.household_memberships.find_by!(household_id: @household.id)
    end

    def authorize_owner_or_admin!
      return if %w[owner admin].include?(@membership.role)

      render_error('Forbidden: owner or admin role required', status: :forbidden)
    end

    def authorize_owner!
      return if @membership.role == 'owner'

      render_error('Forbidden: owner role required', status: :forbidden)
    end

    def household_summary(h)
      { id: h.id, name: h.name, currency: h.currency,
        description: h.description, member_count: h.members.count,
        created_at: h.created_at }
    end
  end
end
