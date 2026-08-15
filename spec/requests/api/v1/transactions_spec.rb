require 'rails_helper'

RSpec.describe 'Transactions API', type: :request do
  let!(:user) { create(:user) }

  before do
    # Stubs current_user by mocking Api::BaseController which is the parent of API controllers
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
  end

  describe 'GET /api/v1/transactions' do
    it 'returns empty array when no transactions exist' do
      get '/api/v1/transactions'
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['transactions']).to eq([])
    end

    it 'returns a list of transactions when they exist' do
      create(:transaction, user: user, description: 'Grocery Shopping', amount: 50.0)
      create(:transaction, user: user, description: 'Salary', amount: 5000.0, transaction_type: 'income')

      get '/api/v1/transactions'
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['transactions'].length).to eq(2)
      expect(json['pagination']['total']).to eq(2)
    end
  end

  describe 'POST /api/v1/transactions' do
    it 'creates a transaction with valid parameters' do
      params = {
        description: 'New Transaction',
        amount: 100.0,
        transaction_type: 'expense',
        transaction_date: Time.zone.today,
        currency_code: 'INR'
      }

      expect do
        post '/api/v1/transactions', params: params
      end.to change(Transaction, :count).by(1)

      expect(response).to have_http_status(:created)
      json = response.parsed_body
      expect(json['description']).to eq('New Transaction')
    end

    it 'returns unprocessable_entity when parameters are invalid' do
      params = { description: '', amount: 0 }

      post '/api/v1/transactions', params: params
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe 'PUT /api/v1/transactions/:id' do
    it 'updates an existing transaction' do
      transaction = create(:transaction, user: user, description: 'Old Description')
      update_params = { description: 'Updated Description' }

      put "/api/v1/transactions/#{transaction.id}", params: update_params

      expect(response).to have_http_status(:success)
      expect(transaction.reload.description).to eq('Updated Description')
    end
  end

  describe 'DELETE /api/v1/transactions/:id' do
    it 'deletes the specified transaction' do
      transaction = create(:transaction, user: user)

      expect do
        delete "/api/v1/transactions/#{transaction.id}"
      end.to change(Transaction, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end
  end
end
