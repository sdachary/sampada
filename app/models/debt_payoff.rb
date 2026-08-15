class DebtPayoff < TenantRecord
  belongs_to :user
  has_many :debt_payoff_debts, dependent: :destroy
  has_many :debts, through: :debt_payoff_debts

  validates :strategy, presence: true, inclusion: { in: %w[avalanche snowball] }

  def total_debt
    debts.sum(:amount)
  end

  def active_debts
    debts.where(status: 'active')
  end
end
