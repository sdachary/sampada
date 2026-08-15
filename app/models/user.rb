class User < ApplicationRecord
  has_one :tenant, dependent: :destroy
  has_many :api_credentials, dependent: :destroy
  has_many :conversations, dependent: :destroy
  has_many :consent_records, dependent: :destroy
  has_many :deletion_requests, dependent: :destroy
  has_many :grievances, dependent: :destroy
  has_many :debts, dependent: :destroy
  has_many :debt_payoffs, dependent: :destroy
  has_many :insurance_policies, dependent: :destroy
  has_many :portfolios, dependent: :destroy
  has_many :journeys, dependent: :destroy
  has_many :net_worth_snapshots, dependent: :destroy
  has_many :recurring_expenses, dependent: :destroy
  has_many :notifications, dependent: :destroy
  has_many :settings, dependent: :destroy
  has_many :budget_categories, dependent: :destroy
  has_many :budgets, dependent: :destroy
  has_many :transactions, dependent: :destroy
  has_many :trips, dependent: :destroy
  has_many :household_memberships, dependent: :destroy
  has_many :households, through: :household_memberships

  validates :email, presence: true, uniqueness: true
  validates :better_auth_user_id, uniqueness: true, allow_nil: true

  before_save :downcase_email

  scope :active, -> { where(onboarded: true) }

  def active?
    onboarded?
  end

  def should_create_net_worth_snapshot?
    # Only create for active users who have debts or investments
    active? && (debts.active.exists? || portfolios.exists?)
  end

  private

  def downcase_email
    self.email = email.downcase if email.present?
  end
end
