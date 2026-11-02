class AddInstrumentSubTypeAndRebalanceSettingsToInvestments < ActiveRecord::Migration[8.1]
  def change
    add_column :investments, :instrument_sub_type, :string, default: 'Growth'
    add_column :investments, :rebalance_settings, :jsonb, default: {}

    # Backfill instrument_sub_type based on dividend_yield
    reversible do |dir|
      dir.up do
        execute <<-SQL
          UPDATE investments
          SET instrument_sub_type = CASE
            WHEN dividend_yield IS NOT NULL AND dividend_yield > 0 THEN 'Dividend'
            ELSE 'Growth'
          END
        SQL
      end
    end

    change_column_null :investments, :instrument_sub_type, false
  end
end