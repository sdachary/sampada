require 'rails_helper'

RSpec.describe 'Recurring detection API', type: :request do
  let!(:user) { create(:user) }

  before do
    allow_any_instance_of(Api::BaseController).to receive(:current_user).and_return(user)
  end

  def monthly_transactions(merchant: 'Netflix', amount: 649)
    3.times do |i|
      create(:transaction, user: user, description: merchant, merchant: merchant,
                            amount: amount, transaction_date: (i + 1).months.ago.to_date)
    end
  end

  it 'is 501 while the feature flag is off' do
    FeatureFlags.disable('recurring_detection', user: user)
    post '/api/v1/recurring_detection/detect'
    expect(response).to have_http_status(:not_implemented)
  end

  it 'runs a detection and returns suggestions' do
    monthly_transactions
    post '/api/v1/recurring_detection/detect'
    expect(response).to have_http_status(:success)
    expect(response.parsed_body['suggestions'].size).to eq(1)
    expect(response.parsed_body['suggestions'].first['frequency']).to eq('monthly')
  end

  it 'saves the suggestions for later review' do
    monthly_transactions
    post '/api/v1/recurring_detection/detect'
    get '/api/v1/recurring_detection'
    expect(response).to have_http_status(:success)
    expect(response.parsed_body['suggestions'].size).to eq(1)
  end

  it '409s a second run while suggestions are pending' do
    monthly_transactions
    post '/api/v1/recurring_detection/detect'
    post '/api/v1/recurring_detection/detect'
    expect(response).to have_http_status(:conflict)
  end

  it 're-runs when forced' do
    monthly_transactions
    post '/api/v1/recurring_detection/detect'
    post '/api/v1/recurring_detection/detect', params: { force: true }
    expect(response).to have_http_status(:success)
  end

  it 'accepts a suggestion, creating the recurring expense and linking the transactions' do
    monthly_transactions
    post '/api/v1/recurring_detection/detect'
    put '/api/v1/recurring_detection/suggestions/0', params: { status: 'accepted' }

    expect(response).to have_http_status(:success)
    expense = user.recurring_expenses.last
    expect(expense.amount.to_f).to be_within(1).of(649)
    expect(expense.frequency).to eq('monthly')
    expect(user.transactions.where(recurring_expense_id: expense.id).count).to eq(3)
  end

  it '409s a double accept' do
    monthly_transactions
    post '/api/v1/recurring_detection/detect'
    put '/api/v1/recurring_detection/suggestions/0', params: { status: 'accepted' }
    put '/api/v1/recurring_detection/suggestions/0', params: { status: 'accepted' }
    expect(response).to have_http_status(:conflict)
  end

  it 'rejects a suggestion without creating anything' do
    monthly_transactions
    post '/api/v1/recurring_detection/detect'
    put '/api/v1/recurring_detection/suggestions/0', params: { status: 'rejected' }

    expect(response).to have_http_status(:success)
    expect(user.recurring_expenses.count).to eq(0)
  end
end
