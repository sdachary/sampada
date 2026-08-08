class CreateInsurancePolicies < ActiveRecord::Migration[7.2]
  def change
    create_table :insurance_policies do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.string :policy_type, null: false, default: "other"
      t.string :provider_name
      t.decimal :premium_amount, precision: 12, scale: 2, default: 0.0
      t.string :premium_frequency, default: "yearly"
      t.decimal :coverage_amount, precision: 14, scale: 2
      t.date :renewal_date
      t.string :notes

      t.timestamps
    end
    add_index :insurance_policies, [:user_id, :policy_type]
  end
end
