-- ponytail: NUMERIC stores as float in SQLite; household-scale money; upgrade to INTEGER paise if float drift ever matters
-- PRAGMA journal_mode=WAL omitted: D1 manages WAL internally; local executor rejects it (SQLITE_AUTH)
PRAGMA foreign_keys=ON;

-- 0001_initial.sql — ported from db/schema.rb (version 2026_09_25)
-- plus merged later migrations: 20261102072525, 20261102072526,
-- 20261102072527, 20261105000000, 20261106000000, 20261106000001
-- 43 tables. schema_migrations / ar_internal_metadata intentionally omitted.

-- =========================================
-- active_storage_blobs
-- =========================================
CREATE TABLE IF NOT EXISTS active_storage_blobs (
  id TEXT PRIMARY KEY,
  byte_size INTEGER NOT NULL,
  checksum TEXT,
  content_type TEXT,
  created_at TEXT NOT NULL,
  filename TEXT NOT NULL,
  key TEXT NOT NULL,
  metadata TEXT,
  service_name TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS index_active_storage_blobs_on_key ON active_storage_blobs(key);

-- =========================================
-- currencies
-- =========================================
CREATE TABLE IF NOT EXISTS currencies (
  id TEXT PRIMARY KEY,
  active INTEGER,
  code TEXT NOT NULL,
  created_at TEXT NOT NULL,
  decimal_places INTEGER DEFAULT 2,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS index_currencies_on_code ON currencies(code);

-- =========================================
-- exchange_rates
-- =========================================
CREATE TABLE IF NOT EXISTS exchange_rates (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  from_currency TEXT NOT NULL,
  rate NUMERIC(19,10) NOT NULL,
  source TEXT DEFAULT 'yahoo_finance',
  to_currency TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS index_exchange_rates_on_from_currency_and_to_currency ON exchange_rates(from_currency, to_currency);

-- =========================================
-- households
-- =========================================
CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  currency TEXT DEFAULT 'INR',
  description TEXT,
  name TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- =========================================
-- users
-- =========================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  avatar_url TEXT,
  better_auth_user_id TEXT,
  consent_granted_at TEXT,
  created_at TEXT NOT NULL,
  currency TEXT DEFAULT 'INR',
  deleted_at TEXT,
  email TEXT NOT NULL,
  first_name TEXT,
  github_uid TEXT,
  goals TEXT,
  google_uid TEXT,
  last_name TEXT,
  locale TEXT DEFAULT 'en',
  onboarded INTEGER,
  preferences TEXT,
  storage_backend TEXT NOT NULL DEFAULT 'local',
  theme TEXT DEFAULT 'dark',
  timezone TEXT,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS index_users_on_better_auth_user_id ON users(better_auth_user_id) WHERE (better_auth_user_id IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS index_users_on_email ON users(email);

CREATE UNIQUE INDEX IF NOT EXISTS index_users_on_github_uid ON users(github_uid);

CREATE UNIQUE INDEX IF NOT EXISTS index_users_on_google_uid ON users(google_uid);

-- =========================================
-- rebalance_configs
-- =========================================
CREATE TABLE IF NOT EXISTS rebalance_configs (
  id TEXT PRIMARY KEY,
  portfolio_id TEXT NOT NULL,
  contribution NUMERIC(14,2) DEFAULT 21000.0,
  dividend_ratio NUMERIC(3,2) DEFAULT 0.6,
  growth_ratio NUMERIC(3,2) DEFAULT 0.4,
  dip_threshold NUMERIC(4,2) DEFAULT -0.10,
  dip_boost NUMERIC(4,2) DEFAULT 1.25,
  trend_down_penalty NUMERIC(4,2) DEFAULT 0.5,
  momentum_tilt NUMERIC(4,2) DEFAULT 0.25,
  max_position_weight NUMERIC(4,2) DEFAULT 0.10,
  max_sector_weight NUMERIC(4,2) DEFAULT 0.25,
  max_add_share NUMERIC(4,2) DEFAULT 0.30,
  fee_reserve_pct NUMERIC(5,3) DEFAULT 0.003,
  min_order_value NUMERIC(10,2) DEFAULT 500.0,
  max_orders INTEGER DEFAULT 8,
  target_mode TEXT DEFAULT 'equal',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- =========================================
-- sectors
-- =========================================
CREATE TABLE IF NOT EXISTS sectors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS index_sectors_on_name ON sectors(name);

-- =========================================
-- recurring_detections
-- =========================================
CREATE TABLE IF NOT EXISTS recurring_detections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  suggestions TEXT,
  result_version TEXT NOT NULL DEFAULT 'v1',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS index_recurring_detections_on_user_id_and_result_version ON recurring_detections(user_id, result_version);

-- =========================================
-- statement_imports
-- =========================================
CREATE TABLE IF NOT EXISTS statement_imports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  bank TEXT NOT NULL DEFAULT 'unknown',
  file_digest TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  result TEXT,
  error TEXT,
  confirmed_at TEXT,
  confirmed_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS index_statement_imports_on_user_id_and_file_digest ON statement_imports(user_id, file_digest);

-- =========================================
-- webauthn_credentials
-- =========================================
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  webauthn_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'This device',
  sign_count INTEGER NOT NULL DEFAULT 0,
  transport INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS index_webauthn_credentials_on_webauthn_id ON webauthn_credentials(webauthn_id);

-- =========================================
-- active_storage_attachments
-- =========================================
CREATE TABLE IF NOT EXISTS active_storage_attachments (
  id TEXT PRIMARY KEY,
  blob_id TEXT NOT NULL REFERENCES active_storage_blobs(id),
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  record_type TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS index_active_storage_attachments_on_blob_id ON active_storage_attachments(blob_id);

CREATE UNIQUE INDEX IF NOT EXISTS index_active_storage_attachments_uniqueness ON active_storage_attachments(record_type, record_id, name, blob_id);

-- =========================================
-- active_storage_variant_records
-- =========================================
CREATE TABLE IF NOT EXISTS active_storage_variant_records (
  id TEXT PRIMARY KEY,
  blob_id TEXT NOT NULL REFERENCES active_storage_blobs(id),
  variation_digest TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS index_active_storage_variant_records_uniqueness ON active_storage_variant_records(blob_id, variation_digest);

-- =========================================
-- api_credentials
-- =========================================
CREATE TABLE IF NOT EXISTS api_credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  label TEXT,
  metadata TEXT,
  provider TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS index_api_credentials_on_user_id_and_provider ON api_credentials(user_id, provider);

-- =========================================
-- budget_categories
-- =========================================
CREATE TABLE IF NOT EXISTS budget_categories (
  id TEXT PRIMARY KEY,
  active INTEGER,
  color TEXT DEFAULT '#6366f1',
  created_at TEXT NOT NULL,
  icon TEXT,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS index_budget_categories_on_user_id_and_name ON budget_categories(user_id, name);

-- =========================================
-- consent_records
-- =========================================
CREATE TABLE IF NOT EXISTS consent_records (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  feature TEXT NOT NULL,
  granted INTEGER NOT NULL,
  granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  revoked_at TEXT,
  updated_at TEXT NOT NULL,
  user_agent TEXT,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS index_consent_records_on_user_id_and_feature ON consent_records(user_id, feature);

CREATE INDEX IF NOT EXISTS index_consent_records_on_user_id ON consent_records(user_id);

-- =========================================
-- conversations
-- =========================================
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  summary TEXT,
  title TEXT,
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS index_conversations_on_user_id ON conversations(user_id);

-- =========================================
-- debt_payoffs
-- =========================================
CREATE TABLE IF NOT EXISTS debt_payoffs (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'INR',
  debt_free_date TEXT,
  extra_payment NUMERIC(19,4),
  months_saved INTEGER,
  name TEXT,
  schedule TEXT,
  strategy TEXT,
  total_interest_paid NUMERIC(19,4),
  total_interest_saved NUMERIC(19,4),
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS index_debt_payoffs_on_user_id ON debt_payoffs(user_id);

-- =========================================
-- debts
-- =========================================
CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  amount NUMERIC(19,4) NOT NULL,
  category TEXT,
  created_at TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'INR',
  due_date TEXT,
  emi_amount NUMERIC(19,4),
  household_id TEXT REFERENCES households(id),
  interest_rate NUMERIC(10,3),
  name TEXT NOT NULL,
  notes TEXT,
  paid_amount NUMERIC(19,4) DEFAULT '0.0',
  started_at TEXT,
  status TEXT DEFAULT 'active',
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS index_debts_on_household_id ON debts(household_id);

CREATE INDEX IF NOT EXISTS index_debts_on_status ON debts(status);

CREATE INDEX IF NOT EXISTS index_debts_on_user_id ON debts(user_id);

-- =========================================
-- deletion_requests
-- =========================================
CREATE TABLE IF NOT EXISTS deletion_requests (
  id TEXT PRIMARY KEY,
  cancel_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  export_data INTEGER,
  notes TEXT,
  scheduled_for TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS index_deletion_requests_on_cancel_token ON deletion_requests(cancel_token);

CREATE INDEX IF NOT EXISTS index_deletion_requests_on_user_id_and_status ON deletion_requests(user_id, status);

CREATE INDEX IF NOT EXISTS index_deletion_requests_on_user_id ON deletion_requests(user_id);

-- =========================================
-- goals
-- =========================================
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  allocation TEXT NOT NULL DEFAULT 'moderate',
  created_at TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'INR',
  debt_growth NUMERIC(5,2) DEFAULT '7.0',
  equity_growth NUMERIC(5,2) DEFAULT '12.0',
  gold_growth NUMERIC(5,2) DEFAULT '8.0',
  monthly_sip NUMERIC(19,4) NOT NULL DEFAULT '0.0',
  name TEXT NOT NULL,
  target_amount NUMERIC(19,4) NOT NULL,
  target_year INTEGER NOT NULL,
  top_up_amount NUMERIC(19,4) DEFAULT '0.0',
  top_up_frequency TEXT DEFAULT 'none',
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS index_goals_on_allocation ON goals(allocation);

CREATE INDEX IF NOT EXISTS index_goals_on_user_id ON goals(user_id);

-- =========================================
-- grievances
-- =========================================
CREATE TABLE IF NOT EXISTS grievances (
  id TEXT PRIMARY KEY,
  acknowledged_at TEXT,
  created_at TEXT NOT NULL,
  description TEXT NOT NULL,
  email TEXT NOT NULL,
  grievance_type TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  reference_number TEXT,
  resolution_notes TEXT,
  resolved_at TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS index_grievances_on_reference_number ON grievances(reference_number);

CREATE INDEX IF NOT EXISTS index_grievances_on_user_id_and_status ON grievances(user_id, status);

CREATE INDEX IF NOT EXISTS index_grievances_on_user_id ON grievances(user_id);

-- =========================================
-- household_memberships
-- =========================================
CREATE TABLE IF NOT EXISTS household_memberships (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  household_id TEXT NOT NULL REFERENCES households(id),
  invite_status TEXT DEFAULT 'accepted',
  joined_at TEXT,
  role TEXT DEFAULT 'member',
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS index_household_memberships_on_household_id_and_user_id ON household_memberships(household_id, user_id);

CREATE INDEX IF NOT EXISTS index_household_memberships_on_user_id_and_household_id ON household_memberships(user_id, household_id);

-- =========================================
-- insurance_policies
-- =========================================
CREATE TABLE IF NOT EXISTS insurance_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coverage_amount NUMERIC(14,2),
  created_at TEXT NOT NULL,
  notes TEXT,
  policy_type TEXT NOT NULL DEFAULT 'other',
  premium_amount NUMERIC(12,2) DEFAULT '0.0',
  premium_frequency TEXT DEFAULT 'yearly',
  provider_name TEXT,
  renewal_date TEXT,
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS index_insurance_policies_on_user_id_and_policy_type ON insurance_policies(user_id, policy_type);

CREATE INDEX IF NOT EXISTS index_insurance_policies_on_user_id ON insurance_policies(user_id);

-- =========================================
-- journeys
-- =========================================
CREATE TABLE IF NOT EXISTS journeys (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'INR',
  monthly_sip_goal NUMERIC(19,4),
  notes TEXT,
  phase TEXT DEFAULT 'negative',
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  wealth_score NUMERIC(10,2),
  zero_day_target TEXT
);

CREATE INDEX IF NOT EXISTS index_journeys_on_user_id ON journeys(user_id);

-- =========================================
-- net_worth_snapshots
-- =========================================
CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id TEXT PRIMARY KEY,
  breakdown TEXT,
  created_at TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'INR',
  net_worth NUMERIC(19,4),
  snapshot_date TEXT NOT NULL,
  total_assets NUMERIC(19,4),
  total_liabilities NUMERIC(19,4),
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS index_net_worth_snapshots_on_user_and_date ON net_worth_snapshots(user_id, snapshot_date);

CREATE INDEX IF NOT EXISTS index_net_worth_snapshots_on_user_id ON net_worth_snapshots(user_id);

-- =========================================
-- notifications
-- =========================================
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT,
  notification_type TEXT NOT NULL,
  read INTEGER,
  read_at TEXT,
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS index_notifications_on_read ON notifications(read);

CREATE INDEX IF NOT EXISTS index_notifications_on_user_id ON notifications(user_id);

-- =========================================
-- portfolios
-- =========================================
CREATE TABLE IF NOT EXISTS portfolios (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'INR',
  current_allocation TEXT,
  goal TEXT,
  household_id TEXT REFERENCES households(id),
  name TEXT NOT NULL,
  risk_tolerance NUMERIC(3,2),
  target_allocation TEXT,
  total_value NUMERIC(19,4) DEFAULT '0.0',
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS index_portfolios_on_household_id ON portfolios(household_id);

CREATE INDEX IF NOT EXISTS index_portfolios_on_user_id ON portfolios(user_id);

-- =========================================
-- push_subscriptions
-- =========================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  expires_at TEXT,
  p256dh TEXT NOT NULL,
  user_agent TEXT,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS index_push_subscriptions_on_endpoint ON push_subscriptions(endpoint);

CREATE INDEX IF NOT EXISTS index_push_subscriptions_on_expires_at ON push_subscriptions(expires_at);

CREATE INDEX IF NOT EXISTS index_push_subscriptions_on_user_id ON push_subscriptions(user_id);

-- =========================================
-- recurring_expenses
-- =========================================
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id TEXT PRIMARY KEY,
  active INTEGER,
  amount NUMERIC(19,4) NOT NULL,
  auto_debit INTEGER,
  category TEXT,
  created_at TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'INR',
  frequency TEXT NOT NULL,
  household_id TEXT REFERENCES households(id),
  name TEXT NOT NULL,
  next_due_date TEXT,
  notes TEXT,
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS index_recurring_expenses_on_active ON recurring_expenses(active);

CREATE INDEX IF NOT EXISTS index_recurring_expenses_on_household_id ON recurring_expenses(household_id);

CREATE INDEX IF NOT EXISTS index_recurring_expenses_on_user_id ON recurring_expenses(user_id);

-- =========================================
-- sessions
-- =========================================
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ip_address TEXT,
  revoked_at TEXT,
  token TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  user_agent TEXT,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS index_sessions_on_token ON sessions(token);

CREATE INDEX IF NOT EXISTS index_sessions_on_user_id ON sessions(user_id);

-- =========================================
-- settings
-- =========================================
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  key TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  value TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS index_settings_on_user_id_and_key ON settings(user_id, key);

CREATE INDEX IF NOT EXISTS index_settings_on_user_id ON settings(user_id);

-- =========================================
-- tenants
-- =========================================
CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  db_url TEXT,
  encrypted_api_keys TEXT,
  name TEXT,
  onboarding_complete INTEGER,
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS index_tenants_on_user_id ON tenants(user_id);

-- =========================================
-- trips
-- =========================================
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  currency TEXT DEFAULT 'INR',
  destination TEXT,
  end_date TEXT,
  group_type TEXT DEFAULT 'friends',
  name TEXT NOT NULL,
  notes TEXT,
  start_date TEXT,
  status TEXT DEFAULT 'active',
  total_budget NUMERIC(12,2),
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS index_trips_on_user_id ON trips(user_id);

-- =========================================
-- budgets
-- =========================================
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  budget_category_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'INR',
  end_date TEXT,
  household_id TEXT REFERENCES households(id),
  monthly_limit NUMERIC(19,4) NOT NULL,
  notes TEXT,
  period TEXT DEFAULT 'monthly',
  start_date TEXT,
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS index_budgets_on_household_id ON budgets(household_id);

CREATE INDEX IF NOT EXISTS index_budgets_on_user_id_and_budget_category_id ON budgets(user_id, budget_category_id);

-- =========================================
-- messages
-- =========================================
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  created_at TEXT NOT NULL,
  metadata TEXT,
  role TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS index_messages_on_conversation_id ON messages(conversation_id);

-- =========================================
-- debt_payoff_debts
-- =========================================
CREATE TABLE IF NOT EXISTS debt_payoff_debts (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL REFERENCES debts(id),
  debt_payoff_id TEXT NOT NULL REFERENCES debt_payoffs(id)
);

CREATE INDEX IF NOT EXISTS index_debt_payoff_debts_on_debt_id ON debt_payoff_debts(debt_id);

CREATE UNIQUE INDEX IF NOT EXISTS index_debt_payoff_debts_on_payoff_and_debt ON debt_payoff_debts(debt_payoff_id, debt_id);

CREATE INDEX IF NOT EXISTS index_debt_payoff_debts_on_debt_payoff_id ON debt_payoff_debts(debt_payoff_id);

-- =========================================
-- dividend_sips
-- =========================================
CREATE TABLE IF NOT EXISTS dividend_sips (
  id TEXT PRIMARY KEY,
  amount NUMERIC(19,4) NOT NULL,
  created_at TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'INR',
  frequency TEXT NOT NULL,
  name TEXT,
  next_execution TEXT,
  portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
  status TEXT DEFAULT 'active',
  target_income NUMERIC(19,4),
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS index_dividend_sips_on_portfolio_id ON dividend_sips(portfolio_id);

CREATE INDEX IF NOT EXISTS index_dividend_sips_on_status ON dividend_sips(status);

-- =========================================
-- investments
-- =========================================
CREATE TABLE IF NOT EXISTS investments (
  id TEXT PRIMARY KEY,
  buy_price NUMERIC(19,4),
  created_at TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'INR',
  current_price NUMERIC(19,4),
  dividend_yield NUMERIC(10,4),
  exchange TEXT,
  investment_type TEXT,
  name TEXT,
  notes TEXT,
  portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
  sector TEXT,
  shares NUMERIC(24,8),
  symbol TEXT,
  updated_at TEXT NOT NULL,
  instrument_sub_type TEXT NOT NULL DEFAULT 'Growth',
  rebalance_settings TEXT,
  sector_id TEXT
);

CREATE INDEX IF NOT EXISTS index_investments_on_portfolio_id ON investments(portfolio_id);

CREATE INDEX IF NOT EXISTS index_investments_on_symbol ON investments(symbol);

-- =========================================
-- transactions
-- =========================================
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  amount NUMERIC(19,4) NOT NULL,
  budget_category_id TEXT,
  created_at TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'INR',
  description TEXT NOT NULL,
  household_id TEXT REFERENCES households(id),
  merchant TEXT,
  metadata TEXT,
  notes TEXT,
  recurring INTEGER,
  recurring_frequency TEXT,
  recurring_expense_id TEXT REFERENCES recurring_expenses(id),
  transaction_date TEXT NOT NULL,
  transaction_type TEXT DEFAULT 'expense',
  updated_at TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS index_transactions_on_household_id ON transactions(household_id);

CREATE UNIQUE INDEX IF NOT EXISTS index_transactions_on_recurring_expense_due ON transactions(recurring_expense_id, transaction_date) WHERE (recurring_expense_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS index_transactions_on_user_id_and_budget_category_id ON transactions(user_id, budget_category_id);

CREATE INDEX IF NOT EXISTS index_transactions_on_user_id_and_transaction_date ON transactions(user_id, transaction_date);

CREATE INDEX IF NOT EXISTS index_transactions_on_user_id_and_transaction_type ON transactions(user_id, transaction_type);

-- =========================================
-- trip_categories
-- =========================================
CREATE TABLE IF NOT EXISTS trip_categories (
  id TEXT PRIMARY KEY,
  budget NUMERIC(12,2),
  color TEXT DEFAULT '#6B7280',
  created_at TEXT NOT NULL,
  name TEXT,
  trip_id TEXT NOT NULL REFERENCES trips(id),
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS index_trip_categories_on_trip_id ON trip_categories(trip_id);

-- =========================================
-- trip_members
-- =========================================
CREATE TABLE IF NOT EXISTS trip_members (
  id TEXT PRIMARY KEY,
  added_at TEXT,
  created_at TEXT NOT NULL,
  email TEXT,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  trip_id TEXT NOT NULL REFERENCES trips(id),
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS index_trip_members_on_trip_id_and_name ON trip_members(trip_id, name);

CREATE INDEX IF NOT EXISTS index_trip_members_on_trip_id ON trip_members(trip_id);

-- =========================================
-- trip_expenses
-- =========================================
CREATE TABLE IF NOT EXISTS trip_expenses (
  id TEXT PRIMARY KEY,
  amount NUMERIC(12,2),
  created_at TEXT NOT NULL,
  description TEXT,
  expense_date TEXT,
  split_details TEXT,
  split_type TEXT DEFAULT 'equal',
  trip_category_id TEXT,
  trip_id TEXT NOT NULL REFERENCES trips(id),
  trip_member_id TEXT NOT NULL REFERENCES trip_members(id),
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS index_trip_expenses_on_trip_category_id ON trip_expenses(trip_category_id);

CREATE INDEX IF NOT EXISTS index_trip_expenses_on_trip_id ON trip_expenses(trip_id);

CREATE INDEX IF NOT EXISTS index_trip_expenses_on_trip_member_id ON trip_expenses(trip_member_id);

-- =========================================
-- trip_settlements
-- =========================================
CREATE TABLE IF NOT EXISTS trip_settlements (
  id TEXT PRIMARY KEY,
  amount NUMERIC(12,2),
  created_at TEXT NOT NULL,
  from_trip_member_id TEXT NOT NULL REFERENCES trip_members(id),
  notes TEXT,
  settled_at TEXT,
  to_trip_member_id TEXT NOT NULL REFERENCES trip_members(id),
  trip_id TEXT NOT NULL REFERENCES trips(id),
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS index_trip_settlements_on_from_trip_member_id ON trip_settlements(from_trip_member_id);

CREATE INDEX IF NOT EXISTS index_trip_settlements_on_to_trip_member_id ON trip_settlements(to_trip_member_id);

CREATE INDEX IF NOT EXISTS index_trip_settlements_on_trip_id ON trip_settlements(trip_id);
