import React from 'react';
import { Navigate, NavLink, useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { DocumentEditorLayout } from '@/features/documents/components/DocumentEditorLayout';
import { QuotationForm } from '@/features/documents/components/QuotationForm';
import { QuotationSheet } from '@/features/documents/components/QuotationSheet';
import {
  CommercialInvoiceSheet,
  PackingListSheet,
} from '@/features/documents/components/TradeSheets';
import { TradeShipmentForm } from '@/features/documents/components/TradeShipmentForm';
import { defaultQuotation, defaultTradeShipment } from '@/features/documents/defaults';
import {
  clearDraft,
  exportDraft,
  importQuotation,
  importTradeShipment,
  loadQuotation,
  loadTradeShipment,
} from '@/features/documents/storage';
import { isDocumentType } from '@/features/documents/types';
import { useDocumentDraft } from '@/features/documents/useDocumentDraft';

const fileStamp = (name: string) => (name.trim() || 'draft').replace(/[^\w.-]+/g, '_');

const QuotationEditor = () => {
  const draft = useDocumentDraft('quotation', loadQuotation);
  return (
    <DocumentEditorLayout
      title='Quotation'
      subtitle='Itemised price quote'
      sheet={<QuotationSheet doc={draft.value} />}
      form={<QuotationForm doc={draft.value} update={draft.update} />}
      saved={draft.saved}
      exportFileName={`quotation-${fileStamp(draft.value.quoteNo)}.json`}
      onExport={() => exportDraft('quotation', draft.value)}
      onImport={(text) => {
        const result = importQuotation(text);
        if (!result.ok) return result.error;
        draft.replace(result.data);
        return null;
      }}
      onReset={() => {
        clearDraft('quotation');
        draft.replace(defaultQuotation());
      }}
    />
  );
};

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
    isActive
      ? 'bg-white dark:bg-gray-700 text-brand-blue-600 dark:text-brand-blue-300 shadow-sm'
      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
  }`;

const TradeEditor = ({ mode }: { mode: 'invoice' | 'packing' }) => {
  const draft = useDocumentDraft('trade', loadTradeShipment);
  const isInvoice = mode === 'invoice';
  return (
    <DocumentEditorLayout
      title={isInvoice ? 'Commercial Invoice' : 'Packing List'}
      subtitle='Shares one shipment record with the other document'
      sheet={
        isInvoice ? (
          <CommercialInvoiceSheet doc={draft.value} />
        ) : (
          <PackingListSheet doc={draft.value} />
        )
      }
      form={
        <>
          <nav
            aria-label='Shipment documents'
            className='flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5'
          >
            <NavLink to='/documents/commercial-invoice' className={tabClass}>
              Commercial Invoice
            </NavLink>
            <NavLink to='/documents/packing-list' className={tabClass}>
              Packing List
            </NavLink>
          </nav>
          <TradeShipmentForm doc={draft.value} update={draft.update} mode={mode} />
        </>
      }
      saved={draft.saved}
      exportFileName={`shipment-${fileStamp(draft.value.invoiceNo)}.json`}
      onExport={() => exportDraft('trade', draft.value)}
      onImport={(text) => {
        const result = importTradeShipment(text);
        if (!result.ok) return result.error;
        draft.replace(result.data);
        return null;
      }}
      onReset={() => {
        clearDraft('trade');
        draft.replace(defaultTradeShipment());
      }}
    />
  );
};

const DocumentEditorPage = () => {
  const { type } = useParams();
  if (!isDocumentType(type)) return <Navigate to='/documents' replace />;

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-950'>
      <div className='print:hidden'>
        <Header />
      </div>
      {type === 'quotation' && <QuotationEditor />}
      {/* Keyed so each tab mounts fresh and re-reads the shared draft. */}
      {type === 'commercial-invoice' && <TradeEditor key='invoice' mode='invoice' />}
      {type === 'packing-list' && <TradeEditor key='packing' mode='packing' />}
    </div>
  );
};

export default DocumentEditorPage;
