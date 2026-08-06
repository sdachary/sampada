# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.2].define(version: 2026_08_06_000000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pgcrypto"
  enable_extension "plpgsql"

  create_table "active_storage_attachments", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.uuid "record_id", null: false
    t.uuid "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "api_credentials", force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "provider", null: false
    t.string "label"
    t.text "encrypted_value", null: false
    t.jsonb "metadata", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "provider"], name: "index_api_credentials_on_user_id_and_provider", unique: true
  end

  create_table "budget_categories", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "name", null: false
    t.string "icon"
    t.string "color", default: "#6366f1"
    t.integer "sort_order", default: 0
    t.boolean "active", default: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "name"], name: "index_budget_categories_on_user_id_and_name", unique: true
  end

  create_table "budgets", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.uuid "budget_category_id", null: false
    t.decimal "monthly_limit", precision: 19, scale: 4, null: false
    t.string "currency_code", default: "INR", null: false
    t.string "period", default: "monthly"
    t.date "start_date"
    t.date "end_date"
    t.text "notes"
    t.uuid "household_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["household_id"], name: "index_budgets_on_household_id"
    t.index ["user_id", "budget_category_id"], name: "index_budgets_on_user_id_and_budget_category_id"
  end

  create_table "conversations", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "title"
    t.text "summary"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_conversations_on_user_id"
  end

  create_table "currencies", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "code", null: false
    t.string "name", null: false
    t.string "symbol", null: false
    t.integer "decimal_places", default: 2
    t.boolean "active", default: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["code"], name: "index_currencies_on_code", unique: true
  end

  create_table "debt_payoff_debts", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "debt_payoff_id", null: false
    t.uuid "debt_id", null: false
    t.index ["debt_id"], name: "index_debt_payoff_debts_on_debt_id"
    t.index ["debt_payoff_id", "debt_id"], name: "index_debt_payoff_debts_on_payoff_and_debt", unique: true
    t.index ["debt_payoff_id"], name: "index_debt_payoff_debts_on_debt_payoff_id"
  end

  create_table "debt_payoffs", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "name"
    t.string "strategy"
    t.decimal "extra_payment", precision: 19, scale: 4
    t.string "currency_code", default: "INR", null: false
    t.integer "months_saved"
    t.date "debt_free_date"
    t.decimal "total_interest_paid", precision: 19, scale: 4
    t.decimal "total_interest_saved", precision: 19, scale: 4
    t.jsonb "schedule"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_debt_payoffs_on_user_id"
  end

  create_table "debts", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "name", null: false
    t.string "category"
    t.decimal "amount", precision: 19, scale: 4, null: false
    t.decimal "interest_rate", precision: 10, scale: 3
    t.decimal "emi_amount", precision: 19, scale: 4
    t.date "due_date"
    t.string "currency_code", default: "INR", null: false
    t.uuid "household_id"
    t.string "status", default: "active"
    t.date "started_at"
    t.decimal "paid_amount", precision: 19, scale: 4, default: "0.0"
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["household_id"], name: "index_debts_on_household_id"
    t.index ["status"], name: "index_debts_on_status"
    t.index ["user_id"], name: "index_debts_on_user_id"
  end

  create_table "dividend_sips", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "portfolio_id", null: false
    t.string "name"
    t.string "currency_code", default: "INR", null: false
    t.decimal "amount", precision: 19, scale: 4, null: false
    t.string "frequency", null: false
    t.string "status", default: "active"
    t.decimal "target_income", precision: 19, scale: 4
    t.date "next_execution"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["portfolio_id"], name: "index_dividend_sips_on_portfolio_id"
    t.index ["status"], name: "index_dividend_sips_on_status"
  end

  create_table "exchange_rates", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "from_currency", null: false
    t.string "to_currency", null: false
    t.decimal "rate", precision: 19, scale: 10, null: false
    t.string "source", default: "yahoo_finance"
    t.datetime "fetched_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["from_currency", "to_currency"], name: "index_exchange_rates_on_from_currency_and_to_currency", unique: true
  end

  create_table "grievances", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "name", null: false
    t.string "email", null: false
    t.string "phone"
    t.string "grievance_type", null: false
    t.text "description", null: false
    t.string "status", default: "received", null: false
    t.string "reference_number"
    t.datetime "acknowledged_at"
    t.datetime "resolved_at"
    t.text "resolution_notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["reference_number"], name: "index_grievances_on_reference_number", unique: true
    t.index ["user_id", "status"], name: "index_grievances_on_user_id_and_status"
    t.index ["user_id"], name: "index_grievances_on_user_id"
  end

  create_table "household_memberships", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "household_id", null: false
    t.uuid "user_id", null: false
    t.string "role", default: "member"
    t.string "invite_status", default: "accepted"
    t.datetime "joined_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["household_id", "user_id"], name: "index_household_memberships_on_household_id_and_user_id", unique: true
    t.index ["user_id", "household_id"], name: "index_household_memberships_on_user_id_and_household_id"
  end

  create_table "households", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name", null: false
    t.string "currency", default: "INR"
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "investments", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "portfolio_id", null: false
    t.string "symbol"
    t.string "name"
    t.string "investment_type"
    t.string "currency_code", default: "INR", null: false
    t.string "exchange"
    t.decimal "shares", precision: 24, scale: 8
    t.decimal "buy_price", precision: 19, scale: 4
    t.decimal "current_price", precision: 19, scale: 4
    t.decimal "dividend_yield", precision: 10, scale: 4
    t.string "sector"
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["portfolio_id"], name: "index_investments_on_portfolio_id"
    t.index ["symbol"], name: "index_investments_on_symbol"
  end

  create_table "journeys", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "phase", default: "negative"
    t.string "currency_code", default: "INR", null: false
    t.date "zero_day_target"
    t.decimal "monthly_sip_goal", precision: 19, scale: 4
    t.decimal "wealth_score", precision: 10, scale: 2
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_journeys_on_user_id"
  end

  create_table "messages", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "conversation_id", null: false
    t.string "role", null: false
    t.text "content", null: false
    t.jsonb "metadata", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["conversation_id"], name: "index_messages_on_conversation_id"
  end

  create_table "net_worth_snapshots", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.date "snapshot_date", null: false
    t.decimal "total_assets", precision: 19, scale: 4
    t.decimal "total_liabilities", precision: 19, scale: 4
    t.decimal "net_worth", precision: 19, scale: 4
    t.string "currency_code", default: "INR", null: false
    t.jsonb "breakdown"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "snapshot_date"], name: "index_net_worth_snapshots_on_user_and_date", unique: true
    t.index ["user_id"], name: "index_net_worth_snapshots_on_user_id"
  end

  create_table "notifications", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "notification_type", null: false
    t.text "message", null: false
    t.boolean "read", default: false
    t.datetime "read_at"
    t.jsonb "metadata", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["read"], name: "index_notifications_on_read"
    t.index ["user_id"], name: "index_notifications_on_user_id"
  end

  create_table "portfolios", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "name", null: false
    t.string "goal"
    t.jsonb "current_allocation", default: {}
    t.decimal "risk_tolerance", precision: 3, scale: 2
    t.jsonb "target_allocation"
    t.string "currency_code", default: "INR", null: false
    t.uuid "household_id"
    t.decimal "total_value", precision: 19, scale: 4, default: "0.0"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["household_id"], name: "index_portfolios_on_household_id"
    t.index ["user_id"], name: "index_portfolios_on_user_id"
  end

  create_table "recurring_expenses", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "name", null: false
    t.decimal "amount", precision: 19, scale: 4, null: false
    t.string "frequency", null: false
    t.date "next_due_date"
    t.string "category"
    t.string "currency_code", default: "INR", null: false
    t.uuid "household_id"
    t.boolean "auto_debit", default: false
    t.boolean "active", default: true
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["active"], name: "index_recurring_expenses_on_active"
    t.index ["household_id"], name: "index_recurring_expenses_on_household_id"
    t.index ["user_id"], name: "index_recurring_expenses_on_user_id"
  end

  create_table "settings", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "key", null: false
    t.text "value"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "key"], name: "index_settings_on_user_id_and_key", unique: true
    t.index ["user_id"], name: "index_settings_on_user_id"
  end

  create_table "tenants", force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "name"
    t.text "db_url"
    t.jsonb "encrypted_api_keys", default: {}
    t.boolean "onboarding_complete", default: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_tenants_on_user_id", unique: true
  end

  create_table "transactions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.uuid "budget_category_id"
    t.string "description", null: false
    t.decimal "amount", precision: 19, scale: 4, null: false
    t.string "currency_code", default: "INR", null: false
    t.date "transaction_date", null: false
    t.string "transaction_type", default: "expense"
    t.string "merchant"
    t.text "notes"
    t.boolean "recurring", default: false
    t.string "recurring_frequency"
    t.jsonb "metadata", default: {}
    t.uuid "household_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["household_id"], name: "index_transactions_on_household_id"
    t.index ["user_id", "budget_category_id"], name: "index_transactions_on_user_id_and_budget_category_id"
    t.index ["user_id", "transaction_date"], name: "index_transactions_on_user_id_and_transaction_date"
    t.index ["user_id", "transaction_type"], name: "index_transactions_on_user_id_and_transaction_type"
  end

  create_table "trip_categories", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "trip_id", null: false
    t.string "name"
    t.decimal "budget", precision: 12, scale: 2
    t.string "color", default: "#6B7280"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["trip_id"], name: "index_trip_categories_on_trip_id"
  end

  create_table "trip_expenses", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "trip_id", null: false
    t.uuid "trip_member_id", null: false
    t.uuid "trip_category_id"
    t.decimal "amount", precision: 12, scale: 2
    t.string "description"
    t.date "expense_date"
    t.string "split_type", default: "equal"
    t.jsonb "split_details"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["trip_category_id"], name: "index_trip_expenses_on_trip_category_id"
    t.index ["trip_id"], name: "index_trip_expenses_on_trip_id"
    t.index ["trip_member_id"], name: "index_trip_expenses_on_trip_member_id"
  end

  create_table "trip_members", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "trip_id", null: false
    t.string "name", null: false
    t.string "email"
    t.string "role", default: "member"
    t.datetime "added_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["trip_id", "name"], name: "index_trip_members_on_trip_id_and_name", unique: true
    t.index ["trip_id"], name: "index_trip_members_on_trip_id"
  end

  create_table "trip_settlements", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "trip_id", null: false
    t.uuid "from_trip_member_id", null: false
    t.uuid "to_trip_member_id", null: false
    t.decimal "amount", precision: 12, scale: 2
    t.datetime "settled_at"
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["from_trip_member_id"], name: "index_trip_settlements_on_from_trip_member_id"
    t.index ["to_trip_member_id"], name: "index_trip_settlements_on_to_trip_member_id"
    t.index ["trip_id"], name: "index_trip_settlements_on_trip_id"
  end

  create_table "trips", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.string "name", null: false
    t.string "destination"
    t.date "start_date"
    t.date "end_date"
    t.string "currency", default: "INR"
    t.string "group_type", default: "friends"
    t.string "status", default: "active"
    t.decimal "total_budget", precision: 12, scale: 2
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_trips_on_user_id"
  end

  create_table "users", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "email", null: false
    t.string "password_digest"
    t.string "first_name"
    t.string "last_name"
    t.string "theme", default: "dark"
    t.string "currency", default: "INR"
    t.string "locale", default: "en"
    t.string "timezone"
    t.boolean "onboarded", default: false
    t.jsonb "preferences", default: {}
    t.jsonb "goals", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "storage_backend", default: "local", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "api_credentials", "users"
  add_foreign_key "budget_categories", "users"
  add_foreign_key "budgets", "budget_categories"
  add_foreign_key "budgets", "households"
  add_foreign_key "budgets", "users"
  add_foreign_key "conversations", "users"
  add_foreign_key "debt_payoff_debts", "debt_payoffs"
  add_foreign_key "debt_payoff_debts", "debts"
  add_foreign_key "debt_payoffs", "users"
  add_foreign_key "debts", "households"
  add_foreign_key "debts", "users"
  add_foreign_key "dividend_sips", "portfolios"
  add_foreign_key "grievances", "users"
  add_foreign_key "household_memberships", "households"
  add_foreign_key "household_memberships", "users"
  add_foreign_key "investments", "portfolios"
  add_foreign_key "journeys", "users"
  add_foreign_key "messages", "conversations"
  add_foreign_key "net_worth_snapshots", "users"
  add_foreign_key "notifications", "users"
  add_foreign_key "portfolios", "households"
  add_foreign_key "portfolios", "users"
  add_foreign_key "recurring_expenses", "households"
  add_foreign_key "recurring_expenses", "users"
  add_foreign_key "settings", "users"
  add_foreign_key "tenants", "users"
  add_foreign_key "transactions", "budget_categories"
  add_foreign_key "transactions", "households"
  add_foreign_key "transactions", "users"
  add_foreign_key "trip_categories", "trips"
  add_foreign_key "trip_expenses", "trip_categories"
  add_foreign_key "trip_expenses", "trip_members"
  add_foreign_key "trip_expenses", "trips"
  add_foreign_key "trip_members", "trips"
  add_foreign_key "trip_settlements", "trip_members", column: "from_trip_member_id"
  add_foreign_key "trip_settlements", "trip_members", column: "to_trip_member_id"
  add_foreign_key "trip_settlements", "trips"
  add_foreign_key "trips", "users"
end
