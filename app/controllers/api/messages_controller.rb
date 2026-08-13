class Api::MessagesController < Api::BaseController
  before_action :set_conversation

  def index
    messages = @conversation.messages.order(created_at: :asc).to_a
    last_is_user_prompt = messages.last&.role == "user"
    render_success(messages.map { |m| message_json(m) }.tap do |json|
      json << { id: "pending", role: "assistant", content: "…", metadata: { pending: true }, created_at: nil } if last_is_user_prompt
    end)
  end

  def create
    message = @conversation.messages.create!(message_params)
    AiResponseJob.perform_async(@conversation.id) if message.role == "user"
    render_success(message_json(message), status: :created)
  end

  private

  def set_conversation
    @conversation = current_user.conversations.find(params[:conversation_id])
  end

  def message_params
    params.permit(:role, :content, metadata: {})
  end

  def message_json(m)
    { id: m.id, role: m.role, content: m.content, metadata: m.metadata, created_at: m.created_at }
  end
end
