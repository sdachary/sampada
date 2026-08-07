class TripExpense < TenantRecord
  belongs_to :trip
  belongs_to :trip_member, foreign_key: :trip_member_id
  belongs_to :trip_category, optional: true

  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :description, presence: true
  validates :split_type, inclusion: { in: %w[equal percentage custom] }

  def amount_cents
    (amount * 100).round
  end

  def split_shares
    case split_type
    when "equal"
      members = trip.trip_members.count
      return {} if members.zero?
      # Convert amount to cents and divide evenly, handling remainder
      total_cents = amount_cents
      share_cents = total_cents / members
      remainder = total_cents % members
      trip.trip_members.each_with_index.with_object({}) do |(m, idx), h|
        # Distribute remainder cents to first few members
        h[m.id] = share_cents + (idx < remainder ? 1 : 0)
      end
    when "percentage"
      return {} if split_details.blank?
      total_cents = amount_cents
      split_details.transform_values do |pct|
        (total_cents * pct.to_f / 100.0).round
      end
    when "custom"
      return {} if split_details.blank?
      split_details.transform_values { |amt| (amt.to_f * 100).round }
    else
      {}
    end
  end
end
