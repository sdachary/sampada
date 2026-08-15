class InsurancePolicy < TenantRecord
  belongs_to :user

  POLICY_TYPES = %w[health term_life vehicle other].freeze
  PREMIUM_FREQUENCIES = %w[monthly quarterly yearly].freeze

  validates :policy_type, inclusion: { in: POLICY_TYPES }
  validates :provider_name, presence: true
  validates :premium_amount, numericality: { greater_than_or_equal_to: 0 }
  validates :premium_frequency, inclusion: { in: PREMIUM_FREQUENCIES }
  validates :coverage_amount, numericality: { greater_than: 0 }, allow_nil: true

  scope :active, -> { where(renewal_date: nil).or(where(renewal_date: Time.zone.today..)) }
  scope :renewing_soon, -> { where(renewal_date: Time.zone.today..30.days.from_now) }
end
