import { Incoterm } from '@/types';
import type { ZoneInfo } from './ups_zones';
import { UPS_ZONE_MAP } from './ups_zones';
import { DHL_ZONE_MAP } from './dhl_zones';
import { FEDEX_ZONE_MAP } from './fedex_zones';

// Master country list — union of all UPS & DHL zone countries
// Source: 2025 UPS Rate & Service Guide Korea / DHL Express Service & Rate Guide 2025 Korea
export const COUNTRY_OPTIONS = [
  // Asia-Pacific
  { code: 'CN', name: '🇨🇳 China' },
  { code: 'CN-S', name: '🇨🇳 China (Southern)' },
  { code: 'JP', name: '🇯🇵 Japan' },
  { code: 'VN', name: '🇻🇳 Vietnam' },
  { code: 'SG', name: '🇸🇬 Singapore' },
  { code: 'HK', name: '🇭🇰 Hong Kong' },
  { code: 'TW', name: '🇹🇼 Taiwan' },
  { code: 'MO', name: '🇲🇴 Macau' },
  { code: 'TH', name: '🇹🇭 Thailand' },
  { code: 'PH', name: '🇵🇭 Philippines' },
  { code: 'ID', name: '🇮🇩 Indonesia' },
  { code: 'MY', name: '🇲🇾 Malaysia' },
  { code: 'BN', name: '🇧🇳 Brunei' },
  { code: 'KH', name: '🇰🇭 Cambodia' },
  { code: 'LA', name: '🇱🇦 Laos' },
  { code: 'MM', name: '🇲🇲 Myanmar' },
  { code: 'BD', name: '🇧🇩 Bangladesh' },
  { code: 'LK', name: '🇱🇰 Sri Lanka' },
  { code: 'MV', name: '🇲🇻 Maldives' },
  { code: 'NP', name: '🇳🇵 Nepal' },
  { code: 'MN', name: '🇲🇳 Mongolia' },
  { code: 'AU', name: '🇦🇺 Australia' },
  { code: 'NZ', name: '🇳🇿 New Zealand' },
  { code: 'IN', name: '🇮🇳 India' },
  { code: 'PK', name: '🇵🇰 Pakistan' },
  { code: 'PG', name: '🇵🇬 Papua New Guinea' },
  { code: 'FJ', name: '🇫🇯 Fiji' },
  // Americas
  { code: 'US', name: '🇺🇸 United States' },
  { code: 'CA', name: '🇨🇦 Canada' },
  { code: 'MX', name: '🇲🇽 Mexico' },
  { code: 'BR', name: '🇧🇷 Brazil' },
  { code: 'AR', name: '🇦🇷 Argentina' },
  { code: 'CL', name: '🇨🇱 Chile' },
  { code: 'CO', name: '🇨🇴 Colombia' },
  { code: 'PE', name: '🇵🇪 Peru' },
  { code: 'EC', name: '🇪🇨 Ecuador' },
  { code: 'VE', name: '🇻🇪 Venezuela' },
  { code: 'UY', name: '🇺🇾 Uruguay' },
  { code: 'PY', name: '🇵🇾 Paraguay' },
  { code: 'BO', name: '🇧🇴 Bolivia' },
  { code: 'CR', name: '🇨🇷 Costa Rica' },
  { code: 'PA', name: '🇵🇦 Panama' },
  { code: 'GT', name: '🇬🇹 Guatemala' },
  { code: 'HN', name: '🇭🇳 Honduras' },
  { code: 'SV', name: '🇸🇻 El Salvador' },
  { code: 'NI', name: '🇳🇮 Nicaragua' },
  { code: 'BZ', name: '🇧🇿 Belize' },
  { code: 'DO', name: '🇩🇴 Dominican Republic' },
  { code: 'JM', name: '🇯🇲 Jamaica' },
  { code: 'TT', name: '🇹🇹 Trinidad & Tobago' },
  { code: 'HT', name: '🇭🇹 Haiti' },
  { code: 'BS', name: '🇧🇸 Bahamas' },
  { code: 'BB', name: '🇧🇧 Barbados' },
  { code: 'SR', name: '🇸🇷 Suriname' },
  { code: 'GY', name: '🇬🇾 Guyana' },
  { code: 'PR', name: '🇵🇷 Puerto Rico' },
  // Europe — Western & Northern
  { code: 'DE', name: '🇩🇪 Germany' },
  { code: 'GB', name: '🇬🇧 United Kingdom' },
  { code: 'FR', name: '🇫🇷 France' },
  { code: 'IT', name: '🇮🇹 Italy' },
  { code: 'ES', name: '🇪🇸 Spain' },
  { code: 'NL', name: '🇳🇱 Netherlands' },
  { code: 'DK', name: '🇩🇰 Denmark' },
  { code: 'NO', name: '🇳🇴 Norway' },
  { code: 'SE', name: '🇸🇪 Sweden' },
  { code: 'FI', name: '🇫🇮 Finland' },
  { code: 'BE', name: '🇧🇪 Belgium' },
  { code: 'IE', name: '🇮🇪 Ireland' },
  { code: 'CH', name: '🇨🇭 Switzerland' },
  { code: 'AT', name: '🇦🇹 Austria' },
  { code: 'PT', name: '🇵🇹 Portugal' },
  { code: 'LU', name: '🇱🇺 Luxembourg' },
  { code: 'MC', name: '🇲🇨 Monaco' },
  { code: 'LI', name: '🇱🇮 Liechtenstein' },
  { code: 'AD', name: '🇦🇩 Andorra' },
  { code: 'IS', name: '🇮🇸 Iceland' },
  { code: 'GR', name: '🇬🇷 Greece' },
  { code: 'MT', name: '🇲🇹 Malta' },
  { code: 'CY', name: '🇨🇾 Cyprus' },
  { code: 'VA', name: '🇻🇦 Vatican City' },
  { code: 'SM', name: '🇸🇲 San Marino' },
  { code: 'GI', name: '🇬🇮 Gibraltar' },
  // Europe — Central & Eastern
  { code: 'CZ', name: '🇨🇿 Czech Republic' },
  { code: 'PL', name: '🇵🇱 Poland' },
  { code: 'HU', name: '🇭🇺 Hungary' },
  { code: 'SK', name: '🇸🇰 Slovakia' },
  { code: 'SI', name: '🇸🇮 Slovenia' },
  { code: 'HR', name: '🇭🇷 Croatia' },
  { code: 'RO', name: '🇷🇴 Romania' },
  { code: 'BG', name: '🇧🇬 Bulgaria' },
  { code: 'RS', name: '🇷🇸 Serbia' },
  { code: 'BA', name: '🇧🇦 Bosnia & Herzegovina' },
  { code: 'ME', name: '🇲🇪 Montenegro' },
  { code: 'MK', name: '🇲🇰 North Macedonia' },
  { code: 'AL', name: '🇦🇱 Albania' },
  { code: 'XK', name: '🇽🇰 Kosovo' },
  { code: 'LV', name: '🇱🇻 Latvia' },
  { code: 'LT', name: '🇱🇹 Lithuania' },
  { code: 'EE', name: '🇪🇪 Estonia' },
  { code: 'MD', name: '🇲🇩 Moldova' },
  { code: 'UA', name: '🇺🇦 Ukraine' },
  { code: 'BY', name: '🇧🇾 Belarus' },
  { code: 'RU', name: '🇷🇺 Russia' },
  // Middle East
  { code: 'AE', name: '🇦🇪 UAE' },
  { code: 'SA', name: '🇸🇦 Saudi Arabia' },
  { code: 'TR', name: '🇹🇷 Turkey' },
  { code: 'IL', name: '🇮🇱 Israel' },
  { code: 'JO', name: '🇯🇴 Jordan' },
  { code: 'LB', name: '🇱🇧 Lebanon' },
  { code: 'BH', name: '🇧🇭 Bahrain' },
  { code: 'QA', name: '🇶🇦 Qatar' },
  { code: 'KW', name: '🇰🇼 Kuwait' },
  { code: 'OM', name: '🇴🇲 Oman' },
  { code: 'IQ', name: '🇮🇶 Iraq' },
  { code: 'YE', name: '🇾🇪 Yemen' },
  // CIS & Central Asia
  { code: 'GE', name: '🇬🇪 Georgia' },
  { code: 'AM', name: '🇦🇲 Armenia' },
  { code: 'AZ', name: '🇦🇿 Azerbaijan' },
  { code: 'KZ', name: '🇰🇿 Kazakhstan' },
  { code: 'UZ', name: '🇺🇿 Uzbekistan' },
  { code: 'KG', name: '🇰🇬 Kyrgyzstan' },
  { code: 'TM', name: '🇹🇲 Turkmenistan' },
  { code: 'TJ', name: '🇹🇯 Tajikistan' },
  // Africa
  { code: 'ZA', name: '🇿🇦 South Africa' },
  { code: 'EG', name: '🇪🇬 Egypt' },
  { code: 'NG', name: '🇳🇬 Nigeria' },
  { code: 'KE', name: '🇰🇪 Kenya' },
  { code: 'GH', name: '🇬🇭 Ghana' },
  { code: 'ET', name: '🇪🇹 Ethiopia' },
  { code: 'TZ', name: '🇹🇿 Tanzania' },
  { code: 'UG', name: '🇺🇬 Uganda' },
  { code: 'MA', name: '🇲🇦 Morocco' },
  { code: 'TN', name: '🇹🇳 Tunisia' },
  { code: 'DZ', name: '🇩🇿 Algeria' },
  { code: 'SN', name: '🇸🇳 Senegal' },
  { code: 'CI', name: '🇨🇮 Ivory Coast' },
  { code: 'CM', name: '🇨🇲 Cameroon' },
  { code: 'AO', name: '🇦🇴 Angola' },
  { code: 'MZ', name: '🇲🇿 Mozambique' },
  { code: 'ZM', name: '🇿🇲 Zambia' },
  { code: 'ZW', name: '🇿🇼 Zimbabwe' },
  { code: 'BW', name: '🇧🇼 Botswana' },
  { code: 'NA', name: '🇳🇦 Namibia' },
  { code: 'MU', name: '🇲🇺 Mauritius' },
  { code: 'MG', name: '🇲🇬 Madagascar' },
  { code: 'RW', name: '🇷🇼 Rwanda' },
  { code: 'CD', name: '🇨🇩 DR Congo' },
  { code: 'CG', name: '🇨🇬 Congo' },
  { code: 'GA', name: '🇬🇦 Gabon' },
  { code: 'ML', name: '🇲🇱 Mali' },
  { code: 'BF', name: '🇧🇫 Burkina Faso' },
  { code: 'NE', name: '🇳🇪 Niger' },
  { code: 'TD', name: '🇹🇩 Chad' },
  { code: 'GM', name: '🇬🇲 Gambia' },
  { code: 'GN', name: '🇬🇳 Guinea' },
  { code: 'SL', name: '🇸🇱 Sierra Leone' },
  { code: 'LR', name: '🇱🇷 Liberia' },
  { code: 'TG', name: '🇹🇬 Togo' },
  { code: 'BJ', name: '🇧🇯 Benin' },
  { code: 'ER', name: '🇪🇷 Eritrea' },
  { code: 'DJ', name: '🇩🇯 Djibouti' },
  { code: 'MW', name: '🇲🇼 Malawi' },
  { code: 'LS', name: '🇱🇸 Lesotho' },
  { code: 'SZ', name: '🇸🇿 Eswatini' },
  { code: 'SC', name: '🇸🇨 Seychelles' },
  { code: 'CV', name: '🇨🇻 Cape Verde' },
  { code: 'BI', name: '🇧🇮 Burundi' },
  { code: 'CF', name: '🇨🇫 Central African Republic' },
  { code: 'KM', name: '🇰🇲 Comoros' },
  { code: 'GW', name: '🇬🇼 Guinea-Bissau' },
  { code: 'MR', name: '🇲🇷 Mauritania' },
  // SO (Somalia) removed — UPS/DHL unshippable
  { code: 'SD', name: '🇸🇩 Sudan' },
  { code: 'SS', name: '🇸🇸 South Sudan' },
  { code: 'LY', name: '🇱🇾 Libya' },
  // Caribbean & Overseas Territories
  { code: 'AF', name: '🇦🇫 Afghanistan' },
  { code: 'AG', name: '🇦🇬 Antigua & Barbuda' },
  { code: 'AI', name: '🇦🇮 Anguilla' },
  { code: 'AW', name: '🇦🇼 Aruba' },
  { code: 'CW', name: '🇨🇼 Curacao' },
  { code: 'DM', name: '🇩🇲 Dominica' },
  { code: 'GD', name: '🇬🇩 Grenada' },
  { code: 'FO', name: '🇫🇴 Faroe Islands' },
  { code: 'GL', name: '🇬🇱 Greenland' },
  { code: 'GP', name: '🇬🇵 Guadeloupe' },
  { code: 'KN', name: '🇰🇳 St. Kitts & Nevis' },
  { code: 'MP', name: '🇲🇵 Northern Mariana Islands' },
  { code: 'MQ', name: '🇲🇶 Martinique' },
  { code: 'MS', name: '🇲🇸 Montserrat' },
  { code: 'NC', name: '🇳🇨 New Caledonia' },
  { code: 'SX', name: '🇸🇽 St. Maarten' },
  { code: 'TC', name: '🇹🇨 Turks & Caicos' },
  { code: 'VI', name: '🇻🇮 US Virgin Islands' },
];

