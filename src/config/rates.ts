export const FUMIGATION_FEE = 30000;
export const WAR_RISK_SURCHARGE_RATE = 0; // DEC-006: War risk surcharge removed (synced with backend rates.rb)
export const PACKING_MATERIAL_BASE_COST = 15000; // per m2
export const PACKING_LABOR_UNIT_COST = 50000; // per item

// Transit Time Constants
export const TRANSIT_TIMES = {
  UPS: '2-4 Business Days',
  DHL: '2-4 Business Days',
  FEDEX: '3-6 Business Days',
} as const;

// Market Defaults
export const DEFAULT_EXCHANGE_RATE = 1320; // 적용 기준환율 (2026-09-02 확인)

// ============================================================
// FSC 주간 업데이트 — 변경 시 아래 두 파일을 반드시 함께 수정
//   1. src/config/rates.ts          ← 이 파일 (프론트엔드)
//   2. smart-quote-api/lib/constants/rates.rb (백엔드)
//
// UPS FSC : 매주 월요일 업데이트
//   출처: https://www.ups.com/kr/ko/support/shipping-support/shipping-costs-rates/fuel-surcharges.page
// DHL FSC : 매주 월요일 업데이트 (2026-04경 매월 1일에서 변경 — 공식 페이지가 주간 밴드로 게시)
//   출처: https://mydhl.express.dhl/kr/ko/ship/surcharges.html#/fuel_surcharge
// FedEx FSC : 주간 업데이트 (EMAX 공지)
// ============================================================
export const DEFAULT_FSC_PERCENT = 48.25; // UPS FSC, effective 2026-08-31
export const DEFAULT_FSC_PERCENT_DHL = 43.25; // DHL FSC, effective 2026-08-31
export const DEFAULT_FSC_PERCENT_FEDEX = 47.75; // FedEx FSC, effective 2026-08-31

/**
 * The fuel surcharge to apply when the request carries no fscPercent at all.
 *
 * Single source for a rule that used to be written out three times (the pricing
 * math, the carrier comparison card, and the carrier-switch effect). Only a
 * missing value takes this default — an explicit 0 means "no fuel surcharge"
 * and is honoured on both the frontend and the backend.
 */
export const defaultFscFor = (carrier: string | undefined): number => {
  if (carrier === 'DHL') return DEFAULT_FSC_PERCENT_DHL;
  if (carrier === 'FEDEX') return DEFAULT_FSC_PERCENT_FEDEX;
  return DEFAULT_FSC_PERCENT;
};
export const UPS_FSC_URL =
  'https://www.ups.com/kr/ko/support/shipping-support/shipping-costs-rates/fuel-surcharges.page';
export const UPS_RATES_HUB_URL =
  'https://www.ups.com/kr/ko/support/shipping-support/shipping-costs-rates';
export const DHL_FSC_URL = 'https://mydhl.express.dhl/kr/ko/ship/surcharges.html#/fuel_surcharge';
export const FEDEX_FSC_URL = 'https://www.fedex.com/ko-kr/shipping/surcharges.html';
