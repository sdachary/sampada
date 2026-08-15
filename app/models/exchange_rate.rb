class ExchangeRate < TenantRecord
  validates :from_currency, :to_currency, :rate, :fetched_at, presence: true
  validates :rate, numericality: { greater_than: 0 }

  scope :recent, -> { where(fetched_at: 24.hours.ago..) }
  scope :stale, -> { where(fetched_at: ..24.hours.ago) }

  def recent?
    fetched_at > 24.hours.ago
  end

  def self.rate(from:, to:)
    return 1.0 if from == to

    record = find_by(from_currency: from, to_currency: to)
    return record.rate if record&.recent?

    inverse = find_by(from_currency: to, to_currency: from)
    return 1.0 / inverse.rate if inverse&.recent?

    nil
  end

  def self.convert(amount, from:, to:)
    return amount if from == to

    rate = rate(from: from, to: to)
    return nil unless rate

    (amount * rate).round(4)
  end
end
