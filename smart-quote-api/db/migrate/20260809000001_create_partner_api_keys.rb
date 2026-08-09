# frozen_string_literal: true

# Partner API keys for the BridgeLogis quote API (POST /api/v1/quote_api/quotes).
#
# Keys are high-entropy random tokens, so a plain SHA256 digest is sufficient and
# — unlike bcrypt — allows an indexed lookup instead of scanning every row per request.
# This matches the existing magic-link convention (User#magic_link_token_digest).
#
# margin_identity / nationality feed MarginRuleResolver so a partner's margin is
# resolved server-side from margin_rules, never from the request payload.
class CreatePartnerApiKeys < ActiveRecord::Migration[8.0]
  def change
    create_table :partner_api_keys do |t|
      t.string   :name,            null: false, limit: 100
      t.string   :key_digest,      null: false, limit: 64
      t.string   :key_prefix,      null: false, limit: 16
      t.string   :margin_identity, limit: 255
      t.string   :nationality,     limit: 100
      t.boolean  :is_active,       null: false, default: true
      t.datetime :last_used_at
      t.datetime :revoked_at

      t.timestamps
    end

    add_index :partner_api_keys, :key_digest, unique: true
    add_index :partner_api_keys, :key_prefix
    add_index :partner_api_keys, [ :is_active, :revoked_at ],
              name: "idx_partner_api_keys_usable"
  end
end
