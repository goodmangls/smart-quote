import {
  formatMoney,
  invoiceTotals,
  lineAmount,
  lineCbm,
  packingTotals,
  quotationTotals,
} from '../calc';
import { emptyTradeItem } from '../defaults';
import type { QuotationItem, TradeItem } from '../types';

const qItem = (amount: number): QuotationItem => ({ title: 'x', details: '', amount, note: '' });
const tItem = (patch: Partial<TradeItem>): TradeItem => ({ ...emptyTradeItem(), ...patch });

describe('quotationTotals', () => {
  it('adds VAT on top when excluded', () => {
    expect(quotationTotals([qItem(20_000_000), qItem(7_000_000)], 'excluded', 10)).toEqual({
      subtotal: 27_000_000,
      vat: 2_700_000,
      total: 29_700_000,
    });
  });

  it('backs VAT out of the item sum when included', () => {
    expect(quotationTotals([qItem(110)], 'included', 10)).toEqual({
      subtotal: 100,
      vat: 10,
      total: 110,
    });
  });

  it('shows no VAT when the mode is none or the rate is zero', () => {
    expect(quotationTotals([qItem(500)], 'none', 10)).toEqual({
      subtotal: 500,
      vat: 0,
      total: 500,
    });
    expect(quotationTotals([qItem(500)], 'excluded', 0)).toEqual({
      subtotal: 500,
      vat: 0,
      total: 500,
    });
  });

  it('keeps float noise out of money totals', () => {
    expect(quotationTotals([qItem(0.1), qItem(0.2)], 'none', 0).total).toBe(0.3);
  });
});

describe('commercial invoice totals', () => {
  it('multiplies quantity by unit price per line, rounded to cents', () => {
    expect(lineAmount({ quantity: 3, unitPrice: 19.99 })).toBe(59.97);
    expect(lineAmount({ quantity: 0.1, unitPrice: 0.3 })).toBe(0.03);
  });

  it('sums quantity and amount across lines', () => {
    const items = [
      tItem({ quantity: 10, unitPrice: 2.5 }),
      tItem({ quantity: 4, unitPrice: 12.25 }),
    ];
    expect(invoiceTotals(items)).toEqual({ quantity: 14, amount: 74 });
  });
});

describe('packing list totals', () => {
  it('computes CBM from per-package dimensions times package count, with no packing buffer', () => {
    expect(lineCbm({ lengthCm: 50, widthCm: 40, heightCm: 30, packages: 2 })).toBe(0.12);
  });

  it('sums packages, weights and volume', () => {
    const items = [
      tItem({
        packages: 2,
        netWeightKg: 18.5,
        grossWeightKg: 20.25,
        lengthCm: 50,
        widthCm: 40,
        heightCm: 30,
      }),
      tItem({
        packages: 1,
        netWeightKg: 4.1,
        grossWeightKg: 5.2,
        lengthCm: 100,
        widthCm: 100,
        heightCm: 100,
      }),
    ];
    expect(packingTotals(items)).toEqual({
      packages: 3,
      netWeightKg: 22.6,
      grossWeightKg: 25.45,
      cbm: 1.12,
    });
  });
});

describe('formatMoney', () => {
  it('prints whole-unit currencies without decimals and others with two', () => {
    expect(formatMoney(30_000_000, 'KRW')).toBe('30,000,000');
    expect(formatMoney(74, 'USD')).toBe('74.00');
  });
});
