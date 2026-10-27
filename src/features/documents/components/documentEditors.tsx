import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Copy } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { proformaFromShipment } from '../defaults';
import {
  arrivalNoticeDraft,
  customsPoaDraft,
  deliveryReceiptDraft,
  freightInvoiceDraft,
  proformaDraft,
  purchaseOrderDraft,
  quotationDraft,
  salesContractDraft,
  tradeDraft,
} from '../specs';
import { loadDraft } from '../storage';
import type { ProformaInvoice } from '../types';
import { ArrivalNoticeForm, FreightInvoiceForm } from './ChargeForms';
import { ArrivalNoticeSheet, FreightInvoiceSheet } from './ChargeSheets';
import { CustomsPoaForm, CustomsPoaSheet } from './CustomsPoa';
import { DeliveryReceiptForm, DeliveryReceiptSheet } from './DeliveryReceipt';
import { DraftEditor } from './DraftEditor';
import { FormSection, TextAreaField, TextField } from './fields';
import { PurchaseOrderForm, SalesContractForm } from './OrderForms';
import { PurchaseOrderSheet, SalesContractSheet } from './OrderSheets';
import { QuotationForm } from './QuotationForm';
import { QuotationSheet } from './QuotationSheet';
import { ShippingInstructionFields } from './ShippingInstructionFields';
import {
  CommercialInvoiceSheet,
  PackingListSheet,
  ProformaInvoiceSheet,
  ShippingInstructionSheet,
} from './TradeSheets';
import { TradeShipmentForm } from './TradeShipmentForm';

export const QuotationEditor = () => (
  <DraftEditor
    spec={quotationDraft}
    title='Quotation'
    subtitle='Itemised price quote'
    filePrefix='quotation'
    fileNumber={(doc) => doc.quoteNo}
    sheet={(doc) => <QuotationSheet doc={doc} />}
    form={({ value, update }) => <QuotationForm doc={value} update={update} />}
  />
);

// ── Shipment record: commercial invoice · packing list · shipping instruction ─

