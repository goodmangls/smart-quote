import { ShippingItemType } from '@/types';
import {
  UPS_EXACT_RATES,
  UPS_RANGE_RATES,
  UPS_DOC_EXACT_RATES,
  UPS_DOC_MAX_KG,
} from '@/config/ups_tariff';
import {
  DHL_EXACT_RATES,
  DHL_RANGE_RATES,
  DHL_DOC_EXACT_RATES,
  DHL_DOC_MAX_KG,
} from '@/config/dhl_tariff';

export type ExactRateTable = Record<string, Record<number, number>>;
export type RangeRateTable = ReadonlyArray<{
  min: number;
  max: number;
  rates: Record<string, number>;
}>;

/** Round up to next 0.5kg rating increment (mirrors carrierRateEngine). */
export const roundToHalfKg = (weight: number): number => Math.ceil(weight * 2) / 2;

/**
 * Pick exact + range tables for a carrier based on shipping item type.
 * Document tables only apply within PDF weight caps; heavier → Non-Document.
 */
export const resolveCarrierRateTables = (
  carrier: 'UPS' | 'DHL',
  shippingItemType: ShippingItemType | undefined,
  billableWeight: number,
): { exact: ExactRateTable; range: RangeRateTable; usedDocument: boolean } => {
  const isDocument = shippingItemType === ShippingItemType.DOCUMENT;
  const rated = roundToHalfKg(billableWeight);

  if (carrier === 'DHL') {
    if (isDocument && rated <= DHL_DOC_MAX_KG) {
      return { exact: DHL_DOC_EXACT_RATES, range: DHL_RANGE_RATES, usedDocument: true };
    }
    return { exact: DHL_EXACT_RATES, range: DHL_RANGE_RATES, usedDocument: false };
  }

  if (isDocument && rated <= UPS_DOC_MAX_KG) {
    return { exact: UPS_DOC_EXACT_RATES, range: UPS_RANGE_RATES, usedDocument: true };
  }
  return { exact: UPS_EXACT_RATES, range: UPS_RANGE_RATES, usedDocument: false };
};