// ─── Zone-to-Country mappings for the calculator's zone filter ──────
// Derived from the carrier zone maps (src/config/*_zones.ts) so this list can
// never drift from the tables the calculation actually uses. Restricted to
// selectable countries (COUNTRY_OPTIONS); zones with no selectable country are
// omitted. A selectable country absent from every list simply has no zone for
// that carrier — the calculator surfaces this instead of guessing a rate.
const SELECTABLE_COUNTRY_CODES = new Set(COUNTRY_OPTIONS.map((c) => c.code));

const zoneSortKey = (zone: string): [number, string] => {
  const numeric = /^Z(\d+)$/.exec(zone);
  return numeric ? [Number(numeric[1]), ''] : [Number.MAX_SAFE_INTEGER, zone];
};

const deriveZoneCountries = (zoneMap: Record<string, ZoneInfo>): Record<string, string[]> => {
  const grouped = new Map<string, string[]>();
  for (const [code, info] of Object.entries(zoneMap)) {
    if (!SELECTABLE_COUNTRY_CODES.has(code)) continue;
    grouped.set(info.rateKey, [...(grouped.get(info.rateKey) ?? []), code]);
  }
  const zones = [...grouped.keys()].sort((a, b) => {
    const [aNum, aStr] = zoneSortKey(a);
    const [bNum, bStr] = zoneSortKey(b);
    return aNum - bNum || (aStr < bStr ? -1 : aStr > bStr ? 1 : 0);
  });
  return Object.fromEntries(
    zones.map((zone) => [zone, [...(grouped.get(zone) ?? [])].sort()]),
  );
};

