require 'rails_helper'

RSpec.describe 'Onboarding API', type: :request do
  let!(:user) { create(:user) }

  before do
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
  end

  describe 'GET /api/v1/onboarding/snapshot' do
    it 'returns zeroed snapshot when no data' do
      get '/api/v1/onboarding/snapshot'
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['money_in']).to eq(0.0)
      expect(json['money_out']).to eq(0.0)
      expect(json['total_owed']).to eq(0.0)
      expect(json['checklist']).to eq({ 'loans' => false, 'investments' => false, 'insurance' => false,
                                        'budget' => false })
      expect(json['onboarded']).to be(false)
    end

    it 'reflects existing data in snapshot and checklist' do
      create(:transaction, user: user, transaction_type: 'income', amount: 50_000)
      create(:transaction, user: user, transaction_type: 'expense', amount: 12_000)
      create(:debt, user: user, amount: 100_000, emi_amount: 5000)
      create(:insurance_policy, user: user)
      get '/api/v1/onboarding/snapshot'
      json = response.parsed_body
      expect(json['money_in']).to eq(50_000.0)
      expect(json['money_out']).to eq(12_000.0)
      expect(json['total_owed']).to eq(100_000.0)
      expect(json['checklist']['loans']).to be(true)
      expect(json['checklist']['insurance']).to be(true)
      expect(json['checklist']['investments']).to be(false)
    end
  end

  describe 'POST /api/v1/onboarding/complete' do
    it 'marks user onboarded' do
      post '/api/v1/onboarding/complete'
      expect(response).to have_http_status(:success)
      expect(response.parsed_body['onboarded']).to be(true)
      expect(user.reload.onboarded?).to be(true)
    end
  end
end
