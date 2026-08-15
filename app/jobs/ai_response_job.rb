# frozen_string_literal: true

class AiResponseJob
  include Sidekiq::Job

  sidekiq_options queue: :default, retry: 3, backtrace: true

  def perform(conversation_id)
    conversation = Conversation.find_by(id: conversation_id)
    return unless conversation

    user = conversation.user
    prompt = conversation.messages.where(role: 'user').order(:created_at).last&.content
    return if prompt.blank?

    response = AiService.new(user: user).ask(prompt)
    text = response.respond_to?(:text) ? response.text : response.to_s

    conversation.messages.create!(role: 'assistant', content: text)
    Rails.logger.info "[AiResponse] replied to conversation #{conversation.id} (#{text.length} chars)"
  rescue StandardError => e
    Rails.logger.warn "[AiResponse] failed for conversation #{conversation_id}: #{e.message}"
    conversation&.messages&.create!(
      role: 'assistant',
      content: "Sorry, I couldn't generate a response right now. Please try again.",
      metadata: { error: e.message }
    )
  end
end
