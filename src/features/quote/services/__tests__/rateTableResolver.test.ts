import { ShippingItemType } from '@/types';
import { resolveCarrierRateTables, roundToHalfKg } from '../rateTableResolver';
import { calculateUpsCosts } from '../upsCalculation';
import { calculateDhlCosts } from '../dhlCalculation';
import { calculateFedexCosts } from '../fedexCalculation';
import { UPS_DOC_EXACT_RATES, UPS_EXACT_RATES } from '@/config/ups_tariff';
import { DHL_DOC_EXACT_RATES, DHL_EXACT_RATES } from '@/config/dhl_tariff';
import {
  FEDEX_ENVELOPE_EXACT_RATES,
  FEDEX_PAK_EXACT_RATES,
  FEDEX_EXACT_RATES,
} from '@/config/fedex_tariff';

describe('rateTableResolver', () => {
  it('roundToHalfKg rounds up to 0.5 increments', () => {
    expect(roundToHalfKg(0.1)).toBe(0.5);
    expect(roundToHalfKg(1.1)).toBe(1.5);
    expect(roundToHalfKg(2)).toBe(2);
  });

  it('UPS Document within 5kg uses Document table', () => {
    const { exact, usedDocument } = resolveCarrierRateTables(
      'UPS',
      ShippingItemType.DOCUMENT,
      1,
    );
    expect(usedDocument).toBe(true);
    expect(exact).toBe(UPS_DOC_EXACT_RATES);
  });

  it('UPS Document above 5kg falls back to Non-Document', () => {
    const { exact, usedDocument } = resolveCarrierRateTables(
      'UPS',
      ShippingItemType.DOCUMENT,
      5.1,
    );
    expect(usedDocument).toBe(false);
    expect(exact).toBe(UPS_EXACT_RATES);
  });

  it('DHL Document within 2kg uses Document table', () => {
    const { exact, usedDocument } = resolveCarrierRateTables(
      'DHL',
      ShippingItemType.DOCUMENT,
      2,
    );
    expect(usedDocument).toBe(true);
    expect(exact).toBe(DHL_DOC_EXACT_RATES);
  });

  it('DHL Document above 2kg falls back to Non-Document', () => {
    const { exact, usedDocument } = resolveCarrierRateTables(
      'DHL',
      ShippingItemType.DOCUMENT,
      2.1,
    );
    expect(usedDocument).toBe(false);
    expect(exact).toBe(DHL_EXACT_RATES);
  });

  it('FedEx Document ≤0.5kg uses Envelope table', () => {
    const { exact, usedDocument } = resolveCarrierRateTables(
      'FEDEX',
      ShippingItemType.DOCUMENT,
      0.5,
    );
    expect(usedDocument).toBe(true);
    expect(exact).toBe(FEDEX_ENVELOPE_EXACT_RATES);
  });

  it('FedEx Document ≤2.5kg uses Pak table', () => {
    const { exact, usedDocument } = resolveCarrierRateTables(
      'FEDEX',
      ShippingItemType.DOCUMENT,
      1.5,
    );
    expect(usedDocument).toBe(true);
    expect(exact).toBe(FEDEX_PAK_EXACT_RATES);
  });

  it('FedEx Document above 2.5kg falls back to IP', () => {
    const { exact, usedDocument } = resolveCarrierRateTables(
      'FEDEX',
      ShippingItemType.DOCUMENT,
      3,
    );
    expect(usedDocument).toBe(false);
    expect(exact).toBe(FEDEX_EXACT_RATES);
  });

  it('FedEx Parcel always uses IP even at 0.5kg', () => {
    const { exact, usedDocument } = resolveCarrierRateTables(
      'FEDEX',
      ShippingItemType.NON_DOCUMENT,
      0.5,
    );
    expect(usedDocument).toBe(false);
    expect(exact).toBe(FEDEX_EXACT_RATES);
  });

  it('defaults to Non-Document when type omitted', () => {
    const { usedDocument } = resolveCarrierRateTables('UPS', undefined, 1);
    expect(usedDocument).toBe(false);
  });
});

describe('Document vs Non-Document rate lookup', () => {
  it('UPS Document 1kg Z2 (JP) uses Document rate', () => {
    expect(calculateUpsCosts(1, 'JP', ShippingItemType.DOCUMENT).intlBase).toBe(30134);
    expect(calculateUpsCosts(1, 'JP', ShippingItemType.NON_DOCUMENT).intlBase).toBe(55784);
  });

  it('DHL Document 1kg Z1 differs from Non-Document', () => {
    const doc = calculateDhlCosts(1, 'SG', ShippingItemType.DOCUMENT).intlBase;
    const nonDoc = calculateDhlCosts(1, 'SG', ShippingItemType.NON_DOCUMENT).intlBase;
    expect(doc).toBe(DHL_DOC_EXACT_RATES.Z1[1]);
    expect(nonDoc).toBe(DHL_EXACT_RATES.Z1[1]);
    expect(doc).not.toBe(nonDoc);
  });

  it('FedEx PDF spot-checks: Y Envelope/Pak/IP and P 1.0 IP', () => {
    expect(calculateFedexCosts(0.5, 'SG', ShippingItemType.DOCUMENT).intlBase).toBe(24060);
    expect(calculateFedexCosts(0.5, 'SG', ShippingItemType.DOCUMENT).appliedZone).toContain('Y');
    expect(calculateFedexCosts(0.5, 'SG', ShippingItemType.NON_DOCUMENT).intlBase).toBe(66620);
    expect(calculateFedexCosts(1.0, 'SG', ShippingItemType.DOCUMENT).intlBase).toBe(47330);
    expect(calculateFedexCosts(1.0, 'JP', ShippingItemType.NON_DOCUMENT).intlBase).toBe(76900);
  });
});
