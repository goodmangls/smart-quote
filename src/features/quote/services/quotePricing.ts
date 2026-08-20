import { DEFAULT_EXCHANGE_RATE, defaultFscFor } from '@/config/rates';
import { MAX_MARGIN_PERCENT } from '@/config/business-rules';

/**
 * The money math of a quote, extracted from calculateQuote (cyclomatic 30).
 *
 * Pure: same inputs, same numbers, no dependency on how the carrier costs were
 * obtained. Behaviour is pinned by quotePricing.test.ts, which was written before
 * this file existed.
 *
 * Pricing order — margin applies to the carrier base rate only, and FSC is then
 * charged on base+margin while the *cost* side charges FSC on base alone. That
 * gap is where the margin on fuel comes from, so the two must not be merged.
 *
 *   1. base rate            (carrier tariff)
 *   2. + margin             base × (1 + m/100)
 *   3. + FSC                (base + margin) × fsc%
 *   4. + add-ons            packing, pickup, surcharges, carrier add-ons, duty — no margin
 *   = quote, rounded up to the nearest KRW 100
 */
export interface QuotePricingInput {
  baseRate: number;
  carrier: string;
  /** Raw request value. Clamped to [0, MAX_MARGIN_PERCENT]; undefined/null → 15. */
  marginPercent?: number | null;
  /** Raw request value. Falsy (including 0) falls back to the carrier default. */
  fscPercent?: number | null;
  exchangeRate?: number | null;
  intlWarRisk: number;
  packingTotal: number;
  pickupInSeoul: number;
  surgeCost: number;
  carrierAddOnTotal: number;
  destDuty: number;
}

export interface QuotePricingResult {
  safeMarginPercent: number;
  marginAmount: number;
  fscRate: number;
  /** FSC billed to the customer — charged on base + margin. */
  quotedFsc: number;
  /** FSC we actually pay the carrier — charged on base alone. */
  costFsc: number;
  addOnTotal: number;
  totalCostAmount: number;
  totalQuoteAmount: number;
  totalQuoteAmountUSD: number;
}

export const computeQuotePricing = (input: QuotePricingInput): QuotePricingResult => {
  const {
    baseRate,
    carrier,
    intlWarRisk,
    packingTotal,
    pickupInSeoul,
    surgeCost,
    carrierAddOnTotal,
    destDuty,
  } = input;

  const exchangeRate = input.exchangeRate || DEFAULT_EXCHANGE_RATE;
  // `??` not `||` — an explicit 0 is a real margin and must survive.
  const safeMarginPercent = Math.min(Math.max(input.marginPercent ?? 15, 0), MAX_MARGIN_PERCENT);

  const baseWithMargin = baseRate * (1 + safeMarginPercent / 100);
  const marginAmount = baseWithMargin - baseRate;

  // `??` not `||` — a supplied 0 is a real "no fuel surcharge" and must
  // survive, exactly as an explicit margin of 0 does above. The backend has
  // always read this field with `.nil?`, so using `||` here made a quote with
  // fscPercent 0 display the carrier default while the stored quote charged
  // nothing. "No value at all" is the only case that takes the default; the
  // FSC input resolves an emptied field to the carrier default before it ever
  // reaches this function (see FinancialSection).
  const fscRate = (input.fscPercent ?? defaultFscFor(carrier)) / 100;
  const quotedFsc = Math.round(baseWithMargin * fscRate);
  const costFsc = Math.round(baseRate * fscRate);

  const addOnTotal =
    packingTotal + pickupInSeoul + surgeCost + carrierAddOnTotal + destDuty + intlWarRisk;

  const totalCostAmount =
    baseRate +
    costFsc +
    intlWarRisk +
    surgeCost +
    packingTotal +
    carrierAddOnTotal +
    destDuty +
    pickupInSeoul;

  const rawQuoteAmount = baseWithMargin + quotedFsc + addOnTotal;
  const totalQuoteAmount = Math.ceil(rawQuoteAmount / 100) * 100;

  return {
    safeMarginPercent,
    marginAmount,
    fscRate,
    quotedFsc,
    costFsc,
    addOnTotal,
    totalCostAmount,
    totalQuoteAmount,
    totalQuoteAmountUSD: totalQuoteAmount / exchangeRate,
  };
};
