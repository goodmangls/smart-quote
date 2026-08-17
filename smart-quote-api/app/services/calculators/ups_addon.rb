# frozen_string_literal: true

module Calculators
  # UPS add-on services — mirror of src/config/ups_addons.ts +
  # src/features/quote/services/upsAddonCalculator.ts. The frontend quotes
  # instantly; this recalculates on save so the stored quote matches the
  # figure the customer was shown.
  #
  # Frontend rules mirrored deliberately, including the surprising ones:
  #   - IHF is pushed from the constant, not the rate table — a DB override of
  #     IHF's amount does not change the auto-applied fee (FE behaves the same).
  #   - SGF (급증수수료) comes from the official 2026-05-24 regional per-kg
  #     table, always carries FSC, and is charged even when the DB rate set
  #     omits it. Domestic KR shipments are exempt.
  #   - A user-selected "SEF" is ignored — SGF auto-detection replaced it and
  #     honoring stale selections would double-charge.
  #   - DDP never carries FSC, even if a DB row marks it fscApplicable.
  #   - DB rows, when present for UPS, are used exclusively except IHF/SEF
  #     which keep hardcoded fallbacks (mirrors findUpsRate).
  module UpsAddon
    INTERNATIONAL_PROCESSING_FEE_KRW = 3_642

    AHS_DEFAULT_RULES = {
      weight_threshold: 25, max_longest: 122, max_second: 76,
      packing_types: %w[WOODEN_BOX SKID].freeze
    }.freeze

    # code => [name_ko, name_en, amount, fsc, charge_type, per_kg, min_amount]
    RATES = {
      "RES" => [ "주거지역 서비스", "Residential Delivery", 4_600, true, "fixed", nil, nil ],
      "RMT" => [ "외곽요금", "Remote Area Surcharge", 31_400, true, "calculated", 570, 31_400 ],
      "EXT" => [ "원거리지역 서비스", "Extended Area Surcharge", 34_200, true, "calculated", 640, 34_200 ],
      "AHS" => [ "비규격품부가요금", "Additional Handling", 21_400, true, "per_carton", nil, nil ],
      "ADC" => [ "주소정정", "Address Correction", 15_100, false, "per_carton", nil, nil ],
      "DDP" => [ "DDP 수수료", "DDP Service Fee", 28_500, false, "fixed", nil, nil ],
      "IHF" => [ "국제 처리 수수료", "International Processing Fee", INTERNATIONAL_PROCESSING_FEE_KRW, false, "fixed", nil, nil ],
      "SEF" => [ "급증 긴급 수수료", "Surge Emergency Fee", 0, true, "calculated", 720, 0 ]
    }.freeze

    # UPS Surge Emergency Fee 권역표 (2026-05-24~) — mirrors getUpsSurgeFeePerKg.
    # First matching region wins; anything unlisted falls to Rest of World.
    SURGE_REGIONS = [
      { rate: 4_722, region: "U.A.E. & Israel", countries: %w[AE IL].freeze },
      { rate: 4_220, region: "Middle East",
        countries: %w[AF BH BD EG IQ JO KW LB NP OM PK QA SA LK].freeze },
      { rate: 720, region: "Europe",
        countries: %w[AL AD AM AT BY BE BA BG HR CY CZ DK EE FI FR GE DE GI GR GG
                      HU IS IE IT JE XK LV LT LU MT MD ME NL MK NO PL PT RO RU SM
                      RS SK SI ES SE CH TR UA GB].freeze },
      { rate: 720, region: "U.S. & Americas",
        countries: %w[US AI AG AR AW BS BB BZ BM BO BQ BR VG CA KY CL CO CR CU CW
                      DM DO EC SV GF GD GP GT GY HT HN JM MQ MX MS NI PA PY PE PR
                      BL KN LC MF SX VC SR TT TC VI UY VE].freeze },
      { rate: 143, region: "Asia Pacific",
        countries: %w[AS AU BN KH CN FJ PF GU HK IN ID JP KR LA MY MM MN MO NC NZ
                      MP PH SG WS TH TW VN].freeze }
    ].freeze
    SURGE_REST_OF_WORLD = { rate: 720, region: "Rest of World" }.freeze

    module_function

    def call(input:, billable_weight:, fsc_percent:)
      fsc_rate = (fsc_percent || 0).to_f / 100
      packing_type = input[:packingType] || "NONE"
      db_rates = Array(input[:resolvedAddonRates])
                   .map { |r| CarrierAddonSupport.normalize_db_rate(r) }
                   .select { |r| r[:carrier] == "UPS" }
                   .index_by { |r| r[:code] }
      use_db = db_rates.any?
      details = []
      total = 0.0

      # 1. IHF — always applied from the constant, never the rate table.
      details << { code: "IHF", nameKo: "국제 처리 수수료", nameEn: "International Processing Fee",
                   amount: INTERNATIONAL_PROCESSING_FEE_KRW, fscAmount: 0 }
      total += INTERNATIONAL_PROCESSING_FEE_KRW

      # 2. AHS — auto-detected per carton on packed dimensions.
      ahs_def = find_rate(db_rates, use_db, "AHS")
      ahs_count = ahs_carton_count(input, packing_type, use_db, ahs_def)
      if ahs_count.positive? && ahs_def
        amount = ahs_def[:amount] * ahs_count
        fsc = ahs_def[:fsc] ? amount * fsc_rate : 0
        details << { code: "AHS", nameKo: ahs_def[:name_ko], nameEn: ahs_def[:name_en],
                     amount: amount, fscAmount: fsc }
        total += amount + fsc
      end

      # 3. DDP — never carries FSC (the frontend pushes fscAmount: 0 unconditionally).
      if input[:incoterm] == "DDP" && (ddp = find_rate(db_rates, use_db, "DDP"))
        details << { code: "DDP", nameKo: ddp[:name_ko], nameEn: ddp[:name_en],
                     amount: ddp[:amount], fscAmount: 0 }
        total += ddp[:amount]
      end

      # 4. SGF — official regional table, FSC always applied.
      if (surge = surge_fee_per_kg(input[:destinationCountry]))
        amount = billable_weight.ceil * surge[:rate]
        fsc = amount * fsc_rate
        details << { code: "SGF", nameKo: "급증수수료 (#{surge[:region]})",
                     nameEn: "Surge Fee (#{surge[:region]})", amount: amount, fscAmount: fsc }
        total += amount + fsc
      end

      # 5. User-selected add-ons.
      Array(input[:upsAddOns]).each do |code|
        next if code == "SEF"

        addon = find_rate(db_rates, use_db, code)
        next unless addon

        amount = selected_amount(code, addon, input, billable_weight)
        fsc = addon[:fsc] ? amount * fsc_rate : 0
        details << { code: code, nameKo: addon[:name_ko], nameEn: addon[:name_en],
                     amount: amount, fscAmount: fsc }
        total += amount + fsc
      end

      { total: total, details: details }
    end

    def surge_fee_per_kg(destination_country)
      return nil if destination_country.to_s.empty? || destination_country == "KR"

      SURGE_REGIONS.each do |region|
        return { rate: region[:rate], region: region[:region] } if region[:countries].include?(destination_country)
      end
      SURGE_REST_OF_WORLD.dup
    end

    def find_rate(db_rates, use_db, code)
      return db_rates[code] || (%w[IHF SEF].include?(code) ? hardcoded_rate(code) : nil) if use_db

      hardcoded_rate(code)
    end

    def hardcoded_rate(code)
      row = RATES[code]
      return nil unless row

      name_ko, name_en, amount, fsc, charge_type, per_kg, min_amount = row
      {
        code: code, carrier: "UPS", name_ko: name_ko, name_en: name_en,
        amount: amount.to_f, fsc: fsc, charge_type: charge_type,
        per_kg: per_kg&.to_f, rate_percent: nil, min_amount: min_amount&.to_f,
        detect_rules: nil
      }
    end

    def ahs_carton_count(input, packing_type, use_db, ahs_def)
      Array(input[:items]).sum do |item|
        dims = CarrierAddonSupport.packed_dimensions(item, packing_type)
        detected =
          if use_db && ahs_def && ahs_def[:detect_rules]
            rules = ahs_def[:detect_rules]
            wt = rules[:weight_threshold] || AHS_DEFAULT_RULES[:weight_threshold]
            ml = rules[:max_longest] || AHS_DEFAULT_RULES[:max_longest]
            ms = rules[:max_second] || AHS_DEFAULT_RULES[:max_second]
            pt = rules[:packing_types] || AHS_DEFAULT_RULES[:packing_types]
            sorted = [ dims[:l], dims[:w], dims[:h] ].sort.reverse
            dims[:weight] > wt || sorted[0] > ml || sorted[1] > ms || pt.include?(packing_type)
          else
            additional_handling?(dims[:l], dims[:w], dims[:h], dims[:weight], packing_type)
          end
        detected ? item[:quantity].to_i : 0
      end
    end

    def additional_handling?(l, w, h, weight, packing_type)
      sorted = [ l, w, h ].sort.reverse
      weight > 25 || sorted[0] > 122 || sorted[1] > 76 ||
        AHS_DEFAULT_RULES[:packing_types].include?(packing_type)
    end

    # ADC is per-carton on both paths; everything else goes through the shared
    # fee formula (flat amounts pass through, RMT/EXT take max(min, per-kg)).
    def selected_amount(code, addon, input, billable_weight)
      if code == "ADC" && addon[:charge_type] == "per_carton"
        addon[:amount] * total_cartons(input)
      else
        CarrierAddonSupport.calc_addon_fee(addon, billable_weight, 0)
      end
    end

    def total_cartons(input)
      Array(input[:items]).sum { |i| i[:quantity].to_i }
    end
  end
end
