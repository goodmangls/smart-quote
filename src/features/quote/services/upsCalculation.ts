import { determineUpsZone } from '@/config/ups_zones';
import { WAR_RISK_SURCHARGE_RATE, TRANSIT_TIMES } from '@/config/rates';
import { ShippingItemType } from '@/types';
import { lookupCarrierRate, CarrierCostResult } from './carrierRateEngine';
import { resolveCarrierRateTables } from './rateTableResolver';
import { ZoneNotFoundError } from './zoneNotFoundError';

export { determineUpsZone };

export const calculateUpsCosts = (
  billableWeight: number,
  country: string,
  shippingItemType: ShippingItemType = ShippingItemType.NON_DOCUMENT,
): CarrierCostResult => {
  const zoneInfo = determineUpsZone(country);
  if (!zoneInfo) throw new ZoneNotFoundError('UPS', country);
  const { exact, range } = resolveCarrierRateTables('UPS', shippingItemType, billableWeight);
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
    transitTime: TRANSIT_TIMES.UPS,
  };
};
