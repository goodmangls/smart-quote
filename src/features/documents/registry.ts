import type { LucideIcon } from 'lucide-react';
import {
  ClipboardCheck,
  FileSignature,
  FileText,
  Landmark,
  Package,
  PackageCheck,
  PlaneLanding,
  Receipt,
  ReceiptText,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import type { DocumentType } from './types';

/**
 * What the picker shows for each document. The editors live in
 * `components/editors.tsx`, keyed by the same type.
 */

export const DOCUMENT_GROUPS = ['sales', 'shipment', 'billing', 'customs'] as const;
export type DocumentGroup = (typeof DOCUMENT_GROUPS)[number];

export const GROUP_INFO: Record<DocumentGroup, { title: string; body: string }> = {
  sales: { title: 'Sales & orders', body: 'Before the goods move: price, offer, order.' },
  shipment: {
    title: 'Shipment',
    body: 'The commercial invoice, packing list and shipping instruction share one shipment record.',
  },
  billing: {
    title: 'Forwarder billing',
    body: 'Charges for a shipment, with VAT on local lines only.',
  },
  customs: { title: 'Customs', body: 'Authorisation for a licensed customs broker.' },
};

export interface DocumentInfo {
  type: DocumentType;
  title: string;
  body: string;
  group: DocumentGroup;
  icon: LucideIcon;
}

export const DOCUMENTS: readonly DocumentInfo[] = [
  {
    type: 'quotation',
    title: 'Quotation',
    body: 'Itemised price quote with VAT handling, terms and a signature block.',
    group: 'sales',
    icon: FileText,
  },
  {
    type: 'sales-contract',
    title: 'Offer Sheet / Sales Contract',
    body: 'Seller’s offer or a contract signed by both sides: goods, price terms, shipment, payment.',
    group: 'sales',
    icon: FileSignature,
  },
  {
    type: 'purchase-order',
    title: 'Purchase Order',
    body: 'Buyer’s order to a supplier with delivery date, terms and optional tax.',
    group: 'sales',
    icon: ShoppingCart,
  },
  {
    type: 'proforma-invoice',
    title: 'Proforma Invoice',
    body: 'Invoice issued before shipment for advance payment or an import licence.',
    group: 'sales',
    icon: ReceiptText,
  },
  {
    type: 'commercial-invoice',
    title: 'Commercial Invoice',
    body: 'Customs invoice: parties, Incoterm, HS codes, unit prices and the declared total.',
    group: 'shipment',
    icon: Receipt,
  },
  {
    type: 'packing-list',
    title: 'Packing List',
    body: 'Packages, net and gross weights, dimensions and CBM for the same shipment.',
    group: 'shipment',
    icon: Package,
  },
  {
    type: 'shipping-instruction',
    title: 'Shipping Instruction',
    body: 'Booking request to the forwarder: pickup, who pays freight and duties, insurance.',
    group: 'shipment',
    icon: Truck,
  },
  {
    type: 'arrival-notice',
    title: 'Arrival Notice',
    body: 'Tells the consignee the cargo has arrived: MAWB/HAWB or B/L, ETA, warehouse, charges.',
    group: 'shipment',
    icon: PlaneLanding,
  },
  {
    type: 'delivery-receipt',
    title: 'Delivery Receipt (POD)',
    body: 'Proof of delivery with the condition on arrival and both signatures.',
    group: 'shipment',
    icon: PackageCheck,
  },
  {
    type: 'freight-invoice',
    title: 'Freight Invoice / Debit Note',
    body: 'Bill the customer for freight and local charges in one currency.',
    group: 'billing',
    icon: ClipboardCheck,
  },
  {
    type: 'customs-poa',
    title: '수출입 통관 위임장',
    body: 'Customs power of attorney (Korean) appointing a licensed customs broker.',
    group: 'customs',
    icon: Landmark,
  },
];

export const documentInfo = (type: DocumentType): DocumentInfo => {
  const info = DOCUMENTS.find((d) => d.type === type);
  if (!info) throw new Error(`No registry entry for document type "${type}"`);
  return info;
};
