import { calculateQuote } from '../calculationService';
import type { QuoteInput } from '@/types';
import fixtures from '../../../../../shared/test-fixtures/calculation-parity.json';

/**
 * Every fixture carries an `expected` block asserted to the KRW here and, with
 * the same numbers, in spec/services/calculation_parity_spec.rb. Sharing an
 * input file does not by itself make two implementations agree — only the
 * baked expected values do. (The historical ~5% UPS display-vs-saved gap was
 * closed 2026-08-17 when the UPS/DHL add-on mirrors landed on the backend.)
 */
type ExpectedBlock = {
  totalQuoteAmount: number;
  totalCostAmount: number;
  billableWeight: number;
  intlBase: number;
  carrierAddOnTotal: number;
  carrierAddOnCodes: string[];
};

describe('Calculation Parity Tests (Frontend)', () => {
  fixtures.fixtures
    .filter((f): f is typeof f & { expected: ExpectedBlock } => 'expected' in f)
    .forEach((fixture) => {
      it(`matches the backend to the KRW: ${fixture.name}`, () => {
        const r = calculateQuote(fixture.input as unknown as QuoteInput);
        const e = fixture.expected;

        expect(r.totalQuoteAmount).toBe(e.totalQuoteAmount);
        expect(r.totalCostAmount).toBeCloseTo(e.totalCostAmount, 4);
        expect(r.billableWeight).toBeCloseTo(e.billableWeight, 4);
        expect(r.breakdown.intlBase).toBeCloseTo(e.intlBase, 4);
        expect(r.breakdown.carrierAddOnTotal ?? 0).toBeCloseTo(e.carrierAddOnTotal, 4);
        expect((r.breakdown.carrierAddOnDetails ?? []).map((d) => d.code).sort()).toEqual(
          e.carrierAddOnCodes,
        );
      });
    });

  fixtures.fixtures.forEach((fixture) => {
    it(`produces valid output: ${fixture.name}`, () => {
      const result = calculateQuote(fixture.input as unknown as QuoteInput);

      // Structural assertions
      expect(result.totalCostAmount).toBeGreaterThanOrEqual(0);
      expect(result.totalQuoteAmount).toBeGreaterThanOrEqual(0);
      expect(result.carrier).toBeDefined();
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.totalCost).toBe(result.totalCostAmount);

      // Verify all breakdown fields exist
      expect(result.breakdown).toEqual(
        expect.objectContaining({
          packingMaterial: expect.any(Number),
          packingLabor: expect.any(Number),
          packingFumigation: expect.any(Number),
          handlingFees: expect.any(Number),
          pickupInSeoul: expect.any(Number),
          intlBase: expect.any(Number),
          intlFsc: expect.any(Number),
          intlWarRisk: expect.any(Number),
          intlSurge: expect.any(Number),
          destDuty: expect.any(Number),
          totalCost: expect.any(Number),
        }),
      );
    });
  });

  it('includes pickupInSeoulCost in totalCostAmount', () => {
    const fixture = fixtures.fixtures.find((f) => f.name === 'dhl_eu_with_pickup')!;
    const result = calculateQuote(fixture.input as unknown as QuoteInput);

    expect(result.breakdown.pickupInSeoul).toBe(50000);
    // totalCost must include pickup
    expect(result.totalCostAmount).toBeGreaterThan(50000);
  });

  it('includes manualSurgeCost in breakdown.intlSurge', () => {
    const fixture = fixtures.fixtures.find((f) => f.name === 'ups_us_ddp_full_options')!;
    const result = calculateQuote(fixture.input as unknown as QuoteInput);

    expect(result.breakdown.intlSurge).toBe(35000);
  });

  it('handling fee is always 0 (no auto handling fee)', () => {
    const fixture = fixtures.fixtures.find((f) => f.name === 'basic_ups_us_wooden_box')!;
    const result = calculateQuote(fixture.input as unknown as QuoteInput);

    expect(result.breakdown.handlingFees).toBe(0);
  });

  it('zeroes fumigation when manualPackingCost overrides Packing & Docs', () => {
    const fixture = fixtures.fixtures.find((f) => f.name === 'ups_jp_manual_packing')!;
    const result = calculateQuote(fixture.input as unknown as QuoteInput);

    expect(result.breakdown.handlingFees).toBe(0);
    expect(result.breakdown.packingFumigation).toBe(0);
  });

  it('snapshots all fixture outputs for cross-platform comparison', () => {
    const snapshots: Record<string, object> = {};

    fixtures.fixtures.forEach((fixture) => {
      const result = calculateQuote(fixture.input as unknown as QuoteInput);
      snapshots[fixture.name] = {
        totalCostAmount: result.totalCostAmount,
        totalQuoteAmount: result.totalQuoteAmount,
        totalQuoteAmountUSD: Math.round(result.totalQuoteAmountUSD * 100) / 100,
        profitMargin: result.profitMargin,
        billableWeight: result.billableWeight,
        carrier: result.carrier,
        breakdown: result.breakdown,
      };
    });

    expect(snapshots).toMatchSnapshot();
  });
});
