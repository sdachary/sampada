# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Goals API', type: :request do
  let!(:user) { create(:user) }

  before do
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
  end

  describe 'GET /api/v1/goals' do
    it 'returns empty array when no goals' do
      get '/api/v1/goals'
      expect(response).to have_http_status(:success)
      expect(response.parsed_body).to eq([])
    end

    it 'returns all goals for current user' do
      create(:goal, user: user, name: 'Retirement')
      create(:goal, user: user, name: 'House')
      get '/api/v1/goals'
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json.length).to eq(2)
    end

    it 'does not return goals from other users' do
      other = create(:user)
      create(:goal, user: other, name: 'Other Goal')
      create(:goal, user: user, name: 'My Goal')
      get '/api/v1/goals'
      json = response.parsed_body
      expect(json.length).to eq(1)
      expect(json.first['name']).to eq('My Goal')
    end
  end

  describe 'GET /api/v1/goals/:id' do
    it 'returns goal by id with projection data' do
      goal = create(:goal, user: user, name: 'Retirement Corpus')
      get "/api/v1/goals/#{goal.id}"
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['name']).to eq('Retirement Corpus')
      expect(json).to have_key('projection')
      expect(json).to have_key('final_corpus')
      expect(json).to have_key('risk_comparison')
    end
  end

  describe 'POST /api/v1/goals' do
    it 'creates goal with valid params' do
      params = {
        goal: {
          name: 'New Goal',
          target_amount: 5_000_000,
          target_year: Date.current.year + 5,
          monthly_sip: 25_000,
          allocation: 'moderate'
        }
      }
      post '/api/v1/goals', params: params
      expect(response).to have_http_status(:created)
      json = response.parsed_body
      expect(json['name']).to eq('New Goal')
      expect(json['target_amount']).to eq(5_000_000)
      expect(json['allocation']).to eq('moderate')
    end

    it 'returns errors with invalid params' do
      params = { goal: { name: '', target_amount: -1, monthly_sip: -100 } }
      post '/api/v1/goals', params: params
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe 'PUT /api/v1/goals/:id' do
    it 'updates goal with valid params' do
      goal = create(:goal, user: user, monthly_sip: 25_000)
      params = { goal: { monthly_sip: 50_000 } }
      put "/api/v1/goals/#{goal.id}", params: params
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['monthly_sip']).to eq(50_000)
    end
  end

  describe 'DELETE /api/v1/goals/:id' do
    it 'deletes goal' do
      goal = create(:goal, user: user)
      expect { delete "/api/v1/goals/#{goal.id}" }.to change(Goal, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end
  end
end
