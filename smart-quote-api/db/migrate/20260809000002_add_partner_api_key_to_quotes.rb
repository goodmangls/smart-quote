# frozen_string_literal: true

# Attribute partner-originated quotes to the API key that created them.
#
# quotes.user_id stays NULL for these rows (belongs_to :user is already optional),
# so partner volume can be aggregated with a plain SQL filter rather than digging
# through audit_logs.metadata jsonb.
class AddPartnerApiKeyToQuotes < ActiveRecord::Migration[8.0]
  def change
    add_reference :quotes, :partner_api_key, null: true, foreign_key: true, index: true
  end
end
