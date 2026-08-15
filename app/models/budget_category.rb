class BudgetCategory < TenantRecord
  belongs_to :user
  has_many :transactions, dependent: :nullify
  has_many :budgets, dependent: :destroy

  validates :name, presence: true, uniqueness: { scope: :user_id }

  scope :active, -> { where(active: true) }
  scope :ordered, -> { order(sort_order: :asc, name: :asc) }

  DEFAULT_CATEGORIES = %w[
    Food Transport Utilities Rent Entertainment Healthcare
    Shopping Education Insurance Savings Investment Income
    Salary Freelance Business Other
  ].freeze

  def self.seed_for(user)
    DEFAULT_CATEGORIES.each_with_index do |name, i|
      find_or_create_by!(user: user, name: name) do |c|
        c.sort_order = i
        c.color = category_colors[i % category_colors.length]
        c.icon = category_icons[name]
      end
    end
  end

  def self.category_colors
    %w[#ef4444 #f97316 #eab308 #22c55e #14b8a6 #06b6d4 #6366f1 #a855f7 #ec4899 #f43f5e]
  end

  def self.category_icons
    {
      'Food' => 'utensils', 'Transport' => 'car', 'Utilities' => 'bolt',
      'Rent' => 'home', 'Entertainment' => 'film', 'Healthcare' => 'heart-pulse',
      'Shopping' => 'shopping-bag', 'Education' => 'graduation-cap',
      'Insurance' => 'shield', 'Savings' => 'piggy-bank',
      'Investment' => 'trending-up', 'Income' => 'wallet',
      'Salary' => 'briefcase', 'Freelance' => 'laptop', 'Business' => 'building',
      'Other' => 'more-horizontal'
    }
  end

  def monthly_spending(user_id, year: Time.zone.today.year, month: Time.zone.today.month)
    transactions.where(user_id: user_id)
                .where('EXTRACT(YEAR FROM transaction_date) = ? AND EXTRACT(MONTH FROM transaction_date) = ?', year, month)
                .sum(:amount)
  end

  def period_spending(user_id, start_date, end_date)
    transactions.where(user_id: user_id)
                .where(transaction_date: start_date..end_date)
                .sum(:amount)
  end
end
