require 'rails_helper'

RSpec.describe 'Insurance Policies API', type: :request do
  let!(:user) { create(:user) }

  before do
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
  end

  describe 'GET /api/v1/insurance_policies' do
    it 'returns empty array when no policies' do
      get '/api/v1/insurance_policies'
      expect(response).to have_http_status(:success)
      expect(JSON.parse(response.body)).to eq([])
    end

    it 'returns all policies' do
      create(:insurance_policy, user: user, provider_name: 'LIC Health')
      create(:insurance_policy, user: user, provider_name: 'Star Term Life')
      get '/api/v1/insurance_policies'
      expect(response).to have_http_status(:success)
      expect(JSON.parse(response.body).length).to eq(2)
    end
  end

  describe 'GET /api/v1/insurance_policies/:id' do
    it 'returns policy by id' do
      policy = create(:insurance_policy, user: user, provider_name: 'LIC Health')
      get "/api/v1/insurance_policies/#{policy.id}"
      expect(response).to have_http_status(:success)
      expect(JSON.parse(response.body)['provider_name']).to eq('LIC Health')
    end

    it 'returns not found for invalid id' do
      get '/api/v1/insurance_policies/invalid-uuid'
      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'POST /api/v1/insurance_policies' do
    it 'creates policy with valid params' do
      params = {
        policy_type: 'health',
        provider_name: 'HDFC Ergo',
        premium_amount: 15000,
        premium_frequency: 'yearly',
        coverage_amount: 500000
      }
      post '/api/v1/insurance_policies', params: params
      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      expect(json['provider_name']).to eq('HDFC Ergo')
      expect(json['premium_amount']).to eq(15000.0)
    end

    it 'returns errors with invalid params' do
      post '/api/v1/insurance_policies', params: { provider_name: '' }
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe 'PUT /api/v1/insurance_policies/:id' do
    it 'updates policy with valid params' do
      policy = create(:insurance_policy, user: user, provider_name: 'Old Name')
      put "/api/v1/insurance_policies/#{policy.id}", params: { provider_name: 'Updated Name' }
      expect(response).to have_http_status(:success)
      expect(JSON.parse(response.body)['provider_name']).to eq('Updated Name')
    end

    it 'returns errors with invalid params' do
      policy = create(:insurance_policy, user: user)
      put "/api/v1/insurance_policies/#{policy.id}", params: { premium_amount: -100 }
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe 'DELETE /api/v1/insurance_policies/:id' do
    it 'deletes policy' do
      policy = create(:insurance_policy, user: user)
      expect { delete "/api/v1/insurance_policies/#{policy.id}" }.to change(InsurancePolicy, :count).by(-1)
      expect(response).to have_http_status(:success)
    end
  end
end
