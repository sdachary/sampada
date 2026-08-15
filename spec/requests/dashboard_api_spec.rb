# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Dashboard API', type: :request do
  let!(:user) { create(:user) }

  before do
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
  end

  describe 'GET /api/v1/dashboard' do
    it 'returns the dashboard summary with the expected JSON shape' do
      # Seed data that exercises the aggregate calculations.
      portfolio = user.portfolios.create!(name: 'P1', currency_code: 'INR')
      portfolio.investments.create!(symbol: 'A', shares: 10, current_price: 50.5, currency_code: 'INR')
      portfolio.investments.create!(symbol: 'B', shares: 2, current_price: nil, currency_code: 'INR')
      user.debts.create!(name: 'D1', amount: 1000, emi_amount: 100, status: 'active',
                         paid_amount: 200, interest_rate: 5, currency_code: 'INR')
      user.recurring_expenses.create!(name: 'R1', amount: 100, frequency: 'weekly',
                                      currency_code: 'INR', active: true)
      user.recurring_expenses.create!(name: 'R2', amount: 300, frequency: 'monthly',
                                      currency_code: 'INR', active: true)
      user.net_worth_snapshots.create!(snapshot_date: Time.zone.today, net_worth: 100, currency_code: 'INR')

      get '/api/v1/dashboard'

      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json).to include(
        'total_debt', 'total_investments', 'monthly_expenses', 'net_worth',
        'portfolio_count', 'debt_count', 'sip_count', 'unread_notifications',
        'base_currency', 'currency_symbol', 'recent_snapshots'
      )
      expect(json['total_debt']).to eq(800.0)
      expect(json['total_investments']).to eq(505.0)
      expect(json['monthly_expenses']).to eq(733.0)
      expect(json['portfolio_count']).to eq(1)
      expect(json['debt_count']).to eq(1)
      expect(json['recent_snapshots']).to be_an(Array)
    end
  end

  describe 'GET /api/v1/dashboard/projection' do
    it 'returns a 60-month projection' do
      user.debts.create!(name: 'D1', amount: 1000, emi_amount: 100, status: 'active',
                         paid_amount: 200, interest_rate: 5, currency_code: 'INR')
      get '/api/v1/dashboard/projection'
      expect(response).to have_http_status(:success)
      json = response.parsed_body
      expect(json['projection']).to be_an(Array)
      expect(json['projection'].length).to eq(60)
    end
  end

  describe 'SQL aggregate efficiency' do
    it 'computes dashboard totals without loading every row into Ruby' do
      user.portfolios.create!(name: 'P1', currency_code: 'INR').tap do |p|
        p.investments.create!(symbol: 'A', shares: 10, current_price: 50.5, currency_code: 'INR')
      end
      user.debts.create!(name: 'D1', amount: 1000, emi_amount: 100, status: 'active',
                         paid_amount: 200, interest_rate: 5, currency_code: 'INR')
      user.recurring_expenses.create!(name: 'R1', amount: 100, frequency: 'weekly',
                                      currency_code: 'INR', active: true)
      user.net_worth_snapshots.create!(snapshot_date: Time.zone.today, net_worth: 100, currency_code: 'INR')

      queries = []
      counter = lambda do |_name, _started, _finished, _unique_id, payload|
        queries << payload[:sql] if payload[:sql] && payload[:sql].strip.upcase.start_with?('SELECT')
      end
      ActiveSupport::Notifications.subscribed(counter, 'sql.active_record') do
        get '/api/v1/dashboard'
      end

      # The aggregates must be SQL SUMs, not Ruby-side .sum over loaded rows.
      aggregate_sqls = queries.grep(/COALESCE|CASE frequency|amount - paid_amount/)
      expect(aggregate_sqls).not_to be_empty
    end
  end
end
