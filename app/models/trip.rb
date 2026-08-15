class Trip < TenantRecord
  belongs_to :user
  has_many :trip_members, dependent: :destroy
  has_many :trip_categories, dependent: :destroy
  has_many :trip_expenses, dependent: :destroy
  has_many :trip_settlements, dependent: :destroy

  validates :name, presence: true

  scope :active, -> { where(status: 'active') }
  scope :settled, -> { where(status: 'settled') }

  after_create :seed_default_categories

  STATUSES = %w[active archived settled].freeze
  GROUP_TYPES = %w[family friends colleagues custom].freeze

  def balance_for(member)
    balances[member.id] || 0.0
  end

  def balances
    member_balances = {}
    trip_members.each { |m| member_balances[m.id] = 0 }

    trip_expenses.each do |expense|
      payer_id = expense.trip_member_id
      member_balances[payer_id] = member_balances[payer_id].to_i + expense.amount_cents
      expense.split_shares.each do |member_id, share_amount|
        member_balances[member_id] = member_balances[member_id].to_i - share_amount.to_i
      end
    end

    trip_settlements.each do |settlement|
      member_balances[settlement.from_trip_member_id] =
        member_balances[settlement.from_trip_member_id].to_i + settlement.amount_cents
      member_balances[settlement.to_trip_member_id] =
        member_balances[settlement.to_trip_member_id].to_i - settlement.amount_cents
    end

    member_balances
  end

  # Greedy algorithm to minimize total number of transfers between members
  # Returns array of { from: member_id, to: member_id, amount_cents: integer }
  def suggested_settlements
    balances_cents = balances

    # Separate creditors (positive) and debtors (negative)
    creditors = []
    debtors = []

    balances_cents.each do |member_id, balance_cents|
      next if balance_cents.zero?

      if balance_cents.positive?
        creditors << { member_id: member_id, amount: balance_cents }
      else
        debtors << { member_id: member_id, amount: -balance_cents }
      end
    end

    # Sort by amount descending (largest first)
    creditors.sort_by! { |c| -c[:amount] }
    debtors.sort_by! { |d| -d[:amount] }

    settlements = []

    creditors_idx = 0
    debtors_idx = 0

    while creditors_idx < creditors.size && debtors_idx < debtors.size
      creditor = creditors[creditors_idx]
      debtor = debtors[debtors_idx]

      transfer_amount = [creditor[:amount], debtor[:amount]].min

      settlements << {
        from: debtor[:member_id],
        to: creditor[:member_id],
        amount_cents: transfer_amount
      }

      creditor[:amount] -= transfer_amount
      debtor[:amount] -= transfer_amount

      creditors_idx += 1 if creditor[:amount].zero?
      debtors_idx += 1 if debtor[:amount].zero?
    end

    settlements
  end

  def budget_vs_actual
    trip_categories.map do |cat|
      spent = trip_expenses.where(trip_category_id: cat.id).sum(:amount).to_f
      { category: cat, budget: cat.budget.to_f, spent: spent, remaining: cat.budget.to_f - spent }
    end
  end

  def total_spent
    trip_expenses.sum(:amount).to_f
  end

  def can_settle?
    status == 'active'
  end

  private

  def seed_default_categories
    defaults = [
      { name: 'Travel', color: '#3B82F6' },
      { name: 'Commute', color: '#8B5CF6' },
      { name: 'Food', color: '#F59E0B' },
      { name: 'Stays', color: '#10B981' },
      { name: 'Activities', color: '#EC4899' },
      { name: 'Misc', color: '#6B7280' }
    ]
    defaults.each { |attrs| trip_categories.create!(attrs) }
  end
end
