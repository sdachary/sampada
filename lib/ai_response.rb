# frozen_string_literal: true

AiResponse = Struct.new(:text, :setup, keyword_init: true) do
  def setup?
    setup.present?
  end
end
