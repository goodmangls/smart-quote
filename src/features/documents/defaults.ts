import { Incoterm } from '@/types';
import { emptyShippingInstruction } from './types';
import type {
  ArrivalNotice,
  ChargeLine,
  CustomsPoa,
  DeliveryLine,
  DeliveryReceipt,
  FreightInvoice,
  OrderLine,
  Party,
  ProformaInvoice,
  PurchaseOrder,
  Quotation,
  QuotationItem,
  SalesContract,
  TradeItem,
  TradeShipment,
} from './types';

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
  instructions: emptyShippingInstruction(),
});

export const defaultProformaInvoice = (): ProformaInvoice => {
  const { instructions, ...core } = defaultTradeShipment();
  void instructions;
  return { ...core, validUntil: '', bankDetails: '' };
};

/**
 * Proforma from the shipment record: parties, shipment terms and lines carry
 * over; the invoice number and date do not — a proforma is its own document.
 */
export const proformaFromShipment = (
  shipment: TradeShipment,
  current: ProformaInvoice,
): ProformaInvoice => {
  // The left-out fields are named only to drop them from `shared`.
  const { instructions, invoiceNo, invoiceDate, ...shared } = shipment;
  void [instructions, invoiceNo, invoiceDate];
  return { ...current, ...shared };
};

export const emptyOrderLine = (): OrderLine => ({
  description: '',
  specification: '',
  quantity: 0,
  unit: 'PCS',
  unitPrice: 0,
});

/** Contract clauses (law, arbitration, claims) start empty: only text someone wrote gets printed. */
export const defaultSalesContract = (): SalesContract => ({
  variant: 'offer',
  logo: '',
  refNo: '',
  date: today(),
  validUntil: '',
  seller: emptyParty(),
  buyer: emptyParty(),
  currency: 'USD',
  items: [emptyOrderLine()],
  incoterm: Incoterm.FOB,
  namedPlace: '',
  origin: 'Republic of Korea',
  packing: '',
  shipmentPeriod: '',
  portOfLoading: '',
  portOfDestination: '',
  payment: '',
  inspection: '',
  insurance: '',
  otherTerms: '',
  sellerSignatory: '',
  buyerSignatory: '',
});

export const defaultPurchaseOrder = (): PurchaseOrder => ({
  logo: '',
  poNo: '',
  date: today(),
  buyer: emptyParty(),
  supplier: emptyParty(),
  shipTo: emptyParty(),
  deliveryDate: '',
  incoterm: Incoterm.FOB,
  paymentTerms: '',
  shippingMethod: '',
  currency: 'USD',
  items: [emptyOrderLine()],
  taxRate: 0,
  notes: '',
  signatory: '',
});

export const emptyChargeLine = (taxable = false): ChargeLine => ({
  description: '',
  quantity: 1,
  unit: 'SHPT',
  rate: 0,
  taxable,
});

export const defaultFreightInvoice = (): FreightInvoice => ({
  variant: 'invoice',
  logo: '',
  issuer: emptyParty(),
  issuerRegNo: '',
  billTo: emptyParty(),
  invoiceNo: '',
  date: today(),
  dueDate: '',
  shipmentRef: '',
  carrier: '',
  origin: '',
  destination: '',
  pieces: 0,
  chargeableWeightKg: 0,
  shipDate: '',
  currency: 'KRW',
  exchangeRateNote: '',
  charges: [
    { ...emptyChargeLine(false), description: 'International freight' },
    { ...emptyChargeLine(false), description: 'Fuel surcharge' },
    { ...emptyChargeLine(true), description: 'Pickup / local handling' },
  ],
  vatRate: 10,
  bankDetails: '',
  notes: '',
});

export const defaultArrivalNotice = (): ArrivalNotice => ({
  mode: 'air',
  logo: '',
  issuer: emptyParty(),
  notifyTo: emptyParty(),
  noticeNo: '',
  date: today(),
  masterNo: '',
  houseNo: '',
  carrier: '',
  portOfLoading: '',
  portOfDischarge: 'Incheon, Korea',
  eta: '',
  warehouse: '',
  freeTimeUntil: '',
  description: '',
  pieces: 0,
  grossWeightKg: 0,
  chargeableWeightKg: 0,
  cbm: 0,
  currency: 'KRW',
  charges: [{ ...emptyChargeLine(true), description: 'Handling charge' }],
  vatRate: 10,
  documentsRequired: '',
  remarks: '',
});

export const emptyDeliveryLine = (): DeliveryLine => ({
  description: '',
  packages: 1,
  packageType: 'CTN',
  weightKg: 0,
});

export const defaultDeliveryReceipt = (): DeliveryReceipt => ({
  logo: '',
  receiptNo: '',
  trackingNo: '',
  carrier: '',
  shipper: emptyParty(),
  consignee: emptyParty(),
  deliveryAddress: '',
  deliveryDate: today(),
  deliveryTime: '',
  items: [emptyDeliveryLine()],
  condition: 'good',
  conditionRemarks: '',
  deliveredBy: '',
  receivedBy: '',
});

const emptyKoreanEntity = () => ({
  company: '',
  registrationNo: '',
  representative: '',
  address: '',
  phone: '',
});

export const defaultCustomsPoa = (): CustomsPoa => ({
  principal: emptyKoreanEntity(),
  agent: { ...emptyKoreanEntity(), brokerName: '' },
  scopes: ['export', 'import'],
  otherScope: '',
  periodFrom: today(),
  periodTo: '',
  statement: '위임인은 아래 수임인에게 위 범위의 수출입 통관 업무를 위임합니다.',
  date: today(),
});
