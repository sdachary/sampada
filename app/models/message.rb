# frozen_string_literal: true

class Message < TenantRecord
  ROLES = %w[user assistant system].freeze

  belongs_to :conversation

  validates :role, presence: true, inclusion: { in: ROLES }
  validates :content, presence: true
end
