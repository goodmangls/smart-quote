# frozen_string_literal: true

# Default margin for partner-originated quotes (BridgeLogis quote API v1): flat 24%.
#
# Matches MarginRuleResolver::DEFAULT_MARGIN, so partners are priced identically
# whether or not this rule exists — the rule exists so the rate is *visible and
# editable* in the admin Margin Rules UI instead of being buried in a constant.
#
# To change a partner's rate later: edit this rule in the admin UI, or add a
# higher-priority rule (e.g. weight-banded like the KS Ways P100 rules) matching
# the same identity. No code change or deploy required.
#
# match_email holds PartnerApiKey#margin_identity — a sentinel identity string,
# not a real mailbox. Each partner key carries its own identity, so giving one
# partner a different rate means adding one rule for that identity.
class AddPartnerApiMarginRule < ActiveRecord::Migration[8.0]
  IDENTITY = "bridgelogis@partner.quote-api"
  MARGIN_PERCENT = 24

  def up
    MarginRule.reset_column_information

    rule = MarginRule.find_or_initialize_by(match_email: IDENTITY, priority: 90)
    rule.assign_attributes(
      name: "Partner API — BridgeLogis",
      rule_type: "flat",
      margin_percent: MARGIN_PERCENT,
      weight_min: nil,
      weight_max: nil,
      is_active: true
    )
    rule.created_by = "migration:add_partner_api_margin_rule" if rule.respond_to?(:created_by=)
    rule.save!

    say "Partner API margin rule upserted: #{IDENTITY} -> #{MARGIN_PERCENT}%"
  end

  def down
    MarginRule.where(match_email: IDENTITY, priority: 90).delete_all
  end
end
