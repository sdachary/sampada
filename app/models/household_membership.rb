class HouseholdMembership < TenantRecord
  belongs_to :household
  belongs_to :user

  validates :role, inclusion: { in: %w[owner admin member viewer] }
  validates :invite_status, inclusion: { in: %w[pending accepted declined] }
  validates :user_id, uniqueness: { scope: :household_id }

  scope :accepted, -> { where(invite_status: 'accepted') }
  scope :pending, -> { where(invite_status: 'pending') }
end
