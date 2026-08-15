# frozen_string_literal: true

class Message < TenantRecord
  belongs_to :conversation

  validates :role, presence: true, inclusion: { in: %w[user assistant system] }
  validates :content, presence: true
end
