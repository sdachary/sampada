# frozen_string_literal: true

class CreatePushSubscriptions < ActiveRecord::Migration[7.2]
  def change
    create_table :push_subscriptions, id: :uuid do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.text :endpoint, null: false
      t.text :p256dh, null: false
      t.text :auth, null: false
      t.string :user_agent
      t.datetime :expires_at
      t.datetime :created_at, null: false
    end

    add_index :push_subscriptions, :endpoint, unique: true
    add_index :push_subscriptions, :expires_at
  end
end
