import {
  defaultArrivalNotice,
  defaultCustomsPoa,
  defaultDeliveryReceipt,
  defaultFreightInvoice,
  defaultProformaInvoice,
  defaultPurchaseOrder,
  defaultQuotation,
  defaultSalesContract,
  defaultTradeShipment,
} from './defaults';
import { draftSpec } from './storage';
import {
  arrivalNoticeSchema,
  customsPoaSchema,
  deliveryReceiptSchema,
  freightInvoiceSchema,
  proformaInvoiceSchema,
  purchaseOrderSchema,
  quotationSchema,
  salesContractSchema,
  tradeShipmentSchema,
} from './types';

/**
 * One draft record per entry. The commercial invoice, packing list and
 * shipping instruction share `tradeDraft`.
 *
 * ⚠️ The names and export kinds of `quotationDraft` and `tradeDraft` are from
 * v1 (`smartQuote.documents.quotation` / `.trade`, `quotation` /
 * `trade-shipment`). Never rename them.
 */
export const quotationDraft = draftSpec('quotation', 'quotation', quotationSchema, defaultQuotation);
export const tradeDraft = draftSpec('trade', 'trade-shipment', tradeShipmentSchema, defaultTradeShipment);
export const proformaDraft = draftSpec('proforma', 'proforma-invoice', proformaInvoiceSchema, defaultProformaInvoice);
export const salesContractDraft = draftSpec('sales-contract', 'sales-contract', salesContractSchema, defaultSalesContract);
export const purchaseOrderDraft = draftSpec('purchase-order', 'purchase-order', purchaseOrderSchema, defaultPurchaseOrder);
export const freightInvoiceDraft = draftSpec('freight-invoice', 'freight-invoice', freightInvoiceSchema, defaultFreightInvoice);
export const arrivalNoticeDraft = draftSpec('arrival-notice', 'arrival-notice', arrivalNoticeSchema, defaultArrivalNotice);
export const deliveryReceiptDraft = draftSpec('delivery-receipt', 'delivery-receipt', deliveryReceiptSchema, defaultDeliveryReceipt);
export const customsPoaDraft = draftSpec('customs-poa', 'customs-poa', customsPoaSchema, defaultCustomsPoa);
