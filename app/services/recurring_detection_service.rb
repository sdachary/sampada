# frozen_string_literal: true

# Scans a user's expense transactions and proposes recurring expenses.
# Pure and synchronous: one query plus an in-memory pass.
# ponytail: sync run — move to a job only if p95 exceeds 250 ms
class RecurringDetectionService
  class SyncLimitError < StandardError
    def initialize(message = 'too many transactions to scan synchronously')
      super
    end
  end

  RESULT_VERSION = 'v1'
  MIN_OCCURRENCES = 3
  MAX_TRANSACTIONS = 50_000
  LOOKBACK_MONTHS = 12
  MIN_CONFIDENCE = 0.6
  MAX_CV = 0.2
  OUTLIER_TOLERANCE = 0.25

  # frequency => [min_gap_days, max_gap_days, nominal_gap_days]
  FREQUENCY_BANDS = {
    'daily' => [0, 2, 1],
    'weekly' => [5, 9, 7],
    'monthly' => [28, 32, 30],
    'quarterly' => [88, 95, 91],
    'yearly' => [355, 375, 365]
  }.freeze

  def initialize(user)
    @user = user
  end

  # Array of suggestion hashes with string keys:
  # merchant_norm, name, amount_avg, amount_sd, frequency, next_due_date,
  # example_tx_ids, confidence, status
  def call
    rows = transactions
    raise SyncLimitError if rows.size > MAX_TRANSACTIONS

    suggestions = group_by_merchant(rows).filter_map do |merchant, group|
      build_suggestion(merchant, group)
    end

    suggestions.select { |s| s['confidence'] >= MIN_CONFIDENCE }
                .sort_by { |s| -s['confidence'] }
  end

  private

  def transactions
    @user.transactions
         .where(transaction_type: 'expense')
         .where(transaction_date: LOOKBACK_MONTHS.months.ago.to_date..)
         .includes(:recurring_expense)
         .order(:transaction_date)
  end

  def group_by_merchant(rows)
    rows.group_by { |t| normalize(t.merchant.presence || t.description) }
        .select { |_merchant, group| group.size >= MIN_OCCURRENCES }
  end

  def normalize(raw)
    text = raw.to_s.downcase.strip
    if text.start_with?('upi/')
      parts = text.split('/')
      text = parts[2].to_s if parts.size >= 3
    end
    text = text.gsub(/x{2,}\d+/, 'x')
    text = text.gsub(/\d+/, ' ')
    text = text.gsub(/[^a-z\s]/, ' ')
    text.split.join(' ')
  end

  def build_suggestion(merchant, group)
    return nil if group.any? { |t| t.recurring_expense&.active? }

    gaps = group.each_cons(2).map { |a, b| (b.transaction_date - a.transaction_date).to_i }
    band = FREQUENCY_BANDS.find { |_name, (min_gap, max_gap, _nominal)| median(gaps).between?(min_gap, max_gap) }
    return nil unless band

    frequency, (min_gap, max_gap, nominal) = band
    median_gap = median(gaps)

    amounts = group.map { |t| t.amount.to_f }
    median_amount = median(amounts)
    kept = amounts.select { |a| (a - median_amount).abs <= OUTLIER_TOLERANCE * median_amount }
    return nil if kept.size < MIN_OCCURRENCES

    mean = kept.sum / kept.size
    sd = standard_deviation(kept)
    cv = mean.zero? ? 1.0 : sd / mean
    return nil if cv > MAX_CV

    frequency_fit = frequency_fit(median_gap, min_gap, max_gap, nominal)
    amount_score = (1.0 - cv).clamp(0.0, 1.0)
    regularity = (1.0 - (standard_deviation(gaps) / median_gap)).clamp(0.0, 1.0)
    confidence = (0.4 * frequency_fit + 0.3 * amount_score + 0.3 * regularity).round(3)

    {
      'merchant_norm' => merchant,
      'name' => display_name(group, merchant),
      'amount_avg' => mean.round(2),
      'amount_sd' => sd.round(2),
      'frequency' => frequency,
      'next_due_date' => next_due_date(group.last.transaction_date, median_gap.round).iso8601,
      'example_tx_ids' => group.map(&:id),
      'confidence' => confidence,
      'status' => 'pending'
    }
  end

  def median(values)
    return 0.0 if values.empty?

    sorted = values.sort
    mid = sorted.size / 2
    sorted.size.odd? ? sorted[mid].to_f : (sorted[mid - 1].to_f + sorted[mid].to_f) / 2
  end

  def standard_deviation(values)
    return 0.0 if values.empty?

    mean = values.sum / values.size
    Math.sqrt(values.sum { |v| (v - mean)**2 } / values.size)
  end

  # 1.0 at the nominal gap, decaying to 0.5 at the band edge.
  def frequency_fit(gap, min_gap, max_gap, nominal)
    half = [nominal - min_gap, max_gap - nominal].max
    return 1.0 if half.zero?

    (1.0 - ((gap - nominal).abs / half) * 0.5).clamp(0.5, 1.0)
  end

  def next_due_date(last_date, gap)
    due = last_date + gap
    due += gap while due <= Time.zone.today
    due
  end

  # The most frequent raw merchant in the cluster; otherwise the normalized name, humanized.
  def display_name(group, merchant_norm)
    counts = group.map { |t| t.merchant.presence }.compact.tally
    return counts.max_by { |_name, count| count }.first if counts.any?

    merchant_norm.split.map(&:capitalize).join(' ')
  end
end
