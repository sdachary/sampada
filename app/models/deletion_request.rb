class DeletionRequest < ApplicationRecord
  belongs_to :user

  STATUSES = %w[pending exporting exported deleting deleted cancelled failed].freeze

  validates :status, inclusion: { in: STATUSES }
  validates :cancel_token, presence: true

  before_validation :set_defaults, on: :create

  scope :pending, -> { where(status: 'pending') }

  def cancel!
    update!(status: 'cancelled')
  end

  private

  def set_defaults
    self.cancel_token ||= SecureRandom.uuid
    self.scheduled_for ||= 48.hours.from_now
  end
end
