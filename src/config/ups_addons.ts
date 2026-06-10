/**
 * UPS Korea 부가서비스 요금표 (2026년)
 * Source: UPS Korea 공식 부가서비스 가이드
 */

import { PackingType } from '@/types';

export interface UpsAddOn {
  code: string;
  nameKo: string;
  nameEn: string;
  amount: number;
  chargeType: 'fixed' | 'per_carton' | 'calculated';
  unit: 'shipment' | 'carton';
  fscApplicable: boolean;
  autoDetect?: boolean;
  selectable: boolean;
  condition?: string;
  description?: string;
}

export const UPS_INTERNATIONAL_PROCESSING_FEE_KRW = 3_642;
export const UPS_INTERNATIONAL_PROCESSING_FEE_USD = 3.642;
export const UPS_SURGE_EMERGENCY_FEE_PER_KG_KRW = 720;
export const UPS_SURGE_EMERGENCY_FEE_PER_KG_USD = 0.72;

export const UPS_ADDON_RATES: UpsAddOn[] = [
  {
    code: 'RES',
    nameKo: '주거지역 서비스',
    nameEn: 'Residential Delivery',
    amount: 4_600,
    chargeType: 'fixed',
    unit: 'shipment',
    fscApplicable: true,
    selectable: true,
  },
  {
    code: 'RMT',
    nameKo: '외곽요금',
    nameEn: 'Remote Area Surcharge',
    amount: 31_400,
    chargeType: 'calculated',
    unit: 'shipment',
    fscApplicable: true,
    selectable: true,
    description: '최소 31,400원 또는 KG당 570원 중 큰 값',
  },
  {
    code: 'EXT',
    nameKo: '원거리지역 서비스',
    nameEn: 'Extended Area Surcharge',
    amount: 34_200,
    chargeType: 'calculated',
    unit: 'shipment',
    fscApplicable: true,
    selectable: true,
    description: '최소 34,200원 또는 KG당 640원 중 큰 값',
  },
  {
    code: 'AHS',
    nameKo: '비규격품부가요금',
    nameEn: 'Additional Handling',
    amount: 21_400,
    chargeType: 'per_carton',
    unit: 'carton',
    fscApplicable: true,
    autoDetect: true,
    selectable: false,
    description: 'AHS Weight(>25kg) 또는 AHS Dim(L>122cm, W>76cm) 또는 특수포장',
  },
  {
    code: 'ADC',
    nameKo: '주소정정',
    nameEn: 'Address Correction',
    amount: 15_100,
    chargeType: 'per_carton',
    unit: 'carton',
    fscApplicable: false,
    selectable: true,
  },
  {
    code: 'DDP',
    nameKo: 'DDP 수수료',
    nameEn: 'DDP Service Fee',
    amount: 28_500,
    chargeType: 'fixed',
    unit: 'shipment',
    fscApplicable: false,
    autoDetect: true,
    selectable: false,
    condition: 'DDP',
    description: 'DDP incoterm 선택 시 자동 부과',
  },
  {
    code: 'IHF',
    nameKo: '국제 처리 수수료',
    nameEn: 'International Processing Fee',
    amount: UPS_INTERNATIONAL_PROCESSING_FEE_KRW,
    chargeType: 'fixed',
    unit: 'shipment',
    fscApplicable: false,
    autoDetect: true,
    selectable: false,
    description: 'UPS AWB 건당 3,642 KRW / USD 적용 시 3.642 USD',
  },
  {
    code: 'SEF',
    nameKo: '급증 긴급 수수료',
    nameEn: 'Surge Emergency Fee',
    amount: 0,
    chargeType: 'calculated',
    unit: 'shipment',
    fscApplicable: true,
    autoDetect: true,
    selectable: false,
    description: 'UPS 공식 2026-05-24 표 기준 목적지 권역별 kg당 자동 부과. U.S./Americas, Europe, Rest of World 720 KRW/kg',
  },
];

/** UPS Remote Area: max(31,400, billableWeight * 570) */
export const calculateUpsRemoteAreaFee = (billableWeight: number): number =>
  Math.max(31_400, Math.ceil(billableWeight) * 570);

/** UPS Extended Area: max(34,200, billableWeight * 640) */
export const calculateUpsExtendedAreaFee = (billableWeight: number): number =>
  Math.max(34_200, Math.ceil(billableWeight) * 640);

/** UPS Surge Emergency Fee: destination-region based, KRW/kg */
export const calculateUpsSurgeEmergencyFee = (billableWeight: number, perKgRate = UPS_SURGE_EMERGENCY_FEE_PER_KG_KRW): number =>
  Math.ceil(billableWeight) * perKgRate;

/**
 * UPS Surge Emergency Fee (급증 긴급 수수료) - 2026-05-24부터 추후 공지 시까지
 * Source: UPS Korea Surge Emergency Fee PDF (2026-05-24 업데이트)
 * 한국 출발 수출 화물 → 선택된 글로벌 도착지
 * Billable weight(kg) 기준, FSC 적용됨, 국내 화물에는 미적용.
 */
