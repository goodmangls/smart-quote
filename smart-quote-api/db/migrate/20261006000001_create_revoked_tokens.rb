# frozen_string_literal: true

# JWT jti denylist. It used to live in Rails.cache, which production runs as
# :memory_store — every redeploy and free-plan spin-down emptied it, so a
# logged-out or rotated refresh token became valid again for up to 7 days.
class CreateRevokedTokens < ActiveRecord::Migration[8.0]
  def change
    create_table :revoked_tokens do |t|
      t.string :jti, null: false
      t.datetime :expires_at, null: false
      t.datetime :created_at, null: false
    end
    add_index :revoked_tokens, :jti, unique: true
    add_index :revoked_tokens, :expires_at
  end
end
