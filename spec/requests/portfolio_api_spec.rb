require 'rails_helper'

RSpec.describe 'Portfolio API', type: :request do
  let!(:user) { create(:user) }

  before do
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
  end

  describe 'GET /api/v1/portfolios' do
    it 'returns empty array when no portfolios' do
      get '/api/v1/portfolios'
      expect(response).to have_http_status(:success)
      expect(JSON.parse(response.body)).to eq([])
    end

    it 'returns all portfolios' do
      create(:portfolio, user: user, name: 'Equity Portfolio')
      create(:portfolio, user: user, name: 'Debt Portfolio')
      get '/api/v1/portfolios'
      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json.length).to eq(2)
    end
  end

  describe 'GET /api/v1/portfolios/:id' do
    it 'returns portfolio by id' do
      portfolio = create(:portfolio, user: user, name: 'Test Portfolio')
      get "/api/v1/portfolios/#{portfolio.id}"
      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json['name']).to eq('Test Portfolio')
    end
  end

  describe 'POST /api/v1/portfolios' do
    it 'creates portfolio with valid params' do
      params = {
        portfolio: {
          name: 'New Portfolio',
          risk_tolerance: 0.6,
          target_allocation: { 'stocks' => 70, 'bonds' => 30 },
          current_allocation: { 'stocks' => 65, 'bonds' => 35 }
        }
      }
      post '/api/v1/portfolios', params: params
      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      expect(json['name']).to eq('New Portfolio')
    end

    it 'returns errors with invalid params' do
      params = { portfolio: { name: '' } }
      post '/api/v1/portfolios', params: params
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe 'PUT /api/v1/portfolios/:id' do
    it 'updates portfolio with valid params' do
      portfolio = create(:portfolio, user: user, name: 'Old Name')
      params = { portfolio: { name: 'Updated Name' } }
      put "/api/v1/portfolios/#{portfolio.id}", params: params
      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json['name']).to eq('Updated Name')
    end
  end

  describe 'DELETE /api/v1/portfolios/:id' do
    it 'deletes portfolio' do
      portfolio = create(:portfolio, user: user)
      expect { delete "/api/v1/portfolios/#{portfolio.id}" }.to change(Portfolio, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end
  end

  describe 'POST /api/v1/portfolios/:id/rebalance' do
    it 'returns rebalance result' do
      portfolio = create(:portfolio, user: user, risk_tolerance: 0.5)
      create(:investment, portfolio: portfolio)
      create(:investment, portfolio: portfolio, symbol: 'AXISBANK.NS', name: 'Axis Bank')
      post "/api/v1/portfolios/#{portfolio.id}/rebalance"
      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json).to have_key('optimal_weights')
    end
  end
end
