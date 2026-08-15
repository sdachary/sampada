require 'rails_helper'

RSpec.describe 'Dividend SIP API', type: :request do
  let!(:user) { create(:user) }
  let!(:portfolio) { create(:portfolio, user: user) }

  before do
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
  end

  describe 'GET /api/v1/dividend_sips' do
    it 'returns empty array when no dividend sips' do
      get '/api/v1/dividend_sips'
      expect(response).to have_http_status(:success)
      expect(response.parsed_body).to eq([])
    end

    it 'returns all dividend sips' do
      create(:dividend_sip, portfolio: portfolio, name: 'SIP 1')
      create(:dividend_sip, portfolio: portfolio, name: 'SIP 2')
      get '/api/v1/dividend_sips'
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json.length).to eq(2)
    end
  end

  describe 'GET /api/v1/dividend_sips/:id' do
    it 'returns dividend sip by id' do
      sip = create(:dividend_sip, portfolio: portfolio, name: 'Monthly SIP')
      get "/api/v1/dividend_sips/#{sip.id}"
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['name']).to eq('Monthly SIP')
    end
  end

  describe 'POST /api/v1/dividend_sips' do
    it 'creates dividend sip with valid params' do
      params = {
        dividend_sip: {
          portfolio_id: portfolio.id,
          name: 'New SIP',
          monthly_investment: 5000,
          target_income: 10_000,
          frequency: 'monthly',
          dividend_yield: 3.5
        }
      }
      post '/api/v1/dividend_sips', params: params
      expect(response).to have_http_status(:created)
      json = response.parsed_body
      expect(json['name']).to eq('New SIP')
    end

    it 'returns errors with invalid params' do
      params = { dividend_sip: { name: '', monthly_investment: nil, frequency: '' } }
      post '/api/v1/dividend_sips', params: params
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe 'PUT /api/v1/dividend_sips/:id' do
    it 'updates dividend sip with valid params' do
      sip = create(:dividend_sip, portfolio: portfolio, monthly_investment: 5000)
      params = { dividend_sip: { monthly_investment: 7000 } }
      put "/api/v1/dividend_sips/#{sip.id}", params: params
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['monthly_investment']).to eq(7000)
    end
  end

  describe 'DELETE /api/v1/dividend_sips/:id' do
    it 'deletes dividend sip' do
      sip = create(:dividend_sip, portfolio: portfolio)
      expect { delete "/api/v1/dividend_sips/#{sip.id}" }.to change(DividendSip, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end
  end

  describe 'GET /api/v1/dividend_sips/:id/suggest' do
    it 'returns stock suggestions' do
      sip = create(:dividend_sip, portfolio: portfolio, monthly_investment: 5000)
      get "/api/v1/dividend_sips/#{sip.id}/suggest", params: { monthly_investment: 5000, years: 10 }
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json).to have_key('stocks')
      expect(json).to have_key('target_income')
    end
  end
end
