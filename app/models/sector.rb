class Sector < TenantRecord
  has_many :investments, dependent: :nullify

  validates :name, presence: true, uniqueness: { case_sensitive: false }
  validates :color, presence: true

  def self.for_select
    order(:name).pluck(:name, :id)
  end

  def self.ransackable_attributes(_auth_object = nil)
    %w[name color created_at updated_at]
  end
end