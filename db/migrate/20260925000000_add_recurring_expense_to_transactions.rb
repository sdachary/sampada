class AddRecurringExpenseToTransactions < ActiveRecord::Migration[8.1]
  def change
    add_column :transactions, :recurring_expense_id, :uuid
    add_index :transactions, [:recurring_expense_id, :transaction_date],
              unique: true, name: 'index_transactions_on_recurring_expense_due',
              where: 'recurring_expense_id IS NOT NULL'
    add_foreign_key :transactions, :recurring_expenses
  end
end