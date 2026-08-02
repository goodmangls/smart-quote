module Constants
  module Rates
    # Unit: KRW
    FUMIGATION_FEE = 30000
    WAR_RISK_SURCHARGE_RATE = 0  # DEC-006: War risk surcharge removed
    PACKING_MATERIAL_BASE_COST = 15000
    PACKING_LABOR_UNIT_COST = 50000
    DEFAULT_EXCHANGE_RATE = 1450 # 하나은행 월요일 09시 송금환율 (2026-05-20)

    # ============================================================
    # FSC 주간 업데이트 — 변경 시 아래 두 파일을 반드시 함께 수정
    #   1. smart-quote-api/lib/constants/rates.rb  ← 이 파일 (백엔드)
    #   2. src/config/rates.ts (프론트엔드)
    #
    # UPS / DHL / FedEx FSC : 매주 월요일 본부장님 BridgeLogis 수동 입력값 기준 업데이트
    # ============================================================
    DEFAULT_FSC_PERCENT = 46.25 # UPS FSC, effective 2026-08-03
    DEFAULT_FSC_PERCENT_DHL = 38.25 # DHL FSC, effective 2026-08-03
    DEFAULT_FSC_PERCENT_FEDEX = 45.50 # FedEx FSC, effective 2026-08-03
    MAX_MARGIN_PERCENT = 80 # Maximum margin rate (%)
    UPS_FSC_URL = "https://www.ups.com/kr/ko/support/shipping-support/shipping-costs-rates/fuel-surcharges.page"
    UPS_RATES_HUB_URL = "https://www.ups.com/kr/ko/support/shipping-support/shipping-costs-rates"
    FEDEX_FSC_URL = "https://www.fedex.com/ko-kr/shipping/surcharges.html"
  end
end