export const UPS_SURGE_FEE_COUNTRIES = {
  /** United Arab Emirates & Israel: KRW 4,722/kg */
  UAE_ISRAEL: ['AE', 'IL'] as string[],
  /** Middle East excluding U.A.E. & Israel: KRW 4,220/kg */
  MIDDLE_EAST: [
    'AF', 'BH', 'BD', 'EG', 'IQ', 'JO', 'KW', 'LB',
    'NP', 'OM', 'PK', 'QA', 'SA', 'LK',
  ] as string[],
  /** Europe: KRW 720/kg */
  EUROPE: [
    'AL', 'AD', 'AM', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY',
    'CZ', 'DK', 'EE', 'FI', 'FR', 'GE', 'DE', 'GI', 'GR', 'GG',
    'HU', 'IS', 'IE', 'IT', 'JE', 'XK', 'LV', 'LT', 'LU', 'MT',
    'MD', 'ME', 'NL', 'MK', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM',
    'RS', 'SK', 'SI', 'ES', 'SE', 'CH', 'TR', 'UA', 'GB',
  ] as string[],
  /** U.S. and Americas: KRW 720/kg */
  US_AMERICAS: [
    'US', 'AI', 'AG', 'AR', 'AW', 'BS', 'BB', 'BZ', 'BM', 'BO',
    'BQ', 'BR', 'VG', 'CA', 'KY', 'CL', 'CO', 'CR', 'CU', 'CW',
    'DM', 'DO', 'EC', 'SV', 'GF', 'GD', 'GP', 'GT', 'GY', 'HT',
    'HN', 'JM', 'MQ', 'MX', 'MS', 'NI', 'PA', 'PY', 'PE', 'PR',
    'BL', 'KN', 'LC', 'MF', 'SX', 'VC', 'SR', 'TT', 'TC', 'VI',
    'UY', 'VE',
  ] as string[],
  /** Asia Pacific: KRW 143/kg */
  ASIA_PACIFIC: [
    'AS', 'AU', 'BN', 'KH', 'CN', 'FJ', 'PF', 'GU', 'HK', 'IN',
    'ID', 'JP', 'KR', 'LA', 'MY', 'MM', 'MN', 'MO', 'NC', 'NZ',
    'MP', 'PH', 'SG', 'WS', 'TH', 'TW', 'VN',
  ] as string[],
};

export const UPS_SURGE_FEE_RATES: Record<string, number> = {
  UAE_ISRAEL: 4_722,
  MIDDLE_EAST: 4_220,
  EUROPE: 720,
  US_AMERICAS: 720,
  ASIA_PACIFIC: 143,
  REST_OF_WORLD: 720,
};

/** 목적지 국가에 해당하는 UPS Surge Emergency Fee (KRW/kg) 반환. 국내 KR→KR 화물은 미적용. */
export const getUpsSurgeFeePerKg = (destinationCountry: string): { rate: number; region: string } | null => {
  if (!destinationCountry || destinationCountry === 'KR') return null;
  if (UPS_SURGE_FEE_COUNTRIES.UAE_ISRAEL.includes(destinationCountry)) {
    return { rate: UPS_SURGE_FEE_RATES.UAE_ISRAEL, region: 'U.A.E. & Israel' };
  }
  if (UPS_SURGE_FEE_COUNTRIES.MIDDLE_EAST.includes(destinationCountry)) {
    return { rate: UPS_SURGE_FEE_RATES.MIDDLE_EAST, region: 'Middle East' };
  }
  if (UPS_SURGE_FEE_COUNTRIES.EUROPE.includes(destinationCountry)) {
    return { rate: UPS_SURGE_FEE_RATES.EUROPE, region: 'Europe' };
  }
  if (UPS_SURGE_FEE_COUNTRIES.US_AMERICAS.includes(destinationCountry)) {
    return { rate: UPS_SURGE_FEE_RATES.US_AMERICAS, region: 'U.S. & Americas' };
  }
  if (UPS_SURGE_FEE_COUNTRIES.ASIA_PACIFIC.includes(destinationCountry)) {
    return { rate: UPS_SURGE_FEE_RATES.ASIA_PACIFIC, region: 'Asia Pacific' };
  }
  return { rate: UPS_SURGE_FEE_RATES.REST_OF_WORLD, region: 'Rest of World' };
};

/** UPS AHS 감지: weight>25kg OR longest>122cm OR 2nd>76cm OR wood/skid packing */
export const isUpsAdditionalHandling = (
  l: number, w: number, h: number, weight: number, packingType: PackingType
): boolean => {
  const sorted = [l, w, h].sort((a, b) => b - a);
  return (
    weight > 25 ||
    sorted[0] > 122 ||
    sorted[1] > 76 ||
    [PackingType.WOODEN_BOX, PackingType.SKID].includes(packingType)
  );
};