export const UPS_ZONE_COUNTRIES: Record<string, string[]> = deriveZoneCountries(UPS_ZONE_MAP);
export const DHL_ZONE_COUNTRIES: Record<string, string[]> = deriveZoneCountries(DHL_ZONE_MAP);
export const FEDEX_ZONE_COUNTRIES: Record<string, string[]> =
  deriveZoneCountries(FEDEX_ZONE_MAP);

// ─── Nationality options for signup / admin ─────────────────────────
// Top 7 pinned (frequent B2B partners), rest alphabetical from COUNTRY_OPTIONS
const PINNED_NATIONALITY_CODES = ['KR', 'US', 'CN', 'JP', 'VN', 'TW', 'SG'];

export const NATIONALITY_OPTIONS: { code: string; name: string }[] = (() => {
  const pinned = PINNED_NATIONALITY_CODES.map((code) => {
    if (code === 'KR') return { code: 'KR', name: '🇰🇷 South Korea' };
    return COUNTRY_OPTIONS.find((c) => c.code === code)!;
  });
  const rest = COUNTRY_OPTIONS.filter((c) => !PINNED_NATIONALITY_CODES.includes(c.code)).sort(
    (a, b) => {
      const nameA = a.name.replace(/^[^\w]+/, '');
      const nameB = b.name.replace(/^[^\w]+/, '');
      return nameA.localeCompare(nameB);
    },
  );
  return [...pinned, ...rest];
})();

