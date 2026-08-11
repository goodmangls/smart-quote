# frozen_string_literal: true

module Calculators
  # FedEx add-on services for IPE/IP/IE packages.
  #
  # Source: FedEx "추가 서비스 요금 및 기타 정보 — 대한민국" (KR_20251119_102313).
  # Mirror of src/config/fedex_addons.ts + src/features/quote/services/fedexAddonCalculator.ts.
  # The frontend quotes instantly and this recalculates on save, so any divergence
  # shows up as a saved quote that disagrees with the PDF the customer received.
  #
  # Two rules are FedEx-specific and both cut against the obvious implementation:
  #
  #   1. Highest-only — a package meeting two or more 비표준화물 criteria is charged
  #      the single highest fee, never the sum.
  #   2. 18kg 최소 청구 중량 — a package meeting the 용적 criteria is rated at no less
  #      than 18kg. The fees are flat, so this lands on the tariff lookup, not on an
  #      add-on line. See .min_chargeable_weight.
  #
  # Out of scope (no data / not applicable to IP packages): Freight (IPF/IEF) rates,
  # contract-based premiums (M&I, Priority Alert, ODC), and the group-based OPA/ODA
  # surcharges whose A/B/C country lists are not in the source document.
  module FedexAddon
    MIN_CHARGEABLE_WEIGHT_KG = 18

    AHS_DIMENSION = { max_longest_cm: 121, max_second_cm: 76, max_length_girth_cm: 266, max_volume_cm3: 169_901 }.freeze
    AHS_WEIGHT_KG = 25
    OVERSIZE = { max_longest_cm: 243, max_length_girth_cm: 330, max_weight_kg: 50, max_volume_cm3: 283_168 }.freeze
    UNAUTHORIZED = { max_longest_cm: 274, max_length_girth_cm: 419, max_weight_kg: 68 }.freeze

    AHS_PACKAGING_TYPES = %w[WOODEN_BOX SKID].freeze

    DECLARED_VALUE_FREE_LIMIT_KRW = 115_000
    DECLARED_VALUE_STEP_KRW = 115_000
    DECLARED_VALUE_FEE_PER_STEP_KRW = 1_420

    # code => [nameKo, nameEn, amount, fsc_applicable, per_kg_rate]
    RATES = {
      "AHD" => [ "추가 취급 요금 – 용적", "Additional Handling – Dimension", 35_600, true, nil ],
      "AHW" => [ "추가 취급 요금 – 중량", "Additional Handling – Weight", 35_600, true, nil ],
      "AHP" => [ "추가 취급 요금 – 패키징", "Additional Handling – Packaging", 35_600, true, nil ],
      "OVR" => [ "특대형 화물 취급 요금", "Oversize Charge", 86_000, true, nil ],
      "UNA" => [ "미허가 패키지 처리 추가 요금", "Unauthorized Package Charge", 378_200, true, nil ],
      "USI" => [ "미국 수입 처리 수수료", "U.S. Import Processing Fee", 3_900, false, nil ],
      "SPU" => [ "토요일 픽업", "Saturday Pickup", 20_100, true, nil ],
      "SDL" => [ "토요일 배달", "Saturday Delivery", 20_100, true, nil ],
      "RES" => [ "거주지 배달", "Residential Delivery", 4_400, true, nil ],
      "ADR" => [ "주소 정정 및 변경 요금", "Address Correction", 14_600, true, nil ],
      "TPC" => [ "Third Party Consignee(제3자 수취인)", "Third Party Consignee", 14_200, true, nil ],
      "DIC" => [ "드라이아이스 추가 요금", "Dry Ice", 6_600, true, nil ],
      "SIG" => [ "간접서명", "Indirect Signature Required", 4_000, true, nil ],
      "SDS" => [ "직접서명", "Direct Signature Required", 4_600, true, nil ],
      "SAS" => [ "성인서명", "Adult Signature Required", 5_800, true, nil ],
      "DGA" => [ "근접 위험물", "Accessible Dangerous Goods", 152_100, true, 2_360 ],
      "DGI" => [ "비근접 위험물", "Inaccessible Dangerous Goods", 93_800, true, 1_320 ],
      "BRK" => [ "도착지 브로커 지정 수수료", "Broker Select Option", 13_600, true, 1_540 ]
    }.freeze

    NON_STANDARD_CODES = %w[AHD AHW AHP OVR UNA].freeze

    module_function

    # 길이 + 둘레 = 가장 긴 면 + (나머지 두 면 × 2).
    def length_plus_girth(l, w, h)
      longest, second, third = [ l, w, h ].sort.reverse
      longest + second * 2 + third * 2
    end

    def ahs_dimension?(l, w, h)
      sorted = [ l, w, h ].sort.reverse
      sorted[0] > AHS_DIMENSION[:max_longest_cm] ||
        sorted[1] > AHS_DIMENSION[:max_second_cm] ||
        length_plus_girth(l, w, h) > AHS_DIMENSION[:max_length_girth_cm] ||
        (l * w * h) > AHS_DIMENSION[:max_volume_cm3]
    end

    def ahs_weight?(weight) = weight > AHS_WEIGHT_KG

    def ahs_packaging?(packing_type) = AHS_PACKAGING_TYPES.include?(packing_type)

    def oversize?(l, w, h, weight)
      sorted = [ l, w, h ].sort.reverse
      sorted[0] > OVERSIZE[:max_longest_cm] ||
        length_plus_girth(l, w, h) > OVERSIZE[:max_length_girth_cm] ||
        weight > OVERSIZE[:max_weight_kg] ||
        (l * w * h) > OVERSIZE[:max_volume_cm3]
    end

    def unauthorized?(l, w, h, weight)
      sorted = [ l, w, h ].sort.reverse
      sorted[0] > UNAUTHORIZED[:max_longest_cm] ||
        length_plus_girth(l, w, h) > UNAUTHORIZED[:max_length_girth_cm] ||
        weight > UNAUTHORIZED[:max_weight_kg]
    end

    def declared_value_fee(declared_value_krw)
      value = declared_value_krw.to_f
      return 0 if value <= DECLARED_VALUE_FREE_LIMIT_KRW

      (value / DECLARED_VALUE_STEP_KRW).ceil * DECLARED_VALUE_FEE_PER_STEP_KRW
    end

    # Chargeable-weight floor from the 용적 criteria, or nil when nothing triggers it
    # (in which case the weight pipeline must be left exactly as it was).
    def min_chargeable_weight(items, packing_type)
      triggering = (items || []).sum do |item|
        dims = packed_dimensions(item, packing_type)
        ahs_dimension?(dims[:l], dims[:w], dims[:h]) ? item[:quantity].to_i : 0
      end
      triggering.positive? ? triggering * MIN_CHARGEABLE_WEIGHT_KG : nil
    end

    def call(input:, billable_weight:, fsc_percent:)
      fsc_rate = (fsc_percent || 0).to_f / 100
      packing_type = input[:packingType] || "NONE"
      details = []
      total = 0.0

      push = lambda do |code, amount|
        _ko, _en, _amt, fsc_applicable, = RATES[code]
        fsc = fsc_applicable ? amount * fsc_rate : 0
        details << { code: code, nameKo: RATES[code][0], nameEn: RATES[code][1], amount: amount, fscAmount: fsc }
        total += amount + fsc
      end

      # 1. 비표준화물 — per package, highest fee only.
      winners = Hash.new(0)
      (input[:items] || []).each do |item|
        dims = packed_dimensions(item, packing_type)
        codes = non_standard_codes(dims, packing_type)
        next if codes.empty?

        winner = codes.max_by { |code| RATES[code][2] }
        winners[winner] += item[:quantity].to_i
      end
      winners.each { |code, count| push.call(code, RATES[code][2] * count) }

      # 2. 목적지 기반
      push.call("USI", RATES["USI"][2]) if input[:destinationCountry] == "US"

      # 3. 운송 신고 금액 추가 비용
      dv_fee = declared_value_fee(input[:fedexDeclaredValue])
      if dv_fee.positive?
        details << { code: "DVL", nameKo: "운송 신고 금액 추가 비용", nameEn: "Declared Value Surcharge",
                     amount: dv_fee, fscAmount: 0 }
        total += dv_fee
      end

      # 4. 사용자 선택
      selected = Array(input[:fedexAddOns])
      selected.each do |code|
        next unless RATES.key?(code)
        # Dry ice is waived when dangerous goods are also declared.
        next if code == "DIC" && selected.any? { |c| %w[DGA DGI].include?(c) }

        push.call(code, greater_of(code, billable_weight))
      end

      { total: total, details: details }
    end

    def non_standard_codes(dims, packing_type)
      codes = []
      codes << "AHD" if ahs_dimension?(dims[:l], dims[:w], dims[:h])
      codes << "AHW" if ahs_weight?(dims[:weight])
      codes << "AHP" if ahs_packaging?(packing_type)
      codes << "OVR" if oversize?(dims[:l], dims[:w], dims[:h], dims[:weight])
      codes << "UNA" if unauthorized?(dims[:l], dims[:w], dims[:h], dims[:weight])
      codes
    end

    # "X원 또는 kg당 Y원 중 큰 금액" — flat amount unless the per-kg rate beats it.
    def greater_of(code, billable_weight)
      flat = RATES[code][2]
      per_kg = RATES[code][4]
      return flat if per_kg.nil?

      [ flat, billable_weight.ceil * per_kg ].max
    end

    # Mirrors the +10/+10/+15 cm and weight buffer applied inline in
    # Calculators::ItemCost#call, and applyPackingDimensions on the frontend.
    # Kept in step with those two — a divergence here silently shifts which
    # packages trip the 비표준화물 thresholds.
    PACKING_DIM_ADDITIONS = { length: 10, width: 10, height: 15 }.freeze

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
  end
end
