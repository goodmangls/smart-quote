import type { ComponentType } from 'react';
import type { DocumentType } from '../types';
import {
  ArrivalNoticeEditor,
  CommercialInvoiceEditor,
  CustomsPoaEditor,
  DeliveryReceiptEditor,
  FreightInvoiceEditor,
  PackingListEditor,
  ProformaEditor,
  PurchaseOrderEditor,
  QuotationEditor,
  SalesContractEditor,
  ShippingInstructionEditor,
} from './documentEditors';

/** Every document type has an editor — the Record type makes a missing one a compile error. */
export const EDITORS: Record<DocumentType, ComponentType> = {
  quotation: QuotationEditor,
  'proforma-invoice': ProformaEditor,
  'sales-contract': SalesContractEditor,
  'purchase-order': PurchaseOrderEditor,
  'commercial-invoice': CommercialInvoiceEditor,
  'packing-list': PackingListEditor,
  'shipping-instruction': ShippingInstructionEditor,
  'arrival-notice': ArrivalNoticeEditor,
  'delivery-receipt': DeliveryReceiptEditor,
  'freight-invoice': FreightInvoiceEditor,
  'customs-poa': CustomsPoaEditor,
};
