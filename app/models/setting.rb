# frozen_string_literal: true

class Setting < TenantRecord
  belongs_to :user

  validates :key, presence: true, uniqueness: { scope: :user_id }

  def self.get(key, user:)
    find_by(user: user, key: key)&.value
  end

  def self.set(key, value, user:)
    setting = find_or_initialize_by(user: user, key: key)
    setting.update!(value: value.to_s)
    setting
  end
end
