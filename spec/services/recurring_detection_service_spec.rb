require 'rails_helper'

RSpec.describe RecurringDetectionService do
  let(:user) { create(:user) }

  def create_txn(merchant:, amount:, months_ago:, description: nil, transaction_type: 'expense')
    create(:transaction, user: user, description: description || merchant, merchant: merchant,
                          amount: amount, transaction_type: transaction_type,
                          transaction_date: months_ago.months.ago.to_date)
  end

  it 'returns nothing when there are fewer than three transactions' do
    create_txn(merchant: 'Netflix', amount: 649, months_ago: 1)
    create_txn(merchant: 'Netflix', amount: 649, months_ago: 2)
    expect(described_class.new(user).call).to eq([])
  end

  it 'detects a clean monthly subscription' do
    3.times { |i| create_txn(merchant: 'Netflix', amount: 649, months_ago: i + 1) }

    suggestions = described_class.new(user).call
    expect(suggestions.size).to eq(1)

    suggestion = suggestions.first
    expect(suggestion['frequency']).to eq('monthly')
    expect(suggestion['amount_avg']).to be_within(1).of(649)
    expect(suggestion['confidence']).to be >= 0.6
    expect(suggestion['status']).to eq('pending')
    expect(suggestion['example_tx_ids'].size).to eq(3)
    expect(suggestion['next_due_date']).to be > Time.zone.today.to_s
  end

  it 'ignores income transactions' do
    2.times { |i| create_txn(merchant: 'Salary', amount: 50_000, months_ago: i + 1, transaction_type: 'income') }
    create_txn(merchant: 'Netflix', amount: 649, months_ago: 1)
    expect(described_class.new(user).call).to eq([])
  end

  it 'groups UPI reference noise by payee' do
    3.times do |i|
      create_txn(merchant: nil, amount: 649, months_ago: i + 1,
                 description: "UPI/99887#{i}/Netflix/ref#{i}")
    end

    suggestions = described_class.new(user).call
    expect(suggestions.size).to eq(1)
    expect(suggestions.first['frequency']).to eq('monthly')
  end

  it 'skips clusters already linked to an active recurring expense' do
    expense = create(:recurring_expense, user: user, active: true)
    3.times { |i| create_txn(merchant: 'Netflix', amount: 649, months_ago: i + 1) }
    user.transactions.update_all(recurring_expense_id: expense.id)

    expect(described_class.new(user).call).to eq([])
  end

  it 'recognises a quarterly pattern' do
    [3, 6, 9].each { |m| create_txn(merchant: 'Insurance', amount: 12_000, months_ago: m) }

    suggestions = described_class.new(user).call
    expect(suggestions.first['frequency']).to eq('quarterly')
  end

  it 'accepts a cluster with a small amount spread' do
    create_txn(merchant: 'Gym', amount: 1000, months_ago: 1)
    create_txn(merchant: 'Gym', amount: 1100, months_ago: 2)
    create_txn(merchant: 'Gym', amount: 1200, months_ago: 3)

    suggestions = described_class.new(user).call
    expect(suggestions.size).to eq(1)
  end

  it 'rejects a cluster whose amounts vary too much' do
    create_txn(merchant: 'Misc', amount: 1000, months_ago: 1)
    create_txn(merchant: 'Misc', amount: 1050, months_ago: 2)
    create_txn(merchant: 'Misc', amount: 2000, months_ago: 3)

    expect(described_class.new(user).call).to eq([])
  end

  it 'skips clusters that do not repeat on a known frequency' do
    3.times { |i| create_txn(merchant: 'Odd', amount: 500, months_ago: i * 2 + 1) }

    expect(described_class.new(user).call).to eq([])
  end
end
