require 'rails_helper'

RSpec.describe 'AI Settings API', type: :request do
  let!(:user) { create(:user) }

  before do
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
  end

  describe 'GET /api/v1/ai_settings' do
    it 'returns unconfigured by default' do
      get '/api/v1/ai_settings'
      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json['configured']).to be(false)
      expect(json['provider']).to be_nil
      expect(json['presets']).to include('gemini', 'grok', 'openai', 'openrouter')
    end
  end

  describe 'PUT /api/v1/ai_settings' do
    it 'configures a provider with an api key' do
      put '/api/v1/ai_settings', params: { provider: 'gemini', api_key: 'AIza-test123' }
      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json['configured']).to be(true)
      expect(json['provider']).to eq('gemini')

      expect(Setting.get('ai_provider', user: user)).to eq('gemini')
      expect(Setting.get('ai_api_key', user: user)).to eq('AIza-test123')
      expect(Setting.get('ai_uri', user: user)).to include('generativelanguage')
      expect(Setting.get('ai_model', user: user)).to eq('gemini-1.5-flash')
    end

    it 'allows model override' do
      put '/api/v1/ai_settings', params: { provider: 'grok', api_key: 'xai-key', model: 'grok-2' }
      json = JSON.parse(response.body)
      expect(json['configured']).to be(true)
      expect(Setting.get('ai_model', user: user)).to eq('grok-2')
    end

    it 'rejects unknown providers' do
      put '/api/v1/ai_settings', params: { provider: 'not-real', api_key: 'x' }
      expect(response).to have_http_status(:unprocessable_entity)
      expect(Setting.get('ai_provider', user: user)).to be_nil
    end
  end

  describe 'DELETE /api/v1/ai_settings' do
    it 'clears all ai settings' do
      Setting.set('ai_provider', 'grok', user: user)
      Setting.set('ai_api_key', 'secret', user: user)
      Setting.set('ai_uri', 'https://api.x.ai/v1', user: user)
      Setting.set('ai_model', 'grok-beta', user: user)

      delete '/api/v1/ai_settings'
      expect(response).to have_http_status(:success)
      expect(JSON.parse(response.body)['configured']).to be(false)
      expect(Setting.where(user: user, key: %w[ai_provider ai_api_key ai_uri ai_model]).count).to eq(0)
    end
  end
end