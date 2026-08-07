require 'rails_helper'

RSpec.describe 'Debts API', type: :request do
  let!(:user) { create(:user) }

  before do
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
  end

  describe 'GET /api/v1/debts' do
    it 'returns empty array when no debts' do
      get '/api/v1/debts'
      expect(response).to have_http_status(:success)
      expect(JSON.parse(response.body)).to eq([])
    end

    it 'returns all debts' do
      create(:debt, user: user, name: 'Home Loan', amount: 100000)
      create(:debt, user: user, name: 'Car Loan', amount: 20000)
      get '/api/v1/debts'
      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json.length).to eq(2)
    end
  end

  describe 'GET /api/v1/debts/:id' do
    it 'returns debt by id' do
      debt = create(:debt, user: user, name: 'Personal Loan')
      get "/api/v1/debts/#{debt.id}"
      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json['name']).to eq('Personal Loan')
    end

    it 'returns not found for invalid id' do
      get '/api/v1/debts/invalid-uuid'
      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'POST /api/v1/debts' do
    it 'creates debt with valid params' do
      params = {
        name: 'New Loan',
        amount: 50000,
        interest_rate: 12.0,
        emi_amount: 1000
      }
      post '/api/v1/debts', params: params
      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      expect(json['name']).to eq('New Loan')
    end

    it 'returns errors with invalid params' do
      post '/api/v1/debts', params: { name: '' }
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe 'PUT /api/v1/debts/:id' do
    it 'updates debt with valid params' do
      debt = create(:debt, user: user, name: 'Old Name')
      put "/api/v1/debts/#{debt.id}", params: { name: 'Updated Name' }
      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json['name']).to eq('Updated Name')
    end

    it 'returns errors with invalid params' do
      debt = create(:debt, user: user)
      put "/api/v1/debts/#{debt.id}", params: { amount: -100 }
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe 'DELETE /api/v1/debts/:id' do
    it 'deletes debt' do
      debt = create(:debt, user: user)
      expect { delete "/api/v1/debts/#{debt.id}" }.to change(Debt, :count).by(-1)
      expect(response).to have_http_status(:success)
    end
  end

  describe 'POST /api/v1/debts/:id/simulate' do
    it 'returns simulation result' do
      debt = create(:debt, user: user, amount: 10000, interest_rate: 10.0, emi_amount: 500)
      post "/api/v1/debts/#{debt.id}/simulate", params: { extra_monthly_payment: 100 }
      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json).to have_key('months')
      expect(json).to have_key('total_interest')
    end
  end
end
