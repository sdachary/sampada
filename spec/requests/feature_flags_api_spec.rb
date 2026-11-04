require 'rails_helper'

RSpec.describe 'Feature Flags API', type: :request do
  let!(:user) { create(:user) }

  before do
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
  end

  describe 'GET /api/v1/feature_flags' do
    it 'returns all flags enabled by default' do
      get '/api/v1/feature_flags'
      expect(response).to have_http_status(:success)
      expect(response.parsed_body['flags']).to eq(
        'pdf_import' => true, 'recurring_detection' => true, 'passkeys' => true
      )
    end

    it 'reflects a disabled flag' do
      FeatureFlags.disable('passkeys', user: user)
      get '/api/v1/feature_flags'
      expect(response.parsed_body['flags']['passkeys']).to be(false)
    end
  end

  describe 'PATCH /api/v1/feature_flags/:key' do
    it 'disables a flag' do
      patch '/api/v1/feature_flags/pdf_import', params: { enabled: 'false' }
      expect(response).to have_http_status(:success)
      expect(response.parsed_body['enabled']).to be(false)
      expect(FeatureFlags.enabled?('pdf_import', user: user)).to be(false)
    end

    it 're-enables a flag' do
      FeatureFlags.disable('pdf_import', user: user)
      patch '/api/v1/feature_flags/pdf_import', params: { enabled: 'true' }
      expect(response.parsed_body['enabled']).to be(true)
      expect(FeatureFlags.enabled?('pdf_import', user: user)).to be(true)
    end

    it 'returns 404 for unknown keys' do
      patch '/api/v1/feature_flags/nonsense', params: { enabled: 'true' }
      expect(response).to have_http_status(:not_found)
    end
  end
end
