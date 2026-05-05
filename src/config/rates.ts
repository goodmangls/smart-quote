export const FUMIGATION_FEE = 30000;
export const WAR_RISK_SURCHARGE_RATE = 0; // DEC-006: War risk surcharge removed (synced with backend rates.rb)
export const PACKING_MATERIAL_BASE_COST = 15000; // per m2
export const PACKING_LABOR_UNIT_COST = 50000; // per item

// Transit Time Constants
export const TRANSIT_TIMES = {
  UPS: '2-4 Business Days',
  DHL: '2-4 Business Days',
} as const;

// Market Defaults
export const DEFAULT_EXCHANGE_RATE = 1450; // Manual: 하나은행 월요일 09시 송금환율 (2026-03-24)

// ============================================================
// FSC 주간 업데이트 — 변경 시 아래 두 파일을 반드시 함께 수정
//   1. src/config/rates.ts          ← 이 파일 (프론트엔드)
//   2. smart-quote-api/lib/constants/rates.rb (백엔드)
//
// UPS FSC : 매주 월요일 업데이트
//   출처: https://www.ups.com/kr/ko/support/shipping-support/shipping-costs-rates/fuel-surcharges.page
// DHL FSC : 매월 1일 업데이트
//   출처: https://mydhl.express.dhl/kr/ko/ship/surcharges.html#/fuel_surcharge
// ============================================================
export const DEFAULT_FSC_PERCENT = 47.25; // UPS FSC, effective 2026-05-04
export const DEFAULT_FSC_PERCENT_DHL = 47.0; // DHL FSC, effective 2026-05-04
export const UPS_FSC_URL =
  'https://www.ups.com/kr/ko/support/shipping-support/shipping-costs-rates/fuel-surcharges.page';
export const UPS_RATES_HUB_URL =
  'https://www.ups.com/kr/ko/support/shipping-support/shipping-costs-rates';
export const DHL_FSC_URL = 'https://mydhl.express.dhl/kr/ko/ship/surcharges.html#/fuel_surcharge';
