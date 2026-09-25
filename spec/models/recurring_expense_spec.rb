require 'rails_helper'

RSpec.describe RecurringExpense, type: :model do
  it { is_expected.to validate_presence_of(:frequency) }
  it { is_expected.to validate_presence_of(:amount) }

  describe 'validations' do
    it 'is valid with valid attributes' do
      expense = build(:recurring_expense)
      expect(expense).to be_valid
    end

    it 'is invalid without frequency' do
      expense = build(:recurring_expense, frequency: nil)
      expect(expense).not_to be_valid
      expect(expense.errors[:frequency]).to include("can't be blank")
    end

    it 'is invalid without amount' do
      expense = build(:recurring_expense, amount: nil)
      expect(expense).not_to be_valid
      expect(expense.errors[:amount]).to include("can't be blank")
    end

    it 'accepts valid frequencies' do
      %w[daily weekly monthly yearly].each do |freq|
        expense = build(:recurring_expense, frequency: freq)
        expect(expense).to be_valid
      end
    end
  end

  describe 'attributes' do
    it 'has name attribute' do
      expense = create(:recurring_expense, name: 'Monthly Rent')
      expect(expense.name).to eq('Monthly Rent')
    end

    it 'has next_due_date attribute' do
      date = Time.zone.today + 1.week
      expense = create(:recurring_expense, next_due_date: date)
      expect(expense.next_due_date).to eq(date)
    end

    it 'has category attribute' do
      expense = create(:recurring_expense, category: 'Utilities')
      expect(expense.category).to eq('Utilities')
    end

    it 'has auto_debit attribute' do
      expense = create(:recurring_expense, auto_debit: true)
      expect(expense.auto_debit).to be true
    end
  end

  describe '#log_due_transaction!' do
    it 'creates an expense transaction dated on the due date and advances next_due_date' do
      expense = create(:recurring_expense, auto_debit: true, next_due_date: Time.zone.today, amount: 1200.0)
      expect { expense.log_due_transaction! }.to change { Transaction.count }.by(1)
      txn = expense.transactions.last
      expect(txn.transaction_type).to eq('expense')
      expect(txn.description).to eq(expense.name)
      expect(txn.amount).to eq(1200.0)
      expect(txn.transaction_date).to eq(Time.zone.today)
      expect(expense.reload.next_due_date).to eq(Time.zone.today.next_month)
    end

    it 'is idempotent across repeated runs' do
      expense = create(:recurring_expense, auto_debit: true, next_due_date: Time.zone.today)
      3.times { expense.log_due_transaction! }
      expect(expense.transactions.count).to eq(1)
    end

    it 'does nothing for a future due date' do
      expense = create(:recurring_expense, auto_debit: true, next_due_date: Time.zone.today + 3.days)
      expect { expense.log_due_transaction! }.not_to change { Transaction.count }
    end

    it 'does nothing when auto_debit is off' do
      expense = create(:recurring_expense, auto_debit: false, next_due_date: Time.zone.today)
      expect { expense.log_due_transaction! }.not_to change { Transaction.count }
    end

    it 'does nothing when inactive' do
      expense = create(:recurring_expense, auto_debit: true, active: false, next_due_date: Time.zone.today)
      expect { expense.log_due_transaction! }.not_to change { Transaction.count }
    end
  end
end
