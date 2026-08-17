# frozen_string_literal: true

module Calculators
  # Shared helpers for the carrier add-on mirrors (UpsAddon / DhlAddon /
  # FedexAddon). Each module mirrors its frontend counterpart; the pieces that
  # are carrier-independent live here so the mirrors cannot drift apart.
  module CarrierAddonSupport
    # Mirrors the +10/+10/+15 cm and weight buffer applied inline in
    # Calculators::ItemCost#call and applyPackingDimensions on the frontend.
    # A divergence here silently shifts which packages trip add-on thresholds.
    PACKING_DIM_ADDITIONS = { length: 10, width: 10, height: 15 }.freeze

    module_function

    def packed_dimensions(item, packing_type)
      l = item[:length].to_f
      w = item[:width].to_f
      h = item[:height].to_f
      weight = item[:weight].to_f
      return { l: l, w: w, h: h, weight: weight } if packing_type == "NONE"

      {
        l: l + PACKING_DIM_ADDITIONS[:length],
        w: w + PACKING_DIM_ADDITIONS[:width],
        h: h + PACKING_DIM_ADDITIONS[:height],
        weight: weight * Constants::BusinessRules::PACKING_WEIGHT_BUFFER +
                Constants::BusinessRules::PACKING_WEIGHT_ADDITION
      }
    end

    # Mirrors calcAddonFee in src/config/addon-utils.ts: "calculated" rates
    # take max(min, per-kg or percent-of-declared-value); everything else
    # bills the flat amount.
    def calc_addon_fee(rate, billable_weight, declared_value)
      if rate[:charge_type] == "calculated"
        if rate[:per_kg].to_f.positive?
          min = rate[:min_amount] || rate[:amount]
          return [ min, billable_weight.ceil * rate[:per_kg] ].max
        end
        if rate[:rate_percent].to_f.positive?
          min = rate[:min_amount] || rate[:amount]
          return [ declared_value.to_f * rate[:rate_percent] / 100, min ].max
        end
      end
      rate[:amount]
    end

    # Normalizes a resolvedAddonRates row (camelCase from the request or
    # snake_case) into the internal shape shared by the calculators.
    def normalize_db_rate(raw)
      r = raw.respond_to?(:deep_symbolize_keys) ? raw.deep_symbolize_keys : raw.to_h.symbolize_keys
      {
        code: r[:code].to_s,
        carrier: r[:carrier].to_s.upcase,
        name_ko: r[:nameKo] || r[:name_ko] || r[:code].to_s,
        name_en: r[:nameEn] || r[:name_en] || r[:code].to_s,
        amount: r[:amount].to_f,
        fsc: !!(r[:fscApplicable].nil? ? r[:fsc] : r[:fscApplicable]),
        charge_type: (r[:chargeType] || r[:charge_type] || "fixed").to_s,
        per_kg: (r[:perKgRate] || r[:per_kg_rate])&.to_f,
        rate_percent: (r[:ratePercent] || r[:rate_percent])&.to_f,
        min_amount: (r[:minAmount] || r[:min_amount])&.to_f,
        detect_rules: r[:detectRules] || r[:detect_rules]
      }
    end
  end
end
