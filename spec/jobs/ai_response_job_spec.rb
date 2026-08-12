# frozen_string_literal: true

require "rails_helper"

RSpec.describe AiResponseJob, type: :job do
  let(:user) { create(:user) }
  let(:conversation) { user.conversations.create!(title: "Test chat") }

  context "when the conversation has a user prompt" do
    it "creates an assistant message via AiService" do
      conversation.messages.create!(role: "user", content: "How much debt do I have?")

      response = AiResponse.new(text: "Here's your debt summary.")
      ai = instance_double(AiService, ask: response)
      allow(AiService).to receive(:new).with(user: user).and_return(ai)

      subject.perform(conversation.id)

      last = conversation.messages.order(:created_at).last
      expect(last.role).to eq("assistant")
      expect(last.content).to eq("Here's your debt summary.")
    end
  end

  context "when the conversation does not exist" do
    it "does nothing" do
      expect(AiService).not_to receive(:new)
      subject.perform(999_999)
    end
  end

  context "when AiService raises" do
    it "creates a graceful error message" do
      conversation.messages.create!(role: "user", content: "Hi")
      allow(AiService).to receive(:new).and_raise(StandardError, "boom")

      expect { subject.perform(conversation.id) }.not_to raise_error

      last = conversation.messages.order(:created_at).last
      expect(last.role).to eq("assistant")
      expect(last.content).to include("Sorry, I couldn't generate a response")
    end
  end
end