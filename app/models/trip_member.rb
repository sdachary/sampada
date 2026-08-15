class TripMember < TenantRecord
  belongs_to :trip
  has_many :paid_expenses, class_name: 'TripExpense', inverse_of: :trip_member,
                           dependent: :destroy
  has_many :settlements_paid, class_name: 'TripSettlement', foreign_key: :from_trip_member_id,
                              inverse_of: :from_member, dependent: :destroy
  has_many :settlements_received, class_name: 'TripSettlement', foreign_key: :to_trip_member_id,
                                  inverse_of: :to_member, dependent: :destroy

  validates :name, presence: true
  validates :name, uniqueness: { scope: :trip_id, message: 'already added to this trip' }
end
