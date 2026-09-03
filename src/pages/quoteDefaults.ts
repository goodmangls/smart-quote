import { Incoterm, PackingType, ShippingItemType } from '@/types';
import type { QuoteInput } from '@/types';
import { DEFAULT_EXCHANGE_RATE, DEFAULT_FSC_PERCENT } from '@/config/rates';

/**
 * Margin an admin's quote starts at.
 *
 * 0 on purpose: the margin is the admin's decision, and a non-zero default meant
 * an admin who never touched the field shipped a quote carrying a number nobody
 * chose. An explicit 0 survives the round trip — the calculator honours it
 * (quotePricing.test.ts) and so does the API (quote_input_defaults_spec.rb,
 * "keeps a margin of 0 instead of falling back to 15").
 *
 * Members are unaffected: they keep INITIAL_INPUT.marginPercent below and the
 * rule-based auto-resolution in QuoteCalculator.
 */
export const ADMIN_DEFAULT_MARGIN_PERCENT = 0;

/**
 * A fresh quote for this role.
 *
 * Reset has to go through here rather than `INITIAL_INPUT` directly: the admin
 * 0% default is applied by an effect keyed on `isAdmin`, which does NOT re-fire
 * on reset (the role never changed). Resetting to the raw INITIAL_INPUT put an
 * admin back on the member's 15% and quietly broke "admin always starts at 0".
 */
export function initialInputFor(isAdmin: boolean): QuoteInput {
  return isAdmin
    ? { ...INITIAL_INPUT, marginPercent: ADMIN_DEFAULT_MARGIN_PERCENT }
    : INITIAL_INPUT;
}

export const INITIAL_INPUT: QuoteInput = {
  originCountry: 'KR',
  destinationCountry: 'US',
  destinationZip: '',
  shippingMode: 'Door-to-Door',
  incoterm: Incoterm.DAP,
  packingType: PackingType.NONE,
  shippingItemType: ShippingItemType.NON_DOCUMENT,
  items: [{ id: '1', width: 10, length: 10, height: 10, weight: 0.5, quantity: 1 }],
  marginPercent: 15,
  dutyTaxEstimate: 0,
  exchangeRate: DEFAULT_EXCHANGE_RATE,
  fscPercent: DEFAULT_FSC_PERCENT,
  overseasCarrier: 'UPS',
  manualPackingCost: undefined,
};
