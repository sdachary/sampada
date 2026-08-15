# frozen_string_literal: true

class Conversation < TenantRecord
  belongs_to :user
  has_many :messages, dependent: :destroy

  validates :title, presence: true
end
