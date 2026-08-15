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
end
