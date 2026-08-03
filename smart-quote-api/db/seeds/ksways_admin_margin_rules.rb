# frozen_string_literal: true

# Idempotent upsert — safe to re-run on Render Shell:
#   bundle exec rails runner db/seeds/ksways_admin_margin_rules.rb
#
# Default Margin for KS Ways admins:
#   ≥20kg → 24%, <20kg → 32%

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
      created_by: rule.created_by.presence || "system"
    )
  )
  rule.save!
  puts "UPSERTED id=#{rule.id} #{rule.name} → #{rule.margin_percent}%"
end

cache_key = defined?(MarginRuleResolver::CACHE_KEY) ? MarginRuleResolver::CACHE_KEY : "margin_rules_active"
Rails.cache.delete(cache_key)
puts "Cache cleared (#{cache_key})."

%w[sophia@ksways.co jhlim725@gmail.com].each do |email|
  [25.0, 10.0].each do |weight|
    result = MarginRuleResolver.resolve(email: email, nationality: "KR", weight: weight)
    matched = result[:matched_rule]
    puts "VERIFY #{email} @ #{weight}kg → #{result[:margin_percent]}% (#{matched&.name})"
  end
end
