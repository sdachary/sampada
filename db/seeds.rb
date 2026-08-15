# Kubera Seeds — v2.0 Multi-Currency
#
# Run: bin/rails db:seed
# Idempotent: safe to run multiple times.

CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimal_places: 2 },
  { code: 'USD', name: 'US Dollar', symbol: '$', decimal_places: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimal_places: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimal_places: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimal_places: 0 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimal_places: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimal_places: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimal_places: 2 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', decimal_places: 2 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimal_places: 2 },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimal_places: 2 },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', decimal_places: 0 },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimal_places: 2 },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimal_places: 2 },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimal_places: 2 },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimal_places: 2 },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', decimal_places: 2 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimal_places: 2 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimal_places: 2 },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', decimal_places: 2 },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', decimal_places: 2 },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', decimal_places: 2 },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', decimal_places: 2 },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimal_places: 0 },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimal_places: 2 },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', decimal_places: 2 },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', decimal_places: 2 },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', decimal_places: 2 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimal_places: 2 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', decimal_places: 2 },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', decimal_places: 2 },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', decimal_places: 2 }
].freeze

Rails.logger.debug '🌍 Seeding currencies...'
CURRENCIES.each do |attrs|
  Currency.find_or_create_by!(code: attrs[:code]) do |c|
    c.name = attrs[:name]
    c.symbol = attrs[:symbol]
    c.decimal_places = attrs[:decimal_places]
  end
end
Rails.logger.debug { "✅ #{Currency.count} currencies seeded." }

# Update existing users to have a valid currency reference
Rails.logger.debug '👤 Updating existing users...'
User.find_each do |user|
  user.update_column(:currency, 'INR') unless Currency.exists?(code: user.currency)
  user.update_column(:currency, 'USD') unless Currency.exists?(code: user.currency)
end
Rails.logger.debug '✅ Users updated.'

# Seed budget categories for existing users
Rails.logger.debug '📂 Seeding budget categories...'
User.find_each do |user|
  BudgetCategory.seed_for(user)
end
Rails.logger.debug { "✅ #{BudgetCategory.count} budget categories seeded." }

# ── Demo User ──
demo_email = 'demo@kubera.app'
demo = User.find_or_initialize_by(email: demo_email)
if demo.new_record?
  demo.assign_attributes(
    first_name: 'Demo',
    last_name: 'User',
    password: 'demo123!',
    currency: 'INR',
    onboarded: true
  )
  demo.save!
  BudgetCategory.seed_for(demo)
  Rails.logger.debug { "👤 Demo user created: #{demo_email} / demo123!" }
else
  Rails.logger.debug '👤 Demo user already exists.'
end

# Budget envelopes for demo user
demo.reload
envelopes = [
  { category: 'Food', limit: 15_000 },
  { category: 'Transport', limit: 5000 },
  { category: 'Rent', limit: 25_000 },
  { category: 'Entertainment', limit: 5000 },
  { category: 'Healthcare', limit: 8000 },
  { category: 'Shopping', limit: 10_000 },
  { category: 'Savings', limit: 20_000 }
]
cat_map = demo.budget_categories.ordered.index_by(&:name)
envelopes.each do |e|
  cat = cat_map[e[:category]]
  next unless cat

  Budget.find_or_create_by!(user: demo, budget_category: cat, period: 'monthly') do |b|
    b.monthly_limit = e[:limit]
  end
end
Rails.logger.debug { "📂 #{Budget.where(user: demo).count} budget envelopes seeded." }

# Sample transactions for demo (current month, various amounts)
cats = demo.budget_categories.ordered.to_a
tx_descs = {
  'Food' => ['Groceries', 'Zomato order', 'Lunch', 'Dinner out', 'Cafe'],
  'Transport' => ['Fuel', 'Metro pass', 'Auto ride', 'Cab'],
  'Rent' => ['Monthly rent'],
  'Entertainment' => ['Netflix', 'Movie tickets', 'Game purchase', 'Concert'],
  'Healthcare' => ['Pharmacy', 'Doctor visit', 'Health checkup'],
  'Shopping' => ['Amazon order', 'Clothes', 'Electronics', 'Home decor'],
  'Savings' => ['Monthly savings transfer']
}
cats.each do |cat|
  descs = tx_descs[cat.name] || ["Misc #{cat.name}"]
  descs.each do |desc|
    next if demo.transactions.exists?(description: desc,
                                      transaction_date: Time.zone.today.beginning_of_month..Time.zone.today)

    demo.transactions.create!(
      budget_category: cat,
      description: desc,
      amount: rand(200..3000),
      transaction_type: 'expense',
      transaction_date: Time.zone.today.beginning_of_month + rand(0..[Time.zone.today.day - 1, 1].max).days
    )
  end
end
Rails.logger.debug { "💳 #{Transaction.where(user_id: demo.id).count} sample transactions seeded." }

# Sample portfolio + investments
port = demo.portfolios.find_or_create_by!(name: 'Growth Portfolio') do |p|
  p.goal = 'growth'
  p.risk_tolerance = 0.7
end
sample_stocks = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', exchange: 'NSE', shares: 10, buy_price: 2500,
    investment_type: 'stock' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy', exchange: 'NSE', shares: 5, buy_price: 3800, investment_type: 'stock' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', exchange: 'NSE', shares: 20, buy_price: 1600, investment_type: 'stock' },
  { symbol: 'AAPL', name: 'Apple Inc', exchange: 'NASDAQ', shares: 3, buy_price: 180, investment_type: 'stock',
    currency_code: 'USD' }
]
sample_stocks.each do |s|
  next if port.investments.exists?(symbol: s[:symbol])

  port.investments.create!(s.merge(current_price: s[:buy_price] * 1.1))
end
Rails.logger.debug { "📈 #{port.investments.count} sample investments seeded." }

# Demo journey
demo.journeys.find_or_create_by!(phase: 'positive') do |j|
  j.monthly_sip_goal = 50_000
  j.zero_day_target = Time.zone.today + 365
end
Rails.logger.debug '🎯 Demo journey seeded.'

# Net worth snapshot
NetWorthSnapshot.find_or_create_by!(user: demo, snapshot_date: Time.zone.today) do |n|
  n.total_assets = 2_500_000
  n.total_liabilities = 500_000
  n.net_worth = 2_000_000
  n.breakdown = { cash: 500_000, stocks: 1_200_000, mutual_funds: 800_000, property: 0,
                  liabilities: { credit_card: 100_000, loan: 400_000 } }
end
Rails.logger.debug '💰 Demo net worth snapshot seeded.'
