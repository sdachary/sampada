class CreateWebauthnCredentials < ActiveRecord::Migration[8.1]
  def change
    create_table :webauthn_credentials, id: :uuid do |t|
      t.references :user, type: :uuid, null: false, foreign_key: true
      t.string :webauthn_id, null: false
      t.string :public_key, null: false
      t.string :label, null: false, default: "This device"
      t.bigint :sign_count, null: false, default: 0
      t.integer :transport, null: false, default: 0 # 0: platform, 1: cross_platform
      t.datetime :last_used_at
      t.timestamps
    end

    add_index :webauthn_credentials, :webauthn_id, unique: true
  end
end