import type { ChargeLine, OrderLine, Quotation, QuotationItem, TradeItem } from './types';

/**
 * Totals for the document sheets. Money is rounded to 2 decimals and weights
 * to 3, at each line and at the total, so a float like 0.1 + 0.2 never shows
 * up on a printed invoice.
 */

const roundTo = (value: number, digits: number): number => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const roundMoney = (value: number): number => roundTo(value, 2);
export const roundWeight = (value: number): number => roundTo(value, 3);

const sum = (values: number[]): number => values.reduce((acc, v) => acc + v, 0);

// ── Quotation ────────────────────────────────────────────────────────────────

export interface QuotationTotals {
  subtotal: number;
  vat: number;
  total: number;
}

/**
 * `excluded` adds VAT on top of the item sum, `included` treats the item sum as
 * gross and backs the VAT out of it, `none` shows no VAT line at all.
 */
export const quotationTotals = (
  items: readonly QuotationItem[],
  vatMode: Quotation['vatMode'],
  vatRate: number,
): QuotationTotals => {
  const itemSum = roundMoney(sum(items.map((i) => i.amount)));
  const rate = vatRate / 100;
  if (vatMode === 'none' || rate <= 0) {
    return { subtotal: itemSum, vat: 0, total: itemSum };
  }
  if (vatMode === 'included') {
    const subtotal = roundMoney(itemSum / (1 + rate));
    return { subtotal, vat: roundMoney(itemSum - subtotal), total: itemSum };
  }
  const vat = roundMoney(itemSum * rate);
  return { subtotal: itemSum, vat, total: roundMoney(itemSum + vat) };
};

// ── Commercial invoice ───────────────────────────────────────────────────────

export const lineAmount = (item: Pick<TradeItem, 'quantity' | 'unitPrice'>): number =>
  roundMoney(item.quantity * item.unitPrice);

export interface InvoiceTotals {
  quantity: number;
  amount: number;
}

export const invoiceTotals = (items: readonly TradeItem[]): InvoiceTotals => ({
  quantity: roundWeight(sum(items.map((i) => i.quantity))),
  amount: roundMoney(sum(items.map(lineAmount))),
});

// ── Packing list ─────────────────────────────────────────────────────────────

/**
 * Volume of one line in cubic metres: the dimensions are per package, as
 * measured, so the line volume is L×W×H × package count. No packing buffer is
 * added — that padding belongs to crating cost, not to a packing list.
 */
export const lineCbm = (
  item: Pick<TradeItem, 'lengthCm' | 'widthCm' | 'heightCm' | 'packages'>,
): number =>
  roundWeight(((item.lengthCm * item.widthCm * item.heightCm) / 1_000_000) * item.packages);

export interface PackingTotals {
  packages: number;
  netWeightKg: number;
  grossWeightKg: number;
  cbm: number;
}

/** Net and gross weights are entered per line (the line total), not per package. */
export const packingTotals = (items: readonly TradeItem[]): PackingTotals => ({
  packages: roundWeight(sum(items.map((i) => i.packages))),
  netWeightKg: roundWeight(sum(items.map((i) => i.netWeightKg))),
  grossWeightKg: roundWeight(sum(items.map((i) => i.grossWeightKg))),
  cbm: roundWeight(sum(items.map(lineCbm))),
});

// ── Orders (purchase order, offer sheet / sales contract) ────────────────────

export interface OrderTotals {
  subtotal: number;
  tax: number;
  total: number;
}

export const orderTotals = (items: readonly OrderLine[], taxRate = 0): OrderTotals => {
  const subtotal = roundMoney(sum(items.map(lineAmount)));
  const tax = taxRate > 0 ? roundMoney(subtotal * (taxRate / 100)) : 0;
  return { subtotal, tax, total: roundMoney(subtotal + tax) };
};

// ── Forwarder charges (freight invoice, arrival notice) ──────────────────────

export const chargeAmount = (line: Pick<ChargeLine, 'quantity' | 'rate'>): number =>
  roundMoney(line.quantity * line.rate);

export interface ChargeTotals {
  taxable: number;
  nonTaxable: number;
  vat: number;
  total: number;
}

/** VAT applies to taxable lines only — zero-rated international freight is left out. */
export const chargeTotals = (charges: readonly ChargeLine[], vatRate: number): ChargeTotals => {
  const taxable = roundMoney(sum(charges.filter((c) => c.taxable).map(chargeAmount)));
  const nonTaxable = roundMoney(sum(charges.filter((c) => !c.taxable).map(chargeAmount)));
  const vat = vatRate > 0 ? roundMoney(taxable * (vatRate / 100)) : 0;
  return { taxable, nonTaxable, vat, total: roundMoney(taxable + nonTaxable + vat) };
};

// ── Formatting ───────────────────────────────────────────────────────────────

/** Whole-unit currencies print without decimals. */
const ZERO_DECIMAL = new Set(['KRW', 'JPY', 'VND']);

export const formatMoney = (value: number, currency: string): string => {
  const digits = ZERO_DECIMAL.has(currency.toUpperCase()) ? 0 : 2;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

export const formatQty = (value: number, maxDigits = 3): string =>
  value.toLocaleString('en-US', { maximumFractionDigits: maxDigits });
