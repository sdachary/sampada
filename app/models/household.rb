class Household < TenantRecord
  has_many :household_memberships, dependent: :destroy
  has_many :members, through: :household_memberships, source: :user
  has_many :debts, dependent: :nullify
  has_many :portfolios, dependent: :nullify
  has_many :recurring_expenses, dependent: :nullify
  has_many :transactions, dependent: :nullify
  has_many :budgets, dependent: :nullify

  validates :name, presence: true

  def owner
    household_memberships.find_by(role: 'owner')&.user
  end

  def member?(user)
    household_memberships.accepted.exists?(user: user)
  end

  def add_member(user, role: 'member', invite_status: 'pending')
    household_memberships.create!(user: user, role: role, invite_status: invite_status, joined_at: Time.current)
  end

  def pending_invites
    household_memberships.pending.includes(:user)
  end
end
