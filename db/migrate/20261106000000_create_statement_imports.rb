class CreateStatementImports < ActiveRecord::Migration[8.1]
  def change
    create_table :statement_imports, id: :uuid do |t|
      t.references :user, type: :uuid, null: false, foreign_key: true
      t.string :status, null: false, default: 'queued'
      t.string :bank, null: false, default: 'unknown'
      t.string :file_digest, null: false
      t.integer :file_size, null: false
      t.jsonb :result, default: {}
      t.jsonb :error, default: {}
      t.datetime :confirmed_at
      t.integer :confirmed_count, null: 0, default: 0
      t.timestamps
    end

    add_index :statement_imports, [:user_id, :file_digest], unique: true
  end
end
