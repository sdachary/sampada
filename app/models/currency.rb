class Currency < TenantRecord
  validates :code, presence: true, uniqueness: true
  validates :name, presence: true

  scope :active, -> { where(active: true) }

  CURRENCY_SYMBOLS = {
    'INR' => '₹', 'USD' => '$', 'EUR' => '€', 'GBP' => '£',
    'JPY' => '¥', 'CNY' => '¥', 'AUD' => 'A$', 'CAD' => 'C$',
    'CHF' => 'Fr', 'SGD' => 'S$', 'HKD' => 'HK$', 'KRW' => '₩',
    'SEK' => 'kr', 'NOK' => 'kr', 'DKK' => 'kr', 'NZD' => 'NZ$',
    'MXN' => 'MX$', 'BRL' => 'R$', 'ZAR' => 'R', 'TRY' => '₺',
    'RUB' => '₽', 'PLN' => 'zł', 'THB' => '฿', 'IDR' => 'Rp',
    'MYR' => 'RM', 'PHP' => '₱', 'CZK' => 'Kč', 'ILS' => '₪',
    'AED' => 'د.إ', 'SAR' => '﷼', 'NGN' => '₦', 'KES' => 'KSh'
  }.freeze

  def self.symbol_for(code)
    code.present? ? (CURRENCY_SYMBOLS[code] || code) : '₹'
  end

  def symbol
    self[:symbol].presence || self.class.symbol_for(code)
  end
end
