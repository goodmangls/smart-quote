import { determineFedexZone } from '@/config/fedex_zones';
import { WAR_RISK_SURCHARGE_RATE, TRANSIT_TIMES } from '@/config/rates';
import { ShippingItemType } from '@/types';
import { lookupCarrierRate, CarrierCostResult } from './carrierRateEngine';
import { resolveCarrierRateTables } from './rateTableResolver';

export { determineFedexZone };

export const calculateFedexCosts = (
  billableWeight: number,
  country: string,
  shippingItemType: ShippingItemType = ShippingItemType.NON_DOCUMENT,
): CarrierCostResult => {
  const zoneInfo = determineFedexZone(country);
  const { exact, range } = resolveCarrierRateTables('FEDEX', shippingItemType, billableWeight);
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
    transitTime: TRANSIT_TIMES.FEDEX,
  };
};
