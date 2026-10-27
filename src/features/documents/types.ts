import { z } from 'zod';
import { Incoterm } from '@/types';

/**
 * Trade documents built in the browser: a quotation, plus a commercial invoice
 * and packing list that share one shipment record. Nothing here reaches the
 * server — drafts live in localStorage and move between machines as JSON.
 *
 * The schemas double as the import validator: a file or a stored draft is
 * untrusted until it parses, so every field is shaped and bounded here.
 */

export type DocumentType = 'quotation' | 'commercial-invoice' | 'packing-list';

export const DOCUMENT_TYPES: readonly DocumentType[] = [
  'quotation',
  'commercial-invoice',
  'packing-list',
];

export const isDocumentType = (value: unknown): value is DocumentType =>
  typeof value === 'string' && (DOCUMENT_TYPES as readonly string[]).includes(value);

/** A logo is kept as a data URL, so it is capped to keep localStorage within quota. */
export const MAX_LOGO_DATA_URL_LENGTH = 400_000;

const text = (max: number) => z.string().max(max);
const amount = z.number().finite().min(0).max(1e12);

const logoSchema = z
  .string()
  .max(MAX_LOGO_DATA_URL_LENGTH)
  .refine((v) => v === '' || /^data:image\/(png|jpeg|webp|gif);base64,/.test(v), {
    message: 'Logo must be a PNG, JPEG, WebP or GIF image',
  });

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
  vatRate: z.number().finite().min(0).max(100),
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

// ── Commercial invoice + packing list (one shared shipment) ──────────────────

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

const incotermValues = Object.values(Incoterm) as [Incoterm, ...Incoterm[]];

export const tradeShipmentSchema = z.object({
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
  incoterm: z.enum(incotermValues),
  paymentTerms: text(100),
  currency: text(8),
  items: z.array(tradeItemSchema).max(200),
  remarks: text(2000),
  signatory: text(100),
});
export type TradeShipment = z.infer<typeof tradeShipmentSchema>;
