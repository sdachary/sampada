require 'rails_helper'

RSpec.describe 'Reports API', type: :request do
  let!(:user) { create(:user) }

  before do
    # Stubs current_user by mocking Api::BaseController which is the parent of API controllers
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
  end

  describe 'GET /api/v1/reports/annual' do
    it 'returns the annual financial report' do
      get '/api/v1/reports/annual', params: { year: Time.current.year }
      expect(response).to have_http_status(:success)
    end
  end

  describe 'GET /api/v1/reports/cash_flow_forecast' do
    it 'returns the cash flow forecast data' do
      get '/api/v1/reports/cash_flow_forecast', params: { months: 12 }
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json).to have_key('forecast')
      expect(json).to have_key('summary')
    end
  end

  describe 'GET /api/v1/reports/anomalies' do
    it 'returns detected financial anomalies' do
      get '/api/v1/reports/anomalies'
      expect(response).to have_http_status(:success)
    end
  end

  describe 'GET /api/v1/reports/goal_charts' do
    it 'returns chart data for financial goals' do
      get '/api/v1/reports/goal_charts'
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json).to have_key('debt_free_progress')
      expect(json).to have_key('wealth_growth')
      expect(json).to have_key('budget_chart')
      expect(json).to have_key('income_vs_expenses')
    end
  end
end
