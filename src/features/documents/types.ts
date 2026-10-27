import { z } from 'zod';
import { Incoterm } from '@/types';

/**
 * Trade and logistics documents built in the browser. Nothing here reaches the
 * server — drafts live in localStorage and move between machines as JSON.
 *
 * The schemas double as the import validator: a file or a stored draft is
 * untrusted until it parses, so every field is shaped and bounded here.
 *
 * 🔴 Drafts saved by an earlier release must keep loading. A stored draft that
 * fails its schema silently falls back to a blank document, so a field added
 * to an existing schema needs `.default(...)`. `compat.test.ts` pins this with
 * frozen v1 fixtures.
 */

export const DOCUMENT_TYPES = [
  'quotation',
  'proforma-invoice',
  'sales-contract',
  'purchase-order',
  'commercial-invoice',
  'packing-list',
  'shipping-instruction',
  'arrival-notice',
  'delivery-receipt',
  'freight-invoice',
  'customs-poa',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const isDocumentType = (value: unknown): value is DocumentType =>
  typeof value === 'string' && (DOCUMENT_TYPES as readonly string[]).includes(value);

/** A logo is kept as a data URL, so it is capped to keep localStorage within quota. */
export const MAX_LOGO_DATA_URL_LENGTH = 400_000;

const text = (max: number) => z.string().max(max);
const amount = z.number().finite().min(0).max(1e12);
const percent = z.number().finite().min(0).max(100);

const logoSchema = z
  .string()
  .max(MAX_LOGO_DATA_URL_LENGTH)
  .refine((v) => v === '' || /^data:image\/(png|jpeg|webp|gif);base64,/.test(v), {
    message: 'Logo must be a PNG, JPEG, WebP or GIF image',
  });

const incotermValues = Object.values(Incoterm) as [Incoterm, ...Incoterm[]];
const incotermSchema = z.enum(incotermValues);

export const partySchema = z.object({
  name: text(200),
  address: text(600),
  contact: text(200),
});
export type Party = z.infer<typeof partySchema>;

// ── Quotation ────────────────────────────────────────────────────────────────

export const quotationItemSchema = z.object({
  title: text(200),
  details: text(2000),
  amount,
  note: text(300),
});
export type QuotationItem = z.infer<typeof quotationItemSchema>;

export const quotationSchema = z.object({
  quoteNo: text(60),
  date: text(60),
  validUntil: text(60),
  recipient: text(200),
  subject: text(300),
  currency: text(8),
  vatMode: z.enum(['excluded', 'included', 'none']),
  vatRate: percent,
  supplier: z.object({
    logo: logoSchema,
    company: text(200),
    representative: text(100),
    registrationNo: text(60),
    phone: text(60),
    email: text(200),
    website: text(200),
    address: text(400),
  }),
  items: z.array(quotationItemSchema).max(100),
  terms: text(2000),
  signatureLabel: text(100),
});
export type Quotation = z.infer<typeof quotationSchema>;

// ── Shipment record: commercial invoice, packing list, shipping instruction ──

export const tradeItemSchema = z.object({
  marks: text(100),
  description: text(400),
  hsCode: text(20),
  origin: text(60),
  quantity: amount,
  unit: text(20),
  unitPrice: amount,
  packages: amount,
  packageType: text(40),
  netWeightKg: amount,
  grossWeightKg: amount,
  lengthCm: amount,
  widthCm: amount,
  heightCm: amount,
});
export type TradeItem = z.infer<typeof tradeItemSchema>;

/** The fields every invoice-shaped shipment document has. */
const tradeCoreShape = {
  logo: logoSchema,
  invoiceNo: text(60),
  invoiceDate: text(60),
  reference: text(100),
  shipper: partySchema,
  consignee: partySchema,
  notifyParty: partySchema,
  countryOfOrigin: text(60),
  destination: text(100),
  portOfLoading: text(100),
  portOfDischarge: text(100),
  carrier: text(100),
  departureDate: text(60),
  incoterm: incotermSchema,
  paymentTerms: text(100),
  currency: text(8),
  items: z.array(tradeItemSchema).max(200),
  remarks: text(2000),
  signatory: text(100),
};

export const PAYER_OPTIONS = ['shipper', 'consignee', 'third-party'] as const;
export type Payer = (typeof PAYER_OPTIONS)[number];

export const shippingInstructionSchema = z.object({
  forwarder: partySchema,
  service: text(120),
  accountNo: text(60),
  pickupAddress: text(600),
  pickupDate: text(60),
  pickupContact: text(200),
  freightPaidBy: z.enum(PAYER_OPTIONS),
  dutiesPaidBy: z.enum(PAYER_OPTIONS),
  insurance: z.boolean(),
  insuredValue: amount,
  documentsEnclosed: text(1000),
  specialInstructions: text(2000),
});
export type ShippingInstruction = z.infer<typeof shippingInstructionSchema>;

export const emptyShippingInstruction = (): ShippingInstruction => ({
  forwarder: { name: '', address: '', contact: '' },
  service: '',
  accountNo: '',
  pickupAddress: '',
  pickupDate: '',
  pickupContact: '',
  freightPaidBy: 'shipper',
  dutiesPaidBy: 'consignee',
  insurance: false,
  insuredValue: 0,
  documentsEnclosed: '',
  specialInstructions: '',
});

/**
 * One record behind the commercial invoice, packing list and shipping
 * instruction. `instructions` was added after v1, so it defaults: a v1 draft
 * has no such key and must still load.
 */
export const tradeShipmentSchema = z.object({
  ...tradeCoreShape,
  instructions: shippingInstructionSchema.default(emptyShippingInstruction),
});
export type TradeShipment = z.infer<typeof tradeShipmentSchema>;

/** The invoice-shaped fields shared by the shipment record and the proforma invoice. */
export type TradeCore = Omit<TradeShipment, 'instructions'>;

/** Proforma invoice: the invoice fields, issued before shipment, plus validity and bank details. */
export const proformaInvoiceSchema = z.object({
  ...tradeCoreShape,
  validUntil: text(60),
  bankDetails: text(1000),
});
export type ProformaInvoice = z.infer<typeof proformaInvoiceSchema>;

// ── Line items priced as quantity × unit price ───────────────────────────────

export const orderLineSchema = z.object({
  description: text(400),
  specification: text(600),
  quantity: amount,
  unit: text(20),
  unitPrice: amount,
});
export type OrderLine = z.infer<typeof orderLineSchema>;

export const salesContractSchema = z.object({
  variant: z.enum(['offer', 'contract']),
  logo: logoSchema,
  refNo: text(60),
  date: text(60),
  validUntil: text(60),
  seller: partySchema,
  buyer: partySchema,
  currency: text(8),
  items: z.array(orderLineSchema).max(100),
  incoterm: incotermSchema,
  namedPlace: text(100),
  origin: text(100),
  packing: text(300),
  shipmentPeriod: text(200),
  portOfLoading: text(100),
  portOfDestination: text(100),
  payment: text(300),
  inspection: text(300),
  insurance: text(300),
  otherTerms: text(4000),
  sellerSignatory: text(100),
  buyerSignatory: text(100),
});
export type SalesContract = z.infer<typeof salesContractSchema>;

export const purchaseOrderSchema = z.object({
  logo: logoSchema,
  poNo: text(60),
  date: text(60),
  buyer: partySchema,
  supplier: partySchema,
  shipTo: partySchema,
  deliveryDate: text(60),
  incoterm: incotermSchema,
  paymentTerms: text(200),
  shippingMethod: text(200),
  currency: text(8),
  items: z.array(orderLineSchema).max(100),
  taxRate: percent,
  notes: text(2000),
  signatory: text(100),
});
export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;

// ── Charges billed by a forwarder ────────────────────────────────────────────

export const chargeLineSchema = z.object({
  description: text(200),
  quantity: amount,
  unit: text(20),
  rate: amount,
  /** International freight is usually zero-rated; local charges are not. */
  taxable: z.boolean(),
});
export type ChargeLine = z.infer<typeof chargeLineSchema>;

export const freightInvoiceSchema = z.object({
  variant: z.enum(['invoice', 'debit-note']),
  logo: logoSchema,
  issuer: partySchema,
  issuerRegNo: text(60),
  billTo: partySchema,
  invoiceNo: text(60),
  date: text(60),
  dueDate: text(60),
  shipmentRef: text(100),
  carrier: text(100),
  origin: text(100),
  destination: text(100),
  pieces: amount,
  chargeableWeightKg: amount,
  shipDate: text(60),
  /** One currency per document — a total that mixes USD and KRW is wrong. */
  currency: text(8),
  exchangeRateNote: text(200),
  charges: z.array(chargeLineSchema).max(100),
  vatRate: percent,
  bankDetails: text(1000),
  notes: text(2000),
});
export type FreightInvoice = z.infer<typeof freightInvoiceSchema>;

export const arrivalNoticeSchema = z.object({
  mode: z.enum(['air', 'sea']),
  logo: logoSchema,
  issuer: partySchema,
  notifyTo: partySchema,
  noticeNo: text(60),
  date: text(60),
  masterNo: text(60),
  houseNo: text(60),
  carrier: text(100),
  portOfLoading: text(100),
  portOfDischarge: text(100),
  eta: text(60),
  warehouse: text(300),
  freeTimeUntil: text(60),
  description: text(400),
  pieces: amount,
  grossWeightKg: amount,
  chargeableWeightKg: amount,
  cbm: amount,
  currency: text(8),
  charges: z.array(chargeLineSchema).max(100),
  vatRate: percent,
  documentsRequired: text(1000),
  remarks: text(2000),
});
export type ArrivalNotice = z.infer<typeof arrivalNoticeSchema>;

// ── Proof of delivery ────────────────────────────────────────────────────────

export const deliveryLineSchema = z.object({
  description: text(400),
  packages: amount,
  packageType: text(40),
  weightKg: amount,
});
export type DeliveryLine = z.infer<typeof deliveryLineSchema>;

export const deliveryReceiptSchema = z.object({
  logo: logoSchema,
  receiptNo: text(60),
  trackingNo: text(60),
  carrier: text(100),
  shipper: partySchema,
  consignee: partySchema,
  deliveryAddress: text(600),
  deliveryDate: text(60),
  deliveryTime: text(20),
  items: z.array(deliveryLineSchema).max(100),
  condition: z.enum(['good', 'damaged', 'shortage']),
  conditionRemarks: text(1000),
  deliveredBy: text(100),
  receivedBy: text(100),
});
export type DeliveryReceipt = z.infer<typeof deliveryReceiptSchema>;

// ── 수출입 통관 위임장 (customs power of attorney, Korean) ──────────────────────

export const POA_SCOPES = ['export', 'import', 'refund', 'amendment'] as const;
export type PoaScope = (typeof POA_SCOPES)[number];

const koreanEntitySchema = z.object({
  company: text(200),
  registrationNo: text(60),
  representative: text(100),
  address: text(600),
  phone: text(60),
});

export const customsPoaSchema = z.object({
  principal: koreanEntitySchema,
  agent: koreanEntitySchema.extend({ brokerName: text(100) }),
  scopes: z.array(z.enum(POA_SCOPES)).max(POA_SCOPES.length),
  otherScope: text(300),
  periodFrom: text(60),
  periodTo: text(60),
  statement: text(1000),
  date: text(60),
});
export type CustomsPoa = z.infer<typeof customsPoaSchema>;
