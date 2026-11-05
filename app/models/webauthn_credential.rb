class WebauthnCredential < ApplicationRecord
  belongs_to :user

  enum :transport, { platform: 0, cross_platform: 1 }

  validates :webauthn_id, presence: true, uniqueness: true
  validates :public_key, presence: true
  validates :label, presence: true

  scope :for_user, ->(user) { where(user: user) }
end