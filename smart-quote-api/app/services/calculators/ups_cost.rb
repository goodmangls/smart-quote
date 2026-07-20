module Calculators
  class UpsCost
    def self.call(billable_weight:, country:, shipping_item_type: "NON_DOCUMENT")
      new(billable_weight, country, shipping_item_type).call
    end

    def initialize(billable_weight, country, shipping_item_type = "NON_DOCUMENT")
      @billable_weight = billable_weight
      @country = country
      @shipping_item_type = shipping_item_type
    end

    def call
      zone_info = Calculators::UpsZone.call(@country)
      zone_key = zone_info[:rate_key]

      ups_base = calculate_base_rate(zone_key)
      ups_war_risk = ups_base * Constants::Rates::WAR_RISK_SURCHARGE_RATE

      {
        intl_base: ups_base,
        intl_war_risk: ups_war_risk,
        applied_zone: zone_info[:label],
        transit_time: "UPS 2-4 Business Days"
      }
    end

    private

    def calculate_base_rate(zone_key)
      tables = Calculators::RateTableResolver.call(
        carrier: "UPS",
        shipping_item_type: @shipping_item_type,
        billable_weight: @billable_weight
      )
      lookup_weight = round_to_half(@billable_weight)
      zone_rates = tables[:exact][zone_key]

      if zone_rates && zone_rates[lookup_weight]
        return zone_rates[lookup_weight]
      end

      # Range Rates
      range = tables[:range].find { |r| @billable_weight >= r[:min] && @billable_weight <= r[:max] }

      if range && range[:rates][zone_key]
        per_kg_rate = range[:rates][zone_key]
        multiplier_weight = @billable_weight.ceil
        return multiplier_weight * per_kg_rate
      end

      # Fallback logic mirroring TS
      if zone_rates
        found_weight = zone_rates.keys.sort.find { |w| w >= lookup_weight }
        return zone_rates[found_weight] if found_weight

        next_range = tables[:range].find { |r| r[:min] <= @billable_weight.ceil }
        if next_range && next_range[:rates][zone_key]
          return @billable_weight.ceil * next_range[:rates][zone_key]
        end
      end

      0
    end

    def round_to_half(num)
      (num * 2).ceil / 2.0
    end
  end
end
