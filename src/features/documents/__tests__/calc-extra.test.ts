import { chargeTotals, orderTotals } from '../calc';
import {
  defaultProformaInvoice,
  defaultTradeShipment,
  emptyChargeLine,
  emptyOrderLine,
  proformaFromShipment,
} from '../defaults';
import type { ChargeLine } from '../types';

const charge = (rate: number, taxable: boolean, quantity = 1): ChargeLine => ({
  ...emptyChargeLine(taxable),
  rate,
  quantity,
});

describe('chargeTotals', () => {
  it('applies VAT to taxable lines only', () => {
    // 1,000,000 zero-rated freight + 50,000 taxable pickup at 10%
    expect(chargeTotals([charge(1_000_000, false), charge(50_000, true)], 10)).toEqual({
      taxable: 50_000,
      nonTaxable: 1_000_000,
      vat: 5_000,
      total: 1_055_000,
    });
  });

  it('multiplies quantity by rate and charges no VAT at a zero rate', () => {
    expect(chargeTotals([charge(12.5, true, 3)], 0)).toEqual({
      taxable: 37.5,
      nonTaxable: 0,
      vat: 0,
      total: 37.5,
    });
  });
});

describe('orderTotals', () => {
  it('sums quantity × unit price and adds tax when a rate is set', () => {
    const items = [
      { ...emptyOrderLine(), quantity: 100, unitPrice: 2.35 },
      { ...emptyOrderLine(), quantity: 3, unitPrice: 0.1 },
    ];
    expect(orderTotals(items)).toEqual({ subtotal: 235.3, tax: 0, total: 235.3 });
    expect(orderTotals(items, 10)).toEqual({ subtotal: 235.3, tax: 23.53, total: 258.83 });
  });
});

describe('proformaFromShipment', () => {
  it('copies parties, terms and lines but keeps the proforma number, date and its own fields', () => {
    const shipment = {
      ...defaultTradeShipment(),
      invoiceNo: 'CI-1',
      invoiceDate: '2026-11-01',
      consignee: { name: 'Acme', address: 'SF', contact: '' },
      paymentTerms: 'T/T',
    };
    const current = {
      ...defaultProformaInvoice(),
      invoiceNo: 'PI-9',
      invoiceDate: '2026-10-01',
      validUntil: '2026-10-31',
      bankDetails: 'Bank X',
    };
    const next = proformaFromShipment(shipment, current);
    expect(next).toMatchObject({
      invoiceNo: 'PI-9',
      invoiceDate: '2026-10-01',
      validUntil: '2026-10-31',
      bankDetails: 'Bank X',
      consignee: { name: 'Acme' },
      paymentTerms: 'T/T',
    });
    expect(next).not.toHaveProperty('instructions');
  });
});
