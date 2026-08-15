FactoryBot.define do
  sequence(:user_email) { |n| "test#{n}@example.com" }

  factory :currency do
    code { 'INR' }
    name { 'Indian Rupee' }
    symbol { '₹' }
    decimal_places { 2 }
    active { true }
  end

  factory :exchange_rate do
    from_currency { 'USD' }
    to_currency { 'INR' }
    rate { 83.5 }
    source { 'yahoo_finance' }
    fetched_at { Time.current }
  end

  factory :debt do
    association :user
    amount { 10_000.0 }
    interest_rate { 10.0 }
    emi_amount { 500.0 }
    status { 'active' }
    name { 'Home Loan' }
    currency_code { 'INR' }
  end

  factory :insurance_policy do
    association :user
    policy_type { 'health' }
    provider_name { 'LIC Health' }
    premium_amount { 15_000.0 }
    premium_frequency { 'yearly' }
    coverage_amount { 500_000.0 }
  end

  factory :investment do
    association :portfolio
    symbol { 'ITC.NS' }
    name { 'ITC Limited' }
    investment_type { 'stock' }
    shares { 10 }
    buy_price { 100.0 }
    dividend_yield { 3.8 }
    currency_code { 'INR' }
  end

  factory :portfolio do
    association :user
    name { 'Equity Portfolio' }
    risk_tolerance { 0.5 }
    target_allocation { { 'stocks' => 60, 'bonds' => 40 } }
    currency_code { 'INR' }
  end

  factory :recurring_expense do
    association :user
    amount { 2000.0 }
    frequency { 'monthly' }
    next_due_date { Time.zone.today + 1.week }
    category { 'Rent' }
    name { 'Monthly Rent' }
    auto_debit { false }
    currency_code { 'INR' }
  end

  factory :debt_payoff do
    association :user
    strategy { 'avalanche' }
    currency_code { 'INR' }
  end

  factory :debt_payoff_debt do
    association :debt_payoff
    association :debt
  end

  factory :dividend_sip do
    association :portfolio
    name { 'Monthly SIP' }
    amount { 5000.0 }
    target_income { 10_000.0 }
    frequency { 'monthly' }
    status { 'active' }
    currency_code { 'INR' }
  end

  factory :journey do
    association :user
    zero_day_target { Time.zone.today + 5.years }
    monthly_sip_goal { 50_000.0 }
    notes { 'Wealth building journey' }
    currency_code { 'INR' }
  end

  factory :user do
    email { generate(:user_email) }
    currency { 'INR' }
    onboarded { false }
  end

  factory :notification do
    association :user
    notification_type { 'debt_milestone' }
    message { 'Test notification' }
    read { false }
  end

  factory :budget_category do
    association :user
    name { 'Food' }
    color { '#ef4444' }
    active { true }
  end

  factory :transaction do
    association :user
    description { 'Test transaction' }
    amount { 500.0 }
    transaction_type { 'expense' }
    transaction_date { Time.zone.today }
    currency_code { 'INR' }
  end

  factory :budget do
    association :user
    association :budget_category
    monthly_limit { 10_000.0 }
    currency_code { 'INR' }
    period { 'monthly' }
  end

  factory :household do
    name { 'Family' }
    currency { 'INR' }
  end

  factory :household_membership do
    association :household
    association :user
    role { 'member' }
    invite_status { 'accepted' }
    joined_at { Time.current }
  end

  factory :trip do
    association :user
    name { 'Goa Trip' }
    destination { 'Goa, India' }
    start_date { Time.zone.today }
    end_date { Time.zone.today + 7.days }
    currency { 'INR' }
    group_type { 'friends' }
    status { 'active' }
    total_budget { 50_000.0 }
  end

  factory :trip_member do
    association :trip
    sequence(:name) { |n| "Member #{n}" }
    sequence(:email) { |n| "member#{n}@example.com" }
    role { 'member' }
  end

  factory :trip_category do
    association :trip
    sequence(:name) { |n| "Category #{n}" }
    budget { 10_000.0 }
    color { '#3B82F6' }
  end

  factory :trip_expense do
    association :trip
    association :trip_member
    association :trip_category
    amount { 1000.0 }
    description { 'Dinner' }
    expense_date { Time.zone.today }
    split_type { 'equal' }
    split_details { {} }
  end

  factory :trip_settlement do
    association :trip
    association :from_member, factory: :trip_member
    association :to_member, factory: :trip_member
    amount { 500.0 }
    settled_at { Time.current }
  end
end
