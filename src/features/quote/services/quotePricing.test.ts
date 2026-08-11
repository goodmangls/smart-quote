import { describe, it, expect } from 'vitest';
import { calculateQuote } from './calculationService';
import { PackingType, Incoterm, QuoteInput } from '@/types';
import { MAX_MARGIN_PERCENT } from '@/config/business-rules';
import {
  DEFAULT_FSC_PERCENT,
  DEFAULT_FSC_PERCENT_DHL,
  DEFAULT_FSC_PERCENT_FEDEX,
} from '@/config/rates';

/**
 * Characterization tests for the quote pricing pipeline.
 *
 * Written BEFORE extracting computeQuotePricing out of calculateQuote. Every
 * expectation records behaviour that exists today; none of it is new.
 *
 * The existing suite asserts that totals are "greater than 0" but never pins the
 * rules that produce them — margin clamping, the per-carrier FSC default, the
 * markup formula, or the rounding step. Those are exactly the rules a refactor
 * could shift without any test noticing, and each one moves the quoted price.
 */
describe('quote pricing rules', () => {
  const baseInput: QuoteInput = {
    originCountry: 'KR',
    destinationCountry: 'US',
    destinationZip: '10001',
    incoterm: Incoterm.DAP,
    packingType: PackingType.NONE,
    items: [{ id: '1', width: 30, length: 40, height: 30, weight: 10, quantity: 1 }],
    marginPercent: 15,
    dutyTaxEstimate: 0,
    exchangeRate: 1300,
    fscPercent: 30,
    overseasCarrier: 'UPS',
  };

  const quote = (overrides: Partial<QuoteInput> = {}) =>
    calculateQuote({ ...baseInput, ...overrides });

  describe('margin is clamped, not trusted', () => {
    it('clamps a negative margin to 0', () => {
      expect(quote({ marginPercent: -50 }).profitMargin).toBe(0);
    });

    it(`clamps a margin above MAX_MARGIN_PERCENT (${MAX_MARGIN_PERCENT}) to the cap`, () => {
      expect(quote({ marginPercent: 999 }).profitMargin).toBe(MAX_MARGIN_PERCENT);
    });

    it('defaults to 15 when margin is undefined', () => {
      expect(quote({ marginPercent: undefined }).profitMargin).toBe(15);
    });

    it('keeps an explicit margin of 0 rather than falling back to 15', () => {
      // `?? 15` — nullish, so a supplied 0 survives.
      expect(quote({ marginPercent: 0 }).profitMargin).toBe(0);
    });
  });

  describe('markup formula', () => {
    it('applies margin to the base rate only: base × (1 + m/100)', () => {
      const r = quote({ marginPercent: 20, fscPercent: 0.0001 });
      const base = r.breakdown.intlBase;
      // profitAmount is baseWithMargin − base, i.e. base × m/100
      expect(r.profitAmount).toBeCloseTo(base * 0.2, 5);
    });

    it('reports zero profit at zero margin', () => {
      expect(quote({ marginPercent: 0 }).profitAmount).toBe(0);
    });
  });

  describe('FSC default depends on the carrier', () => {
    // `input.fscPercent || default` — 0 is falsy, so it falls through to the
    // carrier default rather than meaning "no fuel surcharge".
    const fscOf = (carrier: NonNullable<QuoteInput['overseasCarrier']>) => {
      const r = quote({ overseasCarrier: carrier, fscPercent: 0, marginPercent: 0 });
      return { applied: r.breakdown.intlFsc, base: r.breakdown.intlBase };
    };

    it('uses the UPS default for UPS', () => {
      const { applied, base } = fscOf('UPS');
      expect(applied).toBe(Math.round(base * (DEFAULT_FSC_PERCENT / 100)));
    });

    it('uses the DHL default for DHL', () => {
      const { applied, base } = fscOf('DHL');
      expect(applied).toBe(Math.round(base * (DEFAULT_FSC_PERCENT_DHL / 100)));
    });

    it('uses the FedEx default for FEDEX', () => {
      const { applied, base } = fscOf('FEDEX');
      expect(applied).toBe(Math.round(base * (DEFAULT_FSC_PERCENT_FEDEX / 100)));
    });

    it('an explicit fscPercent wins over the default', () => {
      const r = quote({ fscPercent: 10, marginPercent: 0 });
      expect(r.breakdown.intlFsc).toBe(Math.round(r.breakdown.intlBase * 0.1));
    });
  });

  describe('FSC is charged on base+margin but costed on base alone', () => {
    it('quoted FSC exceeds cost FSC when a margin is applied', () => {
      const r = quote({ marginPercent: 30, fscPercent: 40 });
      const costFsc = Math.round(r.breakdown.intlBase * 0.4);
      expect(r.breakdown.intlFsc).toBeGreaterThan(costFsc);
    });

    it('the two coincide at zero margin', () => {
      const r = quote({ marginPercent: 0, fscPercent: 40 });
      expect(r.breakdown.intlFsc).toBe(Math.round(r.breakdown.intlBase * 0.4));
    });
  });

  describe('rounding', () => {
    it('rounds the quoted total up to the nearest KRW 100', () => {
      const total = quote().totalQuoteAmount;
      expect(total % 100).toBe(0);
    });

    it('rounds up, never down', () => {
      const r = quote();
      const raw = r.breakdown.intlBase + r.breakdown.intlFsc + r.profitAmount;
      expect(r.totalQuoteAmount).toBeGreaterThanOrEqual(Math.floor(raw));
    });

    it('converts to USD using the supplied exchange rate', () => {
      const r = quote({ exchangeRate: 1000 });
      expect(r.totalQuoteAmountUSD).toBeCloseTo(r.totalQuoteAmount / 1000, 6);
    });
  });

  describe('warnings', () => {
    it('warns when the margin is below 10%', () => {
      expect(quote({ marginPercent: 5 }).warnings.join(' ')).toMatch(/Low Margin/i);
    });

    it('does not warn at 10% or above', () => {
      expect(quote({ marginPercent: 10 }).warnings.join(' ')).not.toMatch(/Low Margin/i);
    });

    it('warns about collect terms for EXW and FOB', () => {
      expect(quote({ incoterm: Incoterm.EXW }).warnings.join(' ')).toMatch(/Collect Term/i);
      expect(quote({ incoterm: Incoterm.FOB }).warnings.join(' ')).toMatch(/Collect Term/i);
    });

    it('does not warn about collect terms for DAP', () => {
      expect(quote({ incoterm: Incoterm.DAP }).warnings.join(' ')).not.toMatch(/Collect Term/i);
    });
  });

  describe('cost total excludes margin', () => {
    it('total cost is unaffected by the margin percentage', () => {
      const low = quote({ marginPercent: 0 }).totalCostAmount;
      const high = quote({ marginPercent: 40 }).totalCostAmount;
      expect(high).toBe(low);
    });

    it('the quoted total does rise with margin', () => {
      const low = quote({ marginPercent: 0 }).totalQuoteAmount;
      const high = quote({ marginPercent: 40 }).totalQuoteAmount;
      expect(high).toBeGreaterThan(low);
    });
  });
});
