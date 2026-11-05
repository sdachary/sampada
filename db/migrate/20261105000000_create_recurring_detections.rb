class CreateRecurringDetections < ActiveRecord::Migration[8.1]
  def change
    create_table :recurring_detections, id: :uuid do |t|
      t.references :user, type: :uuid, null: false, foreign_key: true
      t.jsonb :suggestions, default: []
      t.string :result_version, null: false, default: 'v1'
      t.timestamps
    end

    add_index :recurring_detections, [:user_id, :result_version], unique: true
  end
end
