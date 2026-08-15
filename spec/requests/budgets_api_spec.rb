require 'rails_helper'

RSpec.describe 'Budgets API', type: :request do
  let!(:user) { create(:user) }

  before do
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
  end

  describe 'GET /api/v1/budgets' do
    it 'returns empty array when no budgets' do
      get '/api/v1/budgets'
      expect(response).to have_http_status(:success)
      expect(response.parsed_body).to eq([])
    end

    it 'returns all budgets' do
      category = create(:budget_category, user: user)
      create(:budget, user: user, budget_category: category, monthly_limit: 50_000)
      get '/api/v1/budgets'
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json.length).to eq(1)
    end
  end

  describe 'GET /api/v1/budgets/:id' do
    it 'returns budget by id' do
      category = create(:budget_category, user: user)
      budget = create(:budget, user: user, budget_category: category)
      get "/api/v1/budgets/#{budget.id}"
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json).to have_key('monthly_limit')
    end
  end

  describe 'POST /api/v1/budgets' do
    it 'creates budget with valid params' do
      category = create(:budget_category, user: user)
      params = { budget: { budget_category_id: category.id, monthly_limit: 30_000, period: 'monthly' } }
      post '/api/v1/budgets', params: params
      expect(response).to have_http_status(:created)
      json = response.parsed_body
      expect(json['monthly_limit']).to eq(30_000.0)
    end

    it 'returns errors with invalid params' do
      post '/api/v1/budgets', params: { budget: { monthly_limit: nil } }
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe 'PUT /api/v1/budgets/:id' do
    it 'updates budget' do
      category = create(:budget_category, user: user)
      budget = create(:budget, user: user, budget_category: category, monthly_limit: 30_000)
      params = { budget: { monthly_limit: 40_000 } }
      put "/api/v1/budgets/#{budget.id}", params: params
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['monthly_limit']).to eq(40_000.0)
    end
  end

  describe 'DELETE /api/v1/budgets/:id' do
    it 'deletes budget' do
      category = create(:budget_category, user: user)
      budget = create(:budget, user: user, budget_category: category)
      expect { delete "/api/v1/budgets/#{budget.id}" }.to change(Budget, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end
  end
end
