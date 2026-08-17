# frozen_string_literal: true

# The production quotes table was found without the status column default
# (2026-08-17): every INSERT relied on it, so all quote saves failed
# validation with "Status is not included in the list". Re-asserts the
# default (idempotent on databases that already carry it) and backfills any
# NULL rows.
class EnsureQuotesStatusDefault < ActiveRecord::Migration[8.0]
  def up
    change_column_default :quotes, :status, "draft"
    execute "UPDATE quotes SET status = 'draft' WHERE status IS NULL"
  end

  def down
    # Intentionally kept: removing the default would only recreate the bug.
  end
end
