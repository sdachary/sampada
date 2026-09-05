require 'rails_helper'

RSpec.describe 'Households API', type: :request do
  let!(:user) { create(:user) }
  let!(:other_user) { create(:user) }

  before do
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
  end

  def create_membership(household, user, role)
    create(:household_membership, household: household, user: user, role: role)
  end

  describe 'GET /api/v1/households' do
    it 'returns empty array when no households' do
      get '/api/v1/households'
      expect(response).to have_http_status(:success)
      expect(response.parsed_body).to eq([])
    end

    it 'returns all households' do
      household = create(:household, name: 'Family')
      create_membership(household, user, 'owner')
      get '/api/v1/households'
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json.length).to eq(1)
    end

    it 'returns household for viewer role' do
      household = create(:household, name: 'Viewer Family')
      create_membership(household, user, 'viewer')
      get '/api/v1/households'
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json.length).to eq(1)
    end
  end

  describe 'GET /api/v1/households/:id' do
    it 'returns household by id for owner' do
      household = create(:household, name: 'Test Family')
      create_membership(household, user, 'owner')
      get "/api/v1/households/#{household.id}"
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['name']).to eq('Test Family')
    end

    it 'returns household by id for viewer' do
      household = create(:household, name: 'Viewer Family')
      create_membership(household, user, 'viewer')
      get "/api/v1/households/#{household.id}"
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['name']).to eq('Viewer Family')
    end

    it 'returns 404 for non-member' do
      household = create(:household, name: 'Other Family')
      create_membership(household, other_user, 'owner')
      get "/api/v1/households/#{household.id}"
      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'POST /api/v1/households' do
    it 'creates household with valid params' do
      params = { name: 'New Family', currency: 'INR' }
      post '/api/v1/households', params: params
      expect(response).to have_http_status(:created)
      json = response.parsed_body
      expect(json['name']).to eq('New Family')
    end

    it 'returns errors with invalid params' do
      params = { name: '' }
      post '/api/v1/households', params: params
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe 'PUT /api/v1/households/:id' do
    it 'allows owner to update household' do
      household = create(:household, name: 'Old Name')
      create_membership(household, user, 'owner')
      params = { name: 'Updated Name' }
      put "/api/v1/households/#{household.id}", params: params
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['name']).to eq('Updated Name')
    end

    it 'allows admin to update household' do
      household = create(:household, name: 'Old Name')
      create_membership(household, user, 'admin')
      params = { name: 'Updated Name' }
      put "/api/v1/households/#{household.id}", params: params
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['name']).to eq('Updated Name')
    end

    it 'forbids member from updating household' do
      household = create(:household, name: 'Old Name')
      create_membership(household, user, 'member')
      params = { name: 'Updated Name' }
      put "/api/v1/households/#{household.id}", params: params
      expect(response).to have_http_status(:forbidden)
    end

    it 'forbids viewer from updating household' do
      household = create(:household, name: 'Old Name')
      create_membership(household, user, 'viewer')
      params = { name: 'Updated Name' }
      put "/api/v1/households/#{household.id}", params: params
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe 'DELETE /api/v1/households/:id' do
    it 'allows owner to delete household' do
      household = create(:household)
      create_membership(household, user, 'owner')
      expect { delete "/api/v1/households/#{household.id}" }.to change(Household, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end

    it 'forbids admin from deleting household' do
      household = create(:household)
      create_membership(household, user, 'admin')
      expect { delete "/api/v1/households/#{household.id}" }.not_to change(Household, :count)
      expect(response).to have_http_status(:forbidden)
    end

    it 'forbids member from deleting household' do
      household = create(:household)
      create_membership(household, user, 'member')
      expect { delete "/api/v1/households/#{household.id}" }.not_to change(Household, :count)
      expect(response).to have_http_status(:forbidden)
    end

    it 'forbids viewer from deleting household' do
      household = create(:household)
      create_membership(household, user, 'viewer')
      expect { delete "/api/v1/households/#{household.id}" }.not_to change(Household, :count)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe 'POST /api/v1/households/:id/invite' do
    let(:household) { create(:household, name: 'Test Family') }
    let(:invitee) { create(:user, email: 'invitee@example.com') }

    before do
      allow(User).to receive(:find_by).and_return(invitee)
    end

    it 'creates a pending membership invitation' do
      create_membership(household, user, 'owner')
      expect {
        post "/api/v1/households/#{household.id}/invite", params: { email: 'invitee@example.com', role: 'member' }
      }.to change(HouseholdMembership, :count).by(1)
      expect(response).to have_http_status(:success)
      membership = HouseholdMembership.last
      expect(membership.invite_status).to eq('pending')
      expect(membership.role).to eq('member')
    end

    it 'creates a notification for the invitee' do
      create_membership(household, user, 'owner')
      expect {
        post "/api/v1/households/#{household.id}/invite", params: { email: 'invitee@example.com', role: 'member' }
      }.to change(Notification, :count).by(1)
      notification = Notification.last
      expect(notification.user).to eq(invitee)
      expect(notification.notification_type).to eq('household_invite')
      expect(notification.message).to include(household.name)
    end

    it 'allows owner to invite as admin' do
      create_membership(household, user, 'owner')
      post "/api/v1/households/#{household.id}/invite", params: { email: 'invitee@example.com', role: 'admin' }
      expect(response).to have_http_status(:success)
    end

    it 'allows owner to invite as member' do
      create_membership(household, user, 'owner')
      post "/api/v1/households/#{household.id}/invite", params: { email: 'invitee@example.com', role: 'member' }
      expect(response).to have_http_status(:success)
    end

    it 'allows owner to invite as viewer' do
      create_membership(household, user, 'owner')
      post "/api/v1/households/#{household.id}/invite", params: { email: 'invitee@example.com', role: 'viewer' }
      expect(response).to have_http_status(:success)
    end

    it 'rejects owner inviting as owner' do
      create_membership(household, user, 'owner')
      post "/api/v1/households/#{household.id}/invite", params: { email: 'invitee@example.com', role: 'owner' }
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'allows admin to invite' do
      create_membership(household, user, 'admin')
      post "/api/v1/households/#{household.id}/invite", params: { email: 'invitee@example.com', role: 'member' }
      expect(response).to have_http_status(:success)
    end

    it 'forbids member from inviting' do
      create_membership(household, user, 'member')
      post "/api/v1/households/#{household.id}/invite", params: { email: 'invitee@example.com', role: 'member' }
      expect(response).to have_http_status(:forbidden)
    end

    it 'forbids viewer from inviting' do
      create_membership(household, user, 'viewer')
      post "/api/v1/households/#{household.id}/invite", params: { email: 'invitee@example.com', role: 'member' }
      expect(response).to have_http_status(:forbidden)
    end

    it 'rejects invalid role' do
      create_membership(household, user, 'owner')
      post "/api/v1/households/#{household.id}/invite", params: { email: 'invitee@example.com', role: 'invalid' }
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'returns 404 for non-existent user' do
      create_membership(household, user, 'owner')
      allow(User).to receive(:find_by).and_return(nil)
      post "/api/v1/households/#{household.id}/invite", params: { email: 'nonexistent@example.com', role: 'member' }
      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'POST /api/v1/households/:id/accept_invite' do
    it 'accepts a pending invitation' do
      household = create(:household, name: 'Invited Family')
      membership = create(:household_membership, household: household, user: user, role: 'member', invite_status: 'pending')

      post "/api/v1/households/#{household.id}/accept_invite"
      expect(response).to have_http_status(:success)
      expect(membership.reload.invite_status).to eq('accepted')
    end

    it 'returns 404 for accepted membership (not pending)' do
      household = create(:household, name: 'Existing Family')
      create(:household_membership, household: household, user: user, role: 'member', invite_status: 'accepted')

      post "/api/v1/households/#{household.id}/accept_invite"
      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'POST /api/v1/households/:id/decline_invite' do
    it 'declines a pending invitation and removes the membership' do
      household = create(:household, name: 'Invited Family')
      create(:household_membership, household: household, user: user, role: 'member', invite_status: 'pending')

      expect {
        post "/api/v1/households/#{household.id}/decline_invite"
      }.to change(HouseholdMembership, :count).by(-1)
      expect(response).to have_http_status(:success)
    end

    it 'returns 404 for no pending invitation' do
      household = create(:household, name: 'Existing Family')
      create(:household_membership, household: household, user: user, role: 'member', invite_status: 'accepted')

      post "/api/v1/households/#{household.id}/decline_invite"
      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'GET /api/v1/households/:id/pending_invites' do
    it 'lists pending invitations for the user' do
      household1 = create(:household, name: 'Invited Family 1')
      household2 = create(:household, name: 'Invited Family 2')
      create(:household_membership, household: household1, user: user, role: 'member', invite_status: 'pending')
      create(:household_membership, household: household2, user: user, role: 'viewer', invite_status: 'pending')

      get '/api/v1/households/pending_invites'
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json.length).to eq(2)
      expect(json.map { |inv| inv['household']['name'] }).to include('Invited Family 1', 'Invited Family 2')
    end

    it 'returns empty array when no pending invites' do
      get '/api/v1/households/pending_invites'
      expect(response).to have_http_status(:success)
      expect(response.parsed_body).to eq([])
    end
  end

  describe 'GET /api/v1/households/:id/members' do
    it 'returns members for any role' do
      household = create(:household)
      create_membership(household, user, 'viewer')
      create_membership(household, other_user, 'member')
      get "/api/v1/households/#{household.id}/members"
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json.length).to eq(2)
    end
  end

  describe 'GET /api/v1/households/:id/dashboard' do
    it 'allows any role to view dashboard' do
      household = create(:household)
      create_membership(household, user, 'viewer')
      get "/api/v1/households/#{household.id}/dashboard"
      expect(response).to have_http_status(:success)
    end
  end
end
