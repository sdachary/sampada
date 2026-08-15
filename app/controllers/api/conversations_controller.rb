module Api
  class ConversationsController < Api::BaseController
    def index
      conversations = current_user.conversations.order(created_at: :desc)
      render_success(conversations.map { |c| conversation_json(c) })
    end

    def show
      conversation = current_user.conversations.find(params[:id])
      messages = conversation.messages.order(created_at: :asc)
      render_success(conversation_json(conversation).merge(messages: messages.map { |m| message_json(m) }))
    end

    def create
      conversation = current_user.conversations.create!(conversation_params)
      render_success(conversation_json(conversation), status: :created)
    end

    def destroy
      conversation = current_user.conversations.find(params[:id])
      conversation.destroy!
      head :no_content
    end

    private

    def conversation_params
      params.permit(:title, :summary)
    end

    def conversation_json(c)
      { id: c.id, title: c.title, summary: c.summary, created_at: c.created_at }
    end

    def message_json(m)
      { id: m.id, role: m.role, content: m.content, metadata: m.metadata, created_at: m.created_at }
    end
  end
end