const SHIPMENT_TABS = [
  { type: 'commercial-invoice', label: 'Invoice' },
  { type: 'packing-list', label: 'Packing List' },
  { type: 'shipping-instruction', label: 'Instruction' },
] as const;

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex-1 rounded-md px-2 py-1.5 text-center text-xs font-medium transition-colors ${
    isActive
      ? 'bg-white dark:bg-gray-700 text-brand-blue-600 dark:text-brand-blue-300 shadow-sm'
      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
  }`;

const ShipmentTabs = () => (
  <nav
    aria-label='Shipment documents'
    className='flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5'
  >
    {SHIPMENT_TABS.map((tab) => (
      <NavLink key={tab.type} to={`/documents/${tab.type}`} className={tabClass}>
        {tab.label}
      </NavLink>
    ))}
  </nav>
);

const SHARED_NOTE =
  'The commercial invoice, packing list and shipping instruction share these details. A change here appears on all three.';

const ShipmentEditor = ({ type }: { type: (typeof SHIPMENT_TABS)[number]['type'] }) => {
  const title = {
    'commercial-invoice': 'Commercial Invoice',
    'packing-list': 'Packing List',
    'shipping-instruction': 'Shipping Instruction',
  }[type];
  return (
    <DraftEditor
      spec={tradeDraft}
      title={title}
      subtitle='Shares one shipment record with the other shipment documents'
      filePrefix='shipment'
      fileNumber={(doc) => doc.invoiceNo}
      sheet={(doc) =>
        type === 'commercial-invoice' ? (
          <CommercialInvoiceSheet doc={doc} />
        ) : type === 'packing-list' ? (
          <PackingListSheet doc={doc} />
        ) : (
          <ShippingInstructionSheet doc={doc} />
        )
      }
      form={({ value, update }) => (
        <>
          <ShipmentTabs />
          {type === 'shipping-instruction' && (
            <ShippingInstructionFields
              value={value.instructions}
              currency={value.currency}
              onChange={(instructions) => update({ instructions })}
            />
          )}
          <TradeShipmentForm
            doc={value}
            update={update}
            mode={type === 'commercial-invoice' ? 'invoice' : 'packing'}
            sharedNote={SHARED_NOTE}
          />
        </>
      )}
    />
  );
};

export const CommercialInvoiceEditor = () => <ShipmentEditor type='commercial-invoice' />;
export const PackingListEditor = () => <ShipmentEditor type='packing-list' />;
export const ShippingInstructionEditor = () => <ShipmentEditor type='shipping-instruction' />;

// ── Proforma invoice ─────────────────────────────────────────────────────────

const CopyFromShipment = ({
  current,
  replace,
}: {
  current: ProformaInvoice;
  replace: (next: ProformaInvoice) => void;
}) => {
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <button
        type='button'
        onClick={() => setConfirming(true)}
        className='inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
      >
        <Copy className='h-3.5 w-3.5' />
        Copy from commercial invoice
      </button>
      <ConfirmDialog
        open={confirming}
        title='Copy the commercial invoice?'
        message='Parties, shipment terms and item lines are replaced with the ones on the commercial invoice. The proforma number, date, validity and bank details stay.'
        confirmLabel='Copy'
        onConfirm={() => {
          setConfirming(false);
          replace(proformaFromShipment(loadDraft(tradeDraft), current));
          toast('success', 'Copied from the commercial invoice.');
        }}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
};

export const ProformaEditor = () => (
  <DraftEditor
    spec={proformaDraft}
    title='Proforma Invoice'
    subtitle='Issued before shipment'
    filePrefix='proforma'
    fileNumber={(doc) => doc.invoiceNo}
    sheet={(doc) => <ProformaInvoiceSheet doc={doc} />}
    form={({ value, update, replace }) => (
      <>
        <CopyFromShipment current={value} replace={replace} />
        <TradeShipmentForm doc={value} update={update} mode='invoice' />
        <FormSection title='Proforma terms'>
          <TextField
            label='Valid until'
            value={value.validUntil}
            onChange={(validUntil) => update({ validUntil })}
          />
          <TextAreaField
            label='Bank details'
            value={value.bankDetails}
            onChange={(bankDetails) => update({ bankDetails })}
          />
        </FormSection>
      </>
    )}
  />
);

// ── The rest: one record each ────────────────────────────────────────────────

export const SalesContractEditor = () => (
  <DraftEditor
    spec={salesContractDraft}
    title='Offer Sheet / Sales Contract'
    subtitle='Goods, price terms, shipment and payment'
    filePrefix='sales-contract'
    fileNumber={(doc) => doc.refNo}
    sheet={(doc) => <SalesContractSheet doc={doc} />}
    form={({ value, update }) => <SalesContractForm doc={value} update={update} />}
  />
);

export const PurchaseOrderEditor = () => (
  <DraftEditor
    spec={purchaseOrderDraft}
    title='Purchase Order'
    subtitle='Order to a supplier'
    filePrefix='purchase-order'
    fileNumber={(doc) => doc.poNo}
    sheet={(doc) => <PurchaseOrderSheet doc={doc} />}
    form={({ value, update }) => <PurchaseOrderForm doc={value} update={update} />}
  />
);

export const ArrivalNoticeEditor = () => (
  <DraftEditor
    spec={arrivalNoticeDraft}
    title='Arrival Notice'
    subtitle='Cargo arrival and release charges'
    filePrefix='arrival-notice'
    fileNumber={(doc) => doc.noticeNo}
    sheet={(doc) => <ArrivalNoticeSheet doc={doc} />}
    form={({ value, update }) => <ArrivalNoticeForm doc={value} update={update} />}
  />
);

export const DeliveryReceiptEditor = () => (
  <DraftEditor
    spec={deliveryReceiptDraft}
    title='Delivery Receipt'
    subtitle='Proof of delivery (POD)'
    filePrefix='delivery-receipt'
    fileNumber={(doc) => doc.receiptNo}
    sheet={(doc) => <DeliveryReceiptSheet doc={doc} />}
    form={({ value, update }) => <DeliveryReceiptForm doc={value} update={update} />}
  />
);

export const FreightInvoiceEditor = () => (
  <DraftEditor
    spec={freightInvoiceDraft}
    title='Freight Invoice / Debit Note'
    subtitle='Freight and local charges in one currency'
    filePrefix='freight-invoice'
    fileNumber={(doc) => doc.invoiceNo}
    sheet={(doc) => <FreightInvoiceSheet doc={doc} />}
    form={({ value, update }) => <FreightInvoiceForm doc={value} update={update} />}
  />
);

export const CustomsPoaEditor = () => (
  <DraftEditor
    spec={customsPoaDraft}
    title='수출입 통관 위임장'
    subtitle='Customs power of attorney'
    filePrefix='customs-poa'
    fileNumber={(doc) => doc.principal.company}
    sheet={(doc) => <CustomsPoaSheet doc={doc} />}
    form={({ value, update }) => <CustomsPoaForm doc={value} update={update} />}
  />
);
