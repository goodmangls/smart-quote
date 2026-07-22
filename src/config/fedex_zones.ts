/**
 * FedEx zone mapping: country code -> { rateKey, label }
 * Source: FDX IP Export 2026 Special Rates (letter zones A–Y)
 * Synced with FEDEX_ZONE_COUNTRIES in options.ts and Calculators::FedexZone
 */

import type { ZoneInfo } from './ups_zones';

const z = (rateKey: string, label: string): ZoneInfo => ({ rateKey, label });

export const FEDEX_ZONE_MAP: Record<string, ZoneInfo> = {
  // A: Macao
  MO: z('A', 'A/Macao'),
  // D: Guam, Saipan, Laos, Mongolia, Brunei
  GU: z('D', 'D/Guam-SEA'),
  MP: z('D', 'D/Guam-SEA'),
  LA: z('D', 'D/Guam-SEA'),
  MN: z('D', 'D/Guam-SEA'),
  BN: z('D', 'D/Guam-SEA'),
  // E: US West — unused without ZIP (US defaults to F)
  // F: US, Canada, NZ, Mexico
  US: z('F', 'F/Americas-Oceania'),
  CA: z('F', 'F/Americas-Oceania'),
  NZ: z('F', 'F/Americas-Oceania'),
  MX: z('F', 'F/Americas-Oceania'),
  // G: Austria, Denmark, Hungary, Belgium, Czech, Greece, Netherlands, Poland, Israel
  AT: z('G', 'G/N.Europe'),
  DK: z('G', 'G/N.Europe'),
  HU: z('G', 'G/N.Europe'),
  BE: z('G', 'G/N.Europe'),
  CZ: z('G', 'G/N.Europe'),
  GR: z('G', 'G/N.Europe'),
  NL: z('G', 'G/N.Europe'),
  PL: z('G', 'G/N.Europe'),
  IL: z('G', 'G/N.Europe'),
  // H: Eastern Europe, Russia, Romania, Turkey (+ nearby EE)
  RU: z('H', 'H/E.Europe'),
  RO: z('H', 'H/E.Europe'),
  TR: z('H', 'H/E.Europe'),
  BG: z('H', 'H/E.Europe'),
  UA: z('H', 'H/E.Europe'),
  BY: z('H', 'H/E.Europe'),
  MD: z('H', 'H/E.Europe'),
  // I: Argentina, Brazil, Chile, Paraguay, Peru, South America
  AR: z('I', 'I/LatAm'),
  BR: z('I', 'I/LatAm'),
  CL: z('I', 'I/LatAm'),
  PY: z('I', 'I/LatAm'),
  PE: z('I', 'I/LatAm'),
  CO: z('I', 'I/LatAm'),
  EC: z('I', 'I/LatAm'),
  VE: z('I', 'I/LatAm'),
  UY: z('I', 'I/LatAm'),
  BO: z('I', 'I/LatAm'),
  // J: Middle East
  AE: z('J', 'J/Middle East'),
  BH: z('J', 'J/Middle East'),
  KW: z('J', 'J/Middle East'),
  OM: z('J', 'J/Middle East'),
  QA: z('J', 'J/Middle East'),
  SA: z('J', 'J/Middle East'),
  JO: z('J', 'J/Middle East'),
  LB: z('J', 'J/Middle East'),
  EG: z('J', 'J/Middle East'),
  IQ: z('J', 'J/Middle East'),
  // K: China South
  'CN-S': z('K', 'K/S.China'),
  // M: Italy, Spain, UK, Germany (+ nearby W.Europe peers)
  IT: z('M', 'M/W.Europe'),
  ES: z('M', 'M/W.Europe'),
  GB: z('M', 'M/W.Europe'),
  DE: z('M', 'M/W.Europe'),
  FR: z('M', 'M/W.Europe'),
  CH: z('M', 'M/W.Europe'),
  PT: z('M', 'M/W.Europe'),
  IE: z('M', 'M/W.Europe'),
  LU: z('M', 'M/W.Europe'),
  AD: z('M', 'M/W.Europe'),
  MC: z('M', 'M/W.Europe'),
  SM: z('M', 'M/W.Europe'),
  VA: z('M', 'M/W.Europe'),
  LI: z('M', 'M/W.Europe'),
  // N: Vietnam
  VN: z('N', 'N/Vietnam'),
  // O: India
  IN: z('O', 'O/India'),
  // P: Japan
  JP: z('P', 'P/Japan'),
  // Q: Malaysia
  MY: z('Q', 'Q/Malaysia'),
  // R: Thailand
  TH: z('R', 'R/Thailand'),
  // S: Philippines
  PH: z('S', 'S/Philippines'),
  // T: Indonesia
  ID: z('T', 'T/Indonesia'),
  // U: Australia
  AU: z('U', 'U/Australia'),
  // V: Hong Kong
  HK: z('V', 'V/Hong Kong'),
  // W: China
  CN: z('W', 'W/China'),
  // X: Taiwan
  TW: z('X', 'X/Taiwan'),
  // Y: Singapore
  SG: z('Y', 'Y/Singapore'),
};

const FEDEX_DEFAULT_ZONE: ZoneInfo = { rateKey: 'Y', label: 'Y/Singapore (default)' };

export const determineFedexZone = (country: string): ZoneInfo =>
  FEDEX_ZONE_MAP[country] || FEDEX_DEFAULT_ZONE;
