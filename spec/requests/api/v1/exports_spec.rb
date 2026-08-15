require 'rails_helper'

RSpec.describe 'Exports API', type: :request do
  let!(:user) { create(:user) }

  before do
    # Stubs current_user by mocking Api::BaseController which is the parent of API controllers
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
  end

  describe 'GET /api/v1/exports/transactions' do
    it 'exports transactions as CSV' do
      create(:transaction, user: user)
      get '/api/v1/exports/transactions', params: { format: 'csv' }

      expect(response).to have_http_status(:success)
      expect(response.content_type).to include('text/csv')
      expect(response.header['Content-Disposition']).to include('transactions_')
    end

    it 'exports transactions as JSON' do
      create(:transaction, user: user)
      get '/api/v1/exports/transactions', params: { format: 'json' }

      expect(response).to have_http_status(:success)
      expect(response.content_type).to include('application/json')
    end
  end

  describe 'GET /api/v1/exports/debts' do
    it 'returns debt export data' do
      create(:debt, user: user)
      get '/api/v1/exports/debts'
      expect(response).to have_http_status(:success)
    end
  end

  describe 'GET /api/v1/exports/portfolios' do
    it 'returns portfolio export data' do
      create(:portfolio, user: user)
      get '/api/v1/exports/portfolios'
      expect(response).to have_http_status(:success)
    end
  end

  describe 'GET /api/v1/exports/net_worth' do
    it 'returns net worth export data' do
      get '/api/v1/exports/net_worth'
      expect(response).to have_http_status(:success)
    end
  end
end
