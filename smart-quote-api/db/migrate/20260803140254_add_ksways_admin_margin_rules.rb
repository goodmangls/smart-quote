# frozen_string_literal: true

# Upsert KS Ways admin per-user Default Margin (P100 weight-based):
# ≥20kg → 24%, <20kg → 32%
# Targets: sophia@ksways.co, jhlim725@gmail.com
class AddKswaysAdminMarginRules < ActiveRecord::Migration[7.1]
  RULES = [
    { name: "KS Ways Sophia ≥20kg", rule_type: "weight_based", priority: 100,
      match_email: "sophia@ksways.co", weight_min: 20, weight_max: nil, margin_percent: 24 },
    { name: "KS Ways Sophia <20kg", rule_type: "weight_based", priority: 100,
      match_email: "sophia@ksways.co", weight_min: 0, weight_max: 19.99, margin_percent: 32 },
    { name: "KS Ways jhlim725 ≥20kg", rule_type: "weight_based", priority: 100,
      match_email: "jhlim725@gmail.com", weight_min: 20, weight_max: nil, margin_percent: 24 },
    { name: "KS Ways jhlim725 <20kg", rule_type: "weight_based", priority: 100,
      match_email: "jhlim725@gmail.com", weight_min: 0, weight_max: 19.99, margin_percent: 32 }
  ].freeze

  def up
    # Guard: schema.rb에는 있지만 프로덕션 DB에 created_by 컬럼이 없는 drift 대응
    unless column_exists?(:margin_rules, :created_by)
      add_column :margin_rules, :created_by, :string, limit: 255
    end
    MarginRule.reset_column_information

    now = Time.current
    RULES.each do |attrs|
      rule = MarginRule.find_or_initialize_by(
        match_email: attrs[:match_email],
        weight_min: attrs[:weight_min],
        priority: 100
      )
      rule.assign_attributes(
        attrs.merge(
          match_nationality: nil,
          is_active: true,
          created_by: rule.created_by.presence || "system",
          updated_at: now
        )
      )
      rule.created_at ||= now
      rule.save!
    end

    Rails.cache.delete("margin_rules_active") if defined?(Rails.cache)
    say "[MIGRATION] Upserted KS Ways admin margin rules (24%/32%). Total active: #{MarginRule.active.count}"
  end

  def down
    %w[sophia@ksways.co jhlim725@gmail.com].each do |email|
      MarginRule.where(match_email: email, priority: 100).find_each(&:destroy!)
    end
    Rails.cache.delete("margin_rules_active") if defined?(Rails.cache)
  end
end
