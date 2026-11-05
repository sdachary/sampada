class RecurringDetection < TenantRecord
  belongs_to :user

  validates :result_version, presence: true
end
