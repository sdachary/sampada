# frozen_string_literal: true

# Drops the vestigial credential columns left over from the pre-Better-Auth
# (Kubera) auth stack, plus an email-encryption pair that was added and never
# read. Nothing in app/, lib/, config/ or spec/ references any of them
# (grep: hits only in migration history).
#
# Verified against production before dropping: all seven credential columns are
# 100% NULL across every row. `consent_granted` is `false` on every row — the
# column default, never written by any code path, and no substitute for the
# real trail in `consent_records`. Nothing recoverable is discarded.
#
# DPDP data minimisation (§8): credential material that is no longer used must
# not be retained indefinitely just because it is inert.
class DropVestigialUserCredentials < ActiveRecord::Migration[7.2]
  COLUMNS = %i[
    password_digest
    password_reset_token
    password_reset_sent_at
    refresh_token
    github_token
    encrypted_email
    encrypted_email_iv
    consent_granted
  ].freeze

  def up
    if index_exists?(:users, :password_reset_token, name: 'index_users_on_password_reset_token')
      remove_index :users, name: 'index_users_on_password_reset_token'
    end

    COLUMNS.each do |column|
      remove_column :users, column if column_exists?(:users, column)
    end
  end

  def down
    add_column :users, :password_digest, :string
    add_column :users, :password_reset_token, :string
    add_column :users, :password_reset_sent_at, :datetime
    add_column :users, :refresh_token, :text
    add_column :users, :github_token, :text
    add_column :users, :encrypted_email, :string
    add_column :users, :encrypted_email_iv, :string
    add_column :users, :consent_granted, :boolean, default: false

    add_index :users, :password_reset_token, unique: true, name: 'index_users_on_password_reset_token'
  end
end
