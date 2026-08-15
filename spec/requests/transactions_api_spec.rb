require 'rails_helper'

RSpec.describe 'Transactions API', type: :request do
  let!(:user) { create(:user) }

  before do
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
  end

  describe 'GET /api/v1/transactions' do
    it 'returns empty array when no transactions' do
      get '/api/v1/transactions'
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['transactions']).to eq([])
    end

    it 'returns all transactions' do
      create(:transaction, user: user, description: 'Groceries', amount: 500)
      get '/api/v1/transactions'
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['transactions'].length).to eq(1)
    end
  end

  describe 'GET /api/v1/transactions/:id' do
    it 'returns transaction by id' do
      transaction = create(:transaction, user: user, description: 'Rent')
      get "/api/v1/transactions/#{transaction.id}"
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['description']).to eq('Rent')
    end
  end

  describe 'POST /api/v1/transactions' do
    it 'creates transaction with valid params' do
      params = { transaction: { description: 'Salary', amount: 50_000, transaction_type: 'income',
                                transaction_date: Time.zone.today } }
      post '/api/v1/transactions', params: params
      expect(response).to have_http_status(:created)
      json = response.parsed_body
      expect(json['description']).to eq('Salary')
    end

    it 'returns errors with invalid params' do
      params = { transaction: { description: '' } }
      post '/api/v1/transactions', params: params
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe 'PUT /api/v1/transactions/:id' do
    it 'updates transaction' do
      transaction = create(:transaction, user: user, description: 'Old')
      params = { transaction: { description: 'Updated' } }
      put "/api/v1/transactions/#{transaction.id}", params: params
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['description']).to eq('Updated')
    end
  end

  describe 'DELETE /api/v1/transactions/:id' do
    it 'deletes transaction' do
      transaction = create(:transaction, user: user)
      expect { delete "/api/v1/transactions/#{transaction.id}" }.to change(Transaction, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end
  end
end
