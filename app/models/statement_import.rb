class StatementImport < TenantRecord
  belongs_to :user
  has_one_attached :source_file

  STATUSES = %w[queued processing done failed].freeze

  validates :status, inclusion: { in: STATUSES }
  validates :file_digest, :file_size, presence: true
end
