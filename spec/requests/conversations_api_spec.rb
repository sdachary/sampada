require 'rails_helper'

RSpec.describe 'Conversations API', type: :request do
  let!(:user) { create(:user) }

  before do
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
  end

  describe 'GET /api/v1/conversations' do
    it 'lists conversations (empty by default)' do
      get '/api/v1/conversations'
      expect(response).to have_http_status(:success)
      expect(JSON.parse(response.body)).to eq([])
    end

    it 'shows a conversation with messages' do
      conv = user.conversations.create!(title: 'My chat')
      conv.messages.create!(role: 'user', content: 'hi')
      get "/api/v1/conversations/#{conv.id}"
      json = JSON.parse(response.body)
      expect(json['title']).to eq('My chat')
      expect(json['messages'].length).to eq(1)
      expect(json['messages'][0]['role']).to eq('user')
    end
  end

  describe 'POST /api/v1/conversations' do
    it 'creates a conversation' do
      post '/api/v1/conversations', params: { title: 'New chat' }
      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      expect(json['title']).to eq('New chat')
      expect(user.conversations.count).to eq(1)
    end
  end

  describe 'messages' do
    let!(:conv) { user.conversations.create!(title: 'Chat') }

    it 'enqueues AiResponseJob when posting a user message' do
      expect(AiResponseJob).to receive(:perform_async).with(conv.id)
      post "/api/v1/conversations/#{conv.id}/messages", params: { role: 'user', content: 'hello' }
      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      expect(json['role']).to eq('user')
      expect(conv.messages.count).to eq(1)
    end

    it 'does not enqueue for assistant messages' do
      expect(AiResponseJob).not_to receive(:perform_async)
      post "/api/v1/conversations/#{conv.id}/messages", params: { role: 'assistant', content: 'reply' }
      expect(response).to have_http_status(:created)
    end

    it 'appends a pending placeholder when last message is a user prompt' do
      conv.messages.create!(role: 'user', content: 'question')
      get "/api/v1/conversations/#{conv.id}/messages"
      json = JSON.parse(response.body)
      expect(json.last['metadata']).to include('pending' => true)
    end

    it 'removes pending placeholder once an assistant reply exists' do
      conv.messages.create!(role: 'user', content: 'question')
      conv.messages.create!(role: 'assistant', content: 'answer')
      get "/api/v1/conversations/#{conv.id}/messages"
      json = JSON.parse(response.body)
      expect(json.last['role']).to eq('assistant')
      expect(json.none? { |m| m['metadata']&.include?('pending') }).to be(true)
    end
  end
end