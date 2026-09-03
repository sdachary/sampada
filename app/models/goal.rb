# frozen_string_literal: true

class Goal < ApplicationRecord
  belongs_to :user

  ALLOCATIONS = %w[conservative moderate aggressive].freeze
  TOP_UP_FREQUENCIES = %w[none monthly quarterly yearly].freeze

  ALLOCATION_PRESETS = {
    'conservative' => { equity: 30, debt: 50, gold: 20 },
    'moderate' => { equity: 50, debt: 30, gold: 20 },
    'aggressive' => { equity: 70, debt: 20, gold: 10 }
  }.freeze

  validates :name, presence: true
  validates :target_amount, presence: true, numericality: { greater_than: 0 }
  validates :target_year, presence: true, numericality: { greater_than: 2020, less_than: 2080 }
  validates :monthly_sip, numericality: { greater_than_or_equal_to: 0 }
  validates :allocation, inclusion: { in: ALLOCATIONS }
  validates :top_up_frequency, inclusion: { in: TOP_UP_FREQUENCIES }
  validates :currency_code, inclusion: { in: Currency::CURRENCY_SYMBOLS.keys }, allow_nil: true

  def allocation_preset
    ALLOCATION_PRESETS[allocation]
  end

  def years_remaining
    [target_year - Date.current.year, 1].max
  end

  def top_up_monthly
    case top_up_frequency
    when 'monthly' then top_up_amount.to_f
    when 'quarterly' then top_up_amount.to_f / 3.0
    when 'yearly' then top_up_amount.to_f / 12.0
    else 0
    end
  end
end
