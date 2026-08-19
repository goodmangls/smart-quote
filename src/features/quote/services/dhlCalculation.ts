import { determineDhlZone } from '@/config/dhl_zones';
import { WAR_RISK_SURCHARGE_RATE, TRANSIT_TIMES } from '@/config/rates';
import { ShippingItemType } from '@/types';
import { lookupCarrierRate, CarrierCostResult } from './carrierRateEngine';
import { resolveCarrierRateTables } from './rateTableResolver';
import { ZoneNotFoundError } from './zoneNotFoundError';

export { determineDhlZone };

export const calculateDhlCosts = (
  billableWeight: number,
  country: string,
  shippingItemType: ShippingItemType = ShippingItemType.NON_DOCUMENT,
): CarrierCostResult => {
  const zoneInfo = determineDhlZone(country);
  if (!zoneInfo) throw new ZoneNotFoundError('DHL', country);
  const { exact, range } = resolveCarrierRateTables('DHL', shippingItemType, billableWeight);
  const intlBase = lookupCarrierRate(
    billableWeight,
    zoneInfo.rateKey,
    exact,
    range as Parameters<typeof lookupCarrierRate>[3],
  );
  const intlWarRisk = intlBase * (WAR_RISK_SURCHARGE_RATE / 100);
  return {
    intlBase,
    intlFsc: 0,
    intlWarRisk,
    appliedZone: zoneInfo.label,
    transitTime: TRANSIT_TIMES.DHL,
  };
};
