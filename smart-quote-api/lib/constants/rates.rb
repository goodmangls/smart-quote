module Constants
  module Rates
    # Unit: KRW
    FUMIGATION_FEE = 30000
    WAR_RISK_SURCHARGE_RATE = 0  # DEC-006: War risk surcharge removed
    PACKING_MATERIAL_BASE_COST = 15000
    PACKING_LABOR_UNIT_COST = 50000
    DEFAULT_EXCHANGE_RATE = 1450 # 하나은행 월요일 09시 송금환율 (2026-03-24)

    # ============================================================
    # FSC 주간 업데이트 — 변경 시 아래 두 파일을 반드시 함께 수정
    #   1. smart-quote-api/lib/constants/rates.rb  ← 이 파일 (백엔드)
    #   2. src/config/rates.ts (프론트엔드)
    #
    # UPS FSC : 매주 월요일 업데이트
    #   출처: https://www.ups.com/kr/ko/support/shipping-support/shipping-costs-rates/fuel-surcharges.page
    # DHL FSC : 매월 1일 업데이트
    #   출처: https://mydhl.express.dhl/kr/ko/ship/surcharges.html#/fuel_surcharge
    # ============================================================
    DEFAULT_FSC_PERCENT = 47.25 # UPS FSC, effective 2026-05-04
    DEFAULT_FSC_PERCENT_DHL = 47.00 # DHL FSC, effective 2026-05-04
    MAX_MARGIN_PERCENT = 80 # Maximum margin rate (%)
    UPS_FSC_URL = "https://www.ups.com/kr/ko/support/shipping-support/shipping-costs-rates/fuel-surcharges.page"
    UPS_RATES_HUB_URL = "https://www.ups.com/kr/ko/support/shipping-support/shipping-costs-rates"
  end
end
