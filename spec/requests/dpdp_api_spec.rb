require 'rails_helper'

RSpec.describe 'DPDP API', type: :request do
  let!(:user) { create(:user) }

  before do
    # The before_action verifies the session against the better-auth service over
    # HTTP, so bypass it and present a signed-in user.
    allow_any_instance_of(Api::BaseController).to receive(:authenticate_with_better_auth)
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
  end

  describe 'POST /api/v1/dpdp/consent' do
    it 'records a granted consent with its audit fields' do
      post '/api/v1/dpdp/consent', params: { feature: 'financial_tracking', granted: true }, as: :json

      expect(response).to have_http_status(:success)
      expect(response.parsed_body['success']).to be(true)

      record = user.consent_records.sole
      expect(record.feature).to eq('financial_tracking')
      expect(record.granted).to be(true)
      expect(record.granted_at).to be_present
      expect(record.ip_address).to be_present
    end

    it 'records a revocation as its own row' do
      post '/api/v1/dpdp/consent', params: { feature: 'marketing', granted: false }, as: :json

      expect(response).to have_http_status(:success)
      expect(user.consent_records.sole.granted).to be(false)
    end

    it 'rejects a feature outside the allowlist' do
      post '/api/v1/dpdp/consent', params: { feature: 'sell_everything', granted: true }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(user.consent_records).to be_empty
    end

    it 'withdraws a previously granted feature so status stops reporting it' do
      post '/api/v1/dpdp/consent', params: { feature: 'financial_tracking', granted: true }, as: :json
      expect(user.consent_records.active.count).to eq(1)

      post '/api/v1/dpdp/consent', params: { feature: 'financial_tracking', granted: false }, as: :json

      expect(response).to have_http_status(:success)
      expect(user.consent_records.count).to eq(2)

      get '/api/v1/dpdp/consent'
      expect(response.parsed_body['consent']['financial_tracking']).to be(false)
    end

    it 'leaves other features granted when one is withdrawn' do
      post '/api/v1/dpdp/consent', params: { feature: 'financial_tracking', granted: true }, as: :json
      post '/api/v1/dpdp/consent', params: { feature: 'trip_data', granted: true }, as: :json
      post '/api/v1/dpdp/consent', params: { feature: 'financial_tracking', granted: false }, as: :json

      get '/api/v1/dpdp/consent'
      expect(response.parsed_body['consent']).to include('financial_tracking' => false, 'trip_data' => true)
    end
  end

  describe 'GET /api/v1/dpdp/consent' do
    it 'reports status per feature from active grants only' do
      user.consent_records.create!(feature: 'financial_tracking', granted: true, granted_at: Time.current)
      user.consent_records.create!(feature: 'marketing', granted: false, granted_at: Time.current)

      get '/api/v1/dpdp/consent'

      expect(response).to have_http_status(:success)
      consent = response.parsed_body['consent']
      expect(consent.keys).to match_array(ConsentRecord::FEATURES)
      expect(consent['financial_tracking']).to be(true)
      expect(consent['marketing']).to be(false)
    end

    it 'does not report another user consent' do
      create(:user).consent_records.create!(feature: 'financial_tracking', granted: true, granted_at: Time.current)

      get '/api/v1/dpdp/consent'

      expect(response.parsed_body['consent']['financial_tracking']).to be(false)
    end
  end

  describe 'POST /api/v1/dpdp/erasure' do
    it 'opens a cancellable 48 hour window' do
      post '/api/v1/dpdp/erasure', params: { export_data: true }, as: :json

      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['cancel_token']).to be_present
      expect(json['scheduled_for']).to be_present

      record = user.deletion_requests.sole
      expect(record.status).to eq('pending')
      expect(record.export_data).to be(true)
      expect(record.scheduled_for).to be_within(1.minute).of(48.hours.from_now)
    end

    it 'refuses a second request while one is pending' do
      user.deletion_requests.create!

      post '/api/v1/dpdp/erasure', params: {}, as: :json

      expect(response).to have_http_status(:conflict)
      expect(user.deletion_requests.count).to eq(1)
    end
  end

  describe 'POST /api/v1/dpdp/cancel-deletion' do
    it 'cancels a pending request' do
      request_record = user.deletion_requests.create!

      post '/api/v1/dpdp/cancel-deletion', params: { cancel_token: request_record.cancel_token }, as: :json

      expect(response).to have_http_status(:success)
      expect(request_record.reload.status).to eq('cancelled')
    end

    it 'refuses an unknown token' do
      user.deletion_requests.create!

      post '/api/v1/dpdp/cancel-deletion', params: { cancel_token: SecureRandom.uuid }, as: :json

      expect(response).to have_http_status(:not_found)
    end

    it 'refuses another user cancel token' do
      foreign = create(:user).deletion_requests.create!

      post '/api/v1/dpdp/cancel-deletion', params: { cancel_token: foreign.cancel_token }, as: :json

      expect(response).to have_http_status(:not_found)
      expect(foreign.reload.status).to eq('pending')
    end

    it 'allows a fresh request once the window is closed' do
      request_record = user.deletion_requests.create!
      request_record.cancel!

      post '/api/v1/dpdp/erasure', params: {}, as: :json

      expect(response).to have_http_status(:success)
      expect(user.deletion_requests.where(status: 'pending').count).to eq(1)
    end
  end

  describe 'POST /api/v1/dpdp/full-export' do
    it 'exports only the current user rows' do
      create(:debt, user: user, name: 'Mine')
      create(:debt, user: create(:user), name: 'Theirs')

      post '/api/v1/dpdp/full-export'

      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['exported_at']).to be_present
      expect(json['user']['id']).to eq(user.id)
      expect(json['debts'].pluck('name')).to eq(['Mine'])
    end

    it 'includes consent, deletion and grievance history' do
      user.consent_records.create!(feature: 'marketing', granted: true, granted_at: Time.current)
      user.deletion_requests.create!(status: 'cancelled')
      user.grievances.create!(name: 'A', email: 'a@example.com', grievance_type: 'other', description: 'x')

      post '/api/v1/dpdp/full-export'

      json = response.parsed_body
      expect(json['consent_records'].length).to eq(1)
      expect(json['deletion_requests'].length).to eq(1)
      expect(json['grievances'].length).to eq(1)
    end
  end

  describe 'POST /api/v1/dpdp/grievance' do
    it 'persists the grievance and returns a reference number' do
      post '/api/v1/dpdp/grievance',
           params: { grievance_type: 'erasure', description: 'Erasure still incomplete after 48 hours' },
           as: :json

      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['reference_number']).to match(/\AGRF-\d{6}-[0-9A-F]{8}\z/)
      expect(json['status']).to eq('received')
      expect(json['expected_response']).to eq('72 hours')

      record = user.grievances.sole
      expect(record.description).to eq('Erasure still incomplete after 48 hours')
      expect(record.email).to eq(user.email)
      expect(record.acknowledged_at).to be_present
    end

    it 'falls back to the account email when the user has no name' do
      user.update!(first_name: nil, last_name: nil)

      post '/api/v1/dpdp/grievance', params: { grievance_type: 'access', description: 'Where is my data' }, as: :json

      expect(response).to have_http_status(:success)
      expect(user.grievances.sole.name).to eq(user.email)
    end

    it 'accepts a different contact email and phone' do
      post '/api/v1/dpdp/grievance',
           params: { name: 'Ravi', email: 'ravi@example.com', phone: '+91 90000 00000',
                     grievance_type: 'correction', description: 'Wrong balance' },
           as: :json

      expect(response).to have_http_status(:success)
      record = user.grievances.sole
      expect(record.name).to eq('Ravi')
      expect(record.email).to eq('ravi@example.com')
      expect(record.phone).to eq('+91 90000 00000')
    end

    it 'rejects a type outside the allowlist' do
      post '/api/v1/dpdp/grievance', params: { grievance_type: 'nonsense', description: 'x' }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(user.grievances).to be_empty
    end

    it 'requires a description' do
      post '/api/v1/dpdp/grievance', params: { grievance_type: 'other' }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