/** Look up display name (with flag) from country code */
export function getCountryDisplayName(code: string): string {
  if (!code) return '-';
  const found = NATIONALITY_OPTIONS.find((c) => c.code === code);
  return found ? found.name : code;
}

export const ORIGIN_COUNTRY_OPTIONS = [
  { code: 'KR', name: '🇰🇷 South Korea' },
  { code: 'CN', name: '🇨🇳 China' },
  { code: 'VN', name: '🇻🇳 Vietnam' },
  { code: 'US', name: '🇺🇸 United States' },
];

export const INCOTERM_OPTIONS = Object.values(Incoterm);

export const SEOUL_PICKUP_ZONES: {
  districts: string[];
  districtsEn: string[];
  cost: number;
  costUsd: number;
}[] = [
  {
    districts: ['강서', '양천', '마포'],
    districtsEn: ['Gangseo', 'Yangcheon', 'Mapo'],
    cost: 30000,
    costUsd: 30,
  },
  {
    districts: ['구로', '금천', '관악', '동작', '영등포'],
    districtsEn: ['Guro', 'Geumcheon', 'Gwanak', 'Dongjak', 'Yeongdeungpo'],
    cost: 35000,
    costUsd: 35,
  },
  {
    districts: ['은평', '서대문', '종로', '중구', '용산'],
    districtsEn: ['Eunpyeong', 'Seodaemun', 'Jongno', 'Jung-gu', 'Yongsan'],
    cost: 40000,
    costUsd: 40,
  },
  {
    districts: ['강남', '서초', '송파'],
    districtsEn: ['Gangnam', 'Seocho', 'Songpa'],
    cost: 45000,
    costUsd: 45,
  },
  {
    districts: ['동대문', '성동', '광진', '강동'],
    districtsEn: ['Dongdaemun', 'Seongdong', 'Gwangjin', 'Gangdong'],
    cost: 45000,
    costUsd: 45,
  },
  {
    districts: ['강북', '도봉', '노원', '중랑'],
    districtsEn: ['Gangbuk', 'Dobong', 'Nowon', 'Jungnang'],
    cost: 55000,
    costUsd: 55,
  },
];
