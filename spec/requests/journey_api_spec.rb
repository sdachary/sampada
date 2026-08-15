require 'rails_helper'

RSpec.describe 'Journey API', type: :request do
  let!(:user) { create(:user) }

  before do
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
  end

  describe 'GET /api/v1/journey' do
    it 'returns journey data' do
      get '/api/v1/journey'
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json).to have_key('debt')
      expect(json).to have_key('sip')
      expect(json).to have_key('net_worth')
      expect(json).to have_key('milestones')
    end

    it 'returns debt progress' do
      create(:debt, user: user, amount: 50_000, emi_amount: 1000)
      get '/api/v1/journey'
      json = response.parsed_body
      expect(json['debt']).to have_key('total_debt')
      expect(json['debt']).to have_key('total_emi')
    end

    it 'returns net worth trajectory' do
      get '/api/v1/journey'
      json = response.parsed_body
      expect(json['net_worth']).to have_key('net_worth')
      expect(json['net_worth']).to have_key('assets')
      expect(json['net_worth']).to have_key('liabilities')
    end
  end

  describe 'GET /api/v1/journey/progress' do
    it 'returns progress data' do
      get '/api/v1/journey/progress'
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json).to have_key('debt_progress')
      expect(json).to have_key('sip_progress')
      expect(json).to have_key('net_worth_trajectory')
      expect(json).to have_key('milestones')
    end
  end

  describe 'GET /api/v1/journey/net_worth' do
    it 'returns net worth trajectory' do
      get '/api/v1/journey/net_worth'
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json).to have_key('net_worth')
      expect(json).to have_key('trajectory')
    end

    it 'returns trajectory as array' do
      get '/api/v1/journey/net_worth'
      json = response.parsed_body
      expect(json['trajectory']).to be_an(Array)
    end
  end
end
