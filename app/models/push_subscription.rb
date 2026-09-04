# frozen_string_literal: true

class PushSubscription < TenantRecord
  belongs_to :user

  scope :active, -> { where('expires_at IS NULL OR expires_at > ?', Time.current) }

  validates :endpoint, presence: true, uniqueness: true
  validates :p256dh, presence: true
  validates :auth, presence: true

  def expired?
    expires_at.present? && expires_at <= Time.current
  end
end
