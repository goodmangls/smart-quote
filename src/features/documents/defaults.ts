import { Incoterm } from '@/types';
import type { Party, Quotation, QuotationItem, TradeItem, TradeShipment } from './types';

/**
 * Starting drafts. They are deliberately generic placeholders so a printed
 * document never carries made-up company data by accident.
 */

/** Today in the user's own time zone (toISOString would give the UTC date). */
const today = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const emptyParty = (): Party => ({ name: '', address: '', contact: '' });

export const emptyQuotationItem = (): QuotationItem => ({
  title: '',
  details: '',
  amount: 0,
  note: '',
});

export const defaultQuotation = (): Quotation => ({
  quoteNo: '',
  date: today(),
  validUntil: '',
  recipient: '',
  subject: '',
  currency: 'KRW',
  vatMode: 'excluded',
  vatRate: 10,
  supplier: {
    logo: '',
    company: '',
    representative: '',
    registrationNo: '',
    phone: '',
    email: '',
    website: '',
    address: '',
  },
  items: [
    {
      title: 'International express freight',
      details: 'Door-to-door, DAP\nFuel surcharge included',
      amount: 0,
      note: '',
    },
  ],
  terms: 'Rates are subject to carrier fuel surcharge changes.\nDuties and taxes are not included.',
  signatureLabel: 'AUTHORIZED SIGNATURE',
});

export const emptyTradeItem = (): TradeItem => ({
  marks: '',
  description: '',
  hsCode: '',
  origin: 'KR',
  quantity: 0,
  unit: 'PCS',
  unitPrice: 0,
  packages: 1,
  packageType: 'CTN',
  netWeightKg: 0,
  grossWeightKg: 0,
  lengthCm: 0,
  widthCm: 0,
  heightCm: 0,
});

export const defaultTradeShipment = (): TradeShipment => ({
  logo: '',
  invoiceNo: '',
  invoiceDate: today(),
  reference: '',
  shipper: emptyParty(),
  consignee: emptyParty(),
  notifyParty: emptyParty(),
  countryOfOrigin: 'Republic of Korea',
  destination: '',
  portOfLoading: 'Incheon, Korea',
  portOfDischarge: '',
  carrier: '',
  departureDate: '',
  incoterm: Incoterm.DAP,
  paymentTerms: '',
  currency: 'USD',
  items: [emptyTradeItem()],
  remarks: '',
  signatory: '',
});
