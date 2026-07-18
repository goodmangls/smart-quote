class RemoveMagicLinkTokenFromUsers < ActiveRecord::Migration[8.0]
  def change
    # Plaintext magic_link_token is unused after digest migration (20260410203543).
    # Auth verifies via magic_link_token_digest + secure_compare only.
    remove_index :users, :magic_link_token if index_exists?(:users, :magic_link_token)
    remove_column :users, :magic_link_token, :string if column_exists?(:users, :magic_link_token)
  end
end
