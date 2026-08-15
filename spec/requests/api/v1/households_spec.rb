require 'rails_helper'

RSpec.describe 'Households API', type: :request do
  let!(:user) { create(:user) }

  before do
    # Stubs current_user by mocking Api::BaseController which is the parent of API controllers
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
  end

  describe 'GET /api/v1/households' do
    it 'returns empty array when user belongs to no households' do
      get '/api/v1/households'
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json).to eq([])
    end

    it 'returns a list of households for the current user' do
      household = create(:household, name: 'Joint Family')
      create(:household_membership, household: household, user: user, role: 'owner')

      get '/api/v1/households'
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json.length).to eq(1)
      expect(json.first['name']).to eq('Joint Family')
    end
  end

  describe 'GET /api/v1/households/:id' do
    it 'returns household details' do
      household = create(:household, name: 'Joint Family')
      create(:household_membership, household: household, user: user, role: 'owner')

      get "/api/v1/households/#{household.id}"
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json).to have_key('net_worth')
    end
  end

  describe 'POST /api/v1/households' do
    it 'creates a new household' do
      params = { name: 'New Home', currency: 'INR' }

      expect do
        post '/api/v1/households', params: params
      end.to change(Household, :count).by(1)

      expect(response).to have_http_status(:created)
      json = response.parsed_body
      expect(json['name']).to eq('New Home')
    end

    it 'returns unprocessable_entity for invalid data' do
      post '/api/v1/households', params: { name: '' }
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe 'PUT /api/v1/households/:id' do
    it 'updates household information' do
      household = create(:household, name: 'Old Name')
      create(:household_membership, household: household, user: user, role: 'owner')

      put "/api/v1/households/#{household.id}", params: { name: 'Updated Name' }

      expect(response).to have_http_status(:success)
      expect(household.reload.name).to eq('Updated Name')
    end
  end

  describe 'DELETE /api/v1/households/:id' do
    it 'removes the household' do
      household = create(:household)
      create(:household_membership, household: household, user: user, role: 'owner')

      expect do
        delete "/api/v1/households/#{household.id}"
      end.to change(Household, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end
  end
end
