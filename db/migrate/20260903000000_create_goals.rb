# frozen_string_literal: true

class CreateGoals < ActiveRecord::Migration[7.2]
  def change
    create_table :goals, id: :uuid, default: -> { 'gen_random_uuid()' } do |t|
      t.references :user, type: :uuid, foreign_key: true, null: false
      t.string :name, null: false
      t.decimal :target_amount, precision: 19, scale: 4, null: false
      t.integer :target_year, null: false
      t.string :currency_code, default: 'INR', null: false
      t.decimal :monthly_sip, precision: 19, scale: 4, default: 0, null: false
      t.decimal :top_up_amount, precision: 19, scale: 4, default: 0
      t.string :top_up_frequency, default: 'none'
      t.string :allocation, default: 'moderate', null: false
      t.decimal :equity_growth, precision: 5, scale: 2, default: 12.0
      t.decimal :debt_growth, precision: 5, scale: 2, default: 7.0
      t.decimal :gold_growth, precision: 5, scale: 2, default: 8.0
      t.timestamps
    end

    add_index :goals, :allocation
  end
end
