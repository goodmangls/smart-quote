# frozen_string_literal: true

module Calculators
  # DHL add-on services — mirror of src/config/dhl_addons.ts +
  # src/features/quote/services/dhlAddonCalculator.ts. The frontend quotes
  # instantly; this recalculates on save so the stored quote matches the
  # figure the customer was shown.
  #
  # Rate resolution is strict all-or-nothing: DB rows present for DHL are used
  # exclusively (a code missing from the DB is not charged — no fallback);
  # otherwise the hardcoded table applies. OSP/OWT are auto-detected per piece
  # on packed dimensions, with DB detectRules taking precedence when present.
  module DhlAddon
    OSP_DEFAULT_RULES = { max_longest: 100, max_second: 80 }.freeze
    OWT_DEFAULT_THRESHOLD = 70

    # code => [name_ko, name_en, amount, fsc, charge_type, per_kg, rate_percent, min_amount]
    RATES = {
      "SAT" => [ "토요일 배송", "Saturday Delivery", 60_000, true, "fixed", nil, nil, nil ],
      "ELR" => [ "분쟁지역 (Elevated Risk)", "Elevated Risk Area", 50_000, true, "fixed", nil, nil, nil ],
      "OWT" => [ "과중량 (70kg 초과)", "Over Weight (>70kg/carton)", 150_000, true, "per_carton", nil, nil, nil ],
      "INS" => [ "물품 안심 발송 (보험)", "Shipment Insurance", 17_000, false, "calculated", nil, 1.0, 17_000 ],
      "DOC" => [ "서류 안심 발송", "Document Insurance", 8_000, false, "fixed", nil, nil, nil ],
      "RES" => [ "주거지역 배송", "Residential Delivery", 8_000, true, "fixed", nil, nil, nil ],
      "SIG" => [ "직접 서명", "Direct Signature", 8_000, false, "fixed", nil, nil, nil ],
      "NDS" => [ "NDS (3자무역)", "Non-Document Shipment (NDS)", 8_000, false, "fixed", nil, nil, nil ],
      "RMT" => [ "외곽 요금", "Remote Area Surcharge", 35_000, true, "calculated", 750, nil, 35_000 ],
      "ADC" => [ "주소 정정", "Address Correction", 17_000, false, "fixed", nil, nil, nil ],
      "IRR" => [ "비정형 화물 (Irregular)", "Non Conveyable Piece (Irregular)", 30_000, true, "per_piece", nil, nil, nil ],
      "ASR" => [ "성인 서명 (Adult)", "Adult Signature Required", 8_000, false, "fixed", nil, nil, nil ],
      "OSP" => [ "대형 화물 (Oversize)", "Oversize Piece", 30_000, true, "per_piece", nil, nil, nil ],
      "EMG" => [ "비상 상황 추가요금", "Emergency Situation Surcharge", 0, true, "fixed", nil, nil, nil ],
      "TSD" => [ "무역 제재국 배송", "Trade Sanctions Delivery", 50_000, true, "fixed", nil, nil, nil ],
      "NSC" => [ "상단 적재 불가 화물", "Non-Stackable Cargo", 440_000, true, "fixed", nil, nil, nil ],
      "MWB" => [ "수기 운송장 발행", "Manual Waybill Entry", 15_000, false, "fixed", nil, nil, nil ],
      "LBI" => [ "리튬 이온 배터리", "Lithium Ion Battery (PI966 Sec II)", 10_000, false, "fixed", nil, nil, nil ],
      "LBM" => [ "리튬 메탈 배터리", "Lithium Metal Battery (PI969 Sec II)", 10_000, false, "fixed", nil, nil, nil ]
    }.freeze

    module_function

    def call(input:, billable_weight:, fsc_percent:)
      fsc_rate = (fsc_percent || 0).to_f / 100
      packing_type = input[:packingType] || "NONE"
      db_rates = Array(input[:resolvedAddonRates])
                   .map { |r| CarrierAddonSupport.normalize_db_rate(r) }
                   .select { |r| r[:carrier] == "DHL" }
                   .index_by { |r| r[:code] }
      use_db = db_rates.any?
      details = []
      total = 0.0

      push = lambda do |code, rate, amount|
        fsc = rate[:fsc] ? amount * fsc_rate : 0
        details << { code: code, nameKo: rate[:name_ko], nameEn: rate[:name_en],
                     amount: amount, fscAmount: fsc }
        total += amount + fsc
      end

      # 1. OSP / OWT — auto-detected per piece on packed dimensions.
      osp_def = find_rate(db_rates, use_db, "OSP")
      owt_def = find_rate(db_rates, use_db, "OWT")
      osp_count = 0
      owt_count = 0
      Array(input[:items]).each do |item|
        dims = CarrierAddonSupport.packed_dimensions(item, packing_type)
        osp_count += item[:quantity].to_i if oversize?(dims, use_db, osp_def)
        owt_count += item[:quantity].to_i if over_weight?(dims, use_db, owt_def)
      end
      push.call("OSP", osp_def, osp_def[:amount] * osp_count) if osp_count.positive? && osp_def
      push.call("OWT", owt_def, owt_def[:amount] * owt_count) if owt_count.positive? && owt_def

      # 2. User-selected add-ons.
      Array(input[:dhlAddOns]).each do |code|
        addon = find_rate(db_rates, use_db, code)
        next unless addon

        amount = selected_amount(code, addon, input, billable_weight)
        push.call(code, addon, amount)
      end

      { total: total, details: details }
    end

    def find_rate(db_rates, use_db, code)
      return db_rates[code] if use_db

      hardcoded_rate(code)
    end

    def hardcoded_rate(code)
      row = RATES[code]
      return nil unless row

      name_ko, name_en, amount, fsc, charge_type, per_kg, rate_percent, min_amount = row
      {
        code: code, carrier: "DHL", name_ko: name_ko, name_en: name_en,
        amount: amount.to_f, fsc: fsc, charge_type: charge_type,
        per_kg: per_kg&.to_f, rate_percent: rate_percent&.to_f, min_amount: min_amount&.to_f,
        detect_rules: nil
      }
    end

    def oversize?(dims, use_db, osp_def)
      if use_db && osp_def && osp_def[:detect_rules]
        rules = osp_def[:detect_rules]
        max_l = rules[:max_longest] || OSP_DEFAULT_RULES[:max_longest]
        max_s = rules[:max_second] || OSP_DEFAULT_RULES[:max_second]
        sorted = [ dims[:l], dims[:w], dims[:h] ].sort.reverse
        sorted[0] > max_l || sorted[1] > max_s
      else
        sorted = [ dims[:l], dims[:w], dims[:h] ].sort.reverse
        sorted[0] > OSP_DEFAULT_RULES[:max_longest] || sorted[1] > OSP_DEFAULT_RULES[:max_second]
      end
    end

    def over_weight?(dims, use_db, owt_def)
      threshold =
        if use_db && owt_def && owt_def[:detect_rules]
          owt_def[:detect_rules][:weight_threshold] || OWT_DEFAULT_THRESHOLD
        else
          OWT_DEFAULT_THRESHOLD
        end
      dims[:weight] > threshold
    end

    # IRR is per-piece on both paths; everything else goes through the shared
    # fee formula (flat amounts pass through, RMT takes max(min, per-kg), INS
    # takes max(declared value × 1%, min) with dhlDeclaredValue).
    def selected_amount(code, addon, input, billable_weight)
      if code == "IRR" && addon[:charge_type] == "per_piece"
        addon[:amount] * Array(input[:items]).sum { |i| i[:quantity].to_i }
      else
        CarrierAddonSupport.calc_addon_fee(addon, billable_weight, input[:dhlDeclaredValue] || 0)
      end
    end
  end
end
