require 'rails_helper'

RSpec.describe 'Households API', type: :request do
  let!(:user) { create(:user) }

  before do
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
  end

  describe 'GET /api/v1/households' do
    it 'returns empty array when no households' do
      get '/api/v1/households'
      expect(response).to have_http_status(:success)
      expect(response.parsed_body).to eq([])
    end

    it 'returns all households' do
      household = create(:household, name: 'Family')
      create(:household_membership, household: household, user: user, role: 'owner')
      get '/api/v1/households'
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json.length).to eq(1)
    end
  end

  describe 'GET /api/v1/households/:id' do
    it 'returns household by id' do
      household = create(:household, name: 'Test Family')
      create(:household_membership, household: household, user: user, role: 'owner')
      get "/api/v1/households/#{household.id}"
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['name']).to eq('Test Family')
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
    it 'updates household' do
      household = create(:household, name: 'Old Name')
      create(:household_membership, household: household, user: user, role: 'owner')
      params = { name: 'Updated Name' }
      put "/api/v1/households/#{household.id}", params: params
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['name']).to eq('Updated Name')
    end
  end

  describe 'DELETE /api/v1/households/:id' do
    it 'deletes household' do
      household = create(:household)
      create(:household_membership, household: household, user: user, role: 'owner')
      expect { delete "/api/v1/households/#{household.id}" }.to change(Household, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end
  end
end
