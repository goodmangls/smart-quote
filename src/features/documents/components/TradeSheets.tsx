import React from 'react';
import { formatMoney, formatQty, invoiceTotals, lineAmount, lineCbm, packingTotals } from '../calc';
import type { Party, TradeShipment } from '../types';
import { MultiLine } from './fields';
import { SheetFrame } from './DocumentEditorLayout';

/**
 * Commercial invoice and packing list. Both render the same shipment record,
 * so the invoice number, parties and item lines always agree — customs
 * compares the two documents side by side.
 */

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className='text-[8.5px] font-semibold uppercase tracking-[0.1em] text-gray-500'>{children}</p>
);

const Box = ({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`border border-gray-900 p-2 ${className}`}>
    <Label>{label}</Label>
    <div className='mt-0.5 min-h-[14px]'>{children}</div>
  </div>
);

const PartyBlock = ({ party }: { party: Party }) => (
  <>
    <p className='font-semibold'>{party.name || '—'}</p>
    <MultiLine text={party.address} className='text-gray-700' />
    {party.contact && <p className='text-gray-700'>{party.contact}</p>}
  </>
);

const Value = ({ children }: { children: React.ReactNode }) => (
  <p className='font-medium'>{children || '—'}</p>
);

const TradeHeader = ({ doc, title }: { doc: TradeShipment; title: string }) => (
  <>
    <header className='mb-3 flex items-center justify-between gap-6'>
      {doc.logo ? (
        <img
          src={doc.logo}
          alt={doc.shipper.name || 'Company logo'}
          className='h-9 w-auto object-contain'
        />
      ) : (
        <span />
      )}
      <h1 className='text-[20px] font-bold tracking-[0.2em]'>{title}</h1>
    </header>

    <div className='grid grid-cols-4 [&>*]:-ml-px [&>*]:-mt-px'>
      <Box label='Shipper / Exporter' className='col-span-2 row-span-2'>
        <PartyBlock party={doc.shipper} />
      </Box>
      <Box label='Invoice No.'>
        <Value>{doc.invoiceNo}</Value>
      </Box>
      <Box label='Date'>
        <Value>{doc.invoiceDate}</Value>
      </Box>
      <Box label='Reference / PO No.' className='col-span-2'>
        <Value>{doc.reference}</Value>
      </Box>
      <Box label='Consignee' className='col-span-2'>
        <PartyBlock party={doc.consignee} />
      </Box>
      <Box label='Notify Party' className='col-span-2'>
        {doc.notifyParty.name ? (
          <PartyBlock party={doc.notifyParty} />
        ) : (
          <p className='font-medium'>Same as consignee</p>
        )}
      </Box>
    </div>

    <div className='grid grid-cols-4 [&>*]:-ml-px [&>*]:-mt-px'>
      <Box label='Port of Loading'>
        <Value>{doc.portOfLoading}</Value>
      </Box>
      <Box label='Port of Discharge'>
        <Value>{doc.portOfDischarge}</Value>
      </Box>
      <Box label='Carrier / Flight'>
        <Value>{doc.carrier}</Value>
      </Box>
      <Box label='Departure Date'>
        <Value>{doc.departureDate}</Value>
      </Box>
      <Box label='Country of Origin'>
        <Value>{doc.countryOfOrigin}</Value>
      </Box>
      <Box label='Final Destination'>
        <Value>{doc.destination}</Value>
      </Box>
      <Box label='Terms of Delivery'>
        <Value>{doc.incoterm}</Value>
      </Box>
      <Box label='Terms of Payment'>
        <Value>{doc.paymentTerms}</Value>
      </Box>
    </div>
  </>
);

const TradeFooter = ({ doc }: { doc: TradeShipment }) => (
  <footer className='document-row mt-6 flex items-end justify-between gap-8'>
    <div className='min-w-0 flex-1'>
      {doc.remarks.trim() && (
        <>
          <Label>Remarks</Label>
          <MultiLine text={doc.remarks} className='text-gray-700' />
        </>
      )}
      <p className='mt-3 text-[9.5px] text-gray-600'>
        We hereby certify that the information on this document is true and correct.
      </p>
    </div>
    <div className='w-[60mm] shrink-0 text-center'>
      <div className='h-12 border-b border-gray-900' />
      <p className='mt-1 font-semibold'>{doc.signatory || ' '}</p>
      <p className='text-[8.5px] uppercase tracking-[0.1em] text-gray-500'>Authorized Signature</p>
    </div>
  </footer>
);

const th =
  'border border-gray-900 bg-gray-100 px-1.5 py-1 text-[8.5px] font-semibold uppercase tracking-[0.06em]';
const td = 'border border-gray-900 px-1.5 py-1 align-top';
const num = `${td} text-right tabular-nums`;

export const CommercialInvoiceSheet = ({ doc }: { doc: TradeShipment }) => {
  const totals = invoiceTotals(doc.items);
  return (
    <SheetFrame label='Commercial invoice preview'>
      <TradeHeader doc={doc} title='COMMERCIAL INVOICE' />
      <table className='mt-3 w-full border-collapse'>
        <thead>
          <tr>
            <th className={`${th} text-left`}>Marks & Nos.</th>
            <th className={`${th} text-left`}>Description of Goods</th>
            <th className={th}>HS Code</th>
            <th className={th}>Origin</th>
            <th className={th}>Qty</th>
            <th className={th}>Unit Price ({doc.currency})</th>
            <th className={th}>Amount ({doc.currency})</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((item, i) => (
            <tr key={i} className='document-row'>
              <td className={td}>{item.marks}</td>
              <td className={td}>{item.description || '—'}</td>
              <td className={`${td} text-center`}>{item.hsCode}</td>
              <td className={`${td} text-center`}>{item.origin}</td>
              <td className={num}>
                {formatQty(item.quantity)} {item.unit}
              </td>
              <td className={num}>{formatMoney(item.unitPrice, doc.currency)}</td>
              <td className={num}>{formatMoney(lineAmount(item), doc.currency)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className='document-row font-bold'>
            <td className={`${td} text-right`} colSpan={4}>
              TOTAL
            </td>
            <td className={num}>{formatQty(totals.quantity)}</td>
            <td className={td} />
            <td className={num}>
              {doc.currency} {formatMoney(totals.amount, doc.currency)}
            </td>
          </tr>
        </tfoot>
      </table>
      <TradeFooter doc={doc} />
    </SheetFrame>
  );
};

export const PackingListSheet = ({ doc }: { doc: TradeShipment }) => {
  const totals = packingTotals(doc.items);
  return (
    <SheetFrame label='Packing list preview'>
      <TradeHeader doc={doc} title='PACKING LIST' />
      <table className='mt-3 w-full border-collapse'>
        <thead>
          <tr>
            <th className={`${th} text-left`}>Marks & Nos.</th>
            <th className={`${th} text-left`}>Description of Goods</th>
            <th className={th}>Packages</th>
            <th className={th}>Qty</th>
            <th className={th}>Net Wt (kg)</th>
            <th className={th}>Gross Wt (kg)</th>
            <th className={th}>Dimensions (cm)</th>
            <th className={th}>CBM</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((item, i) => (
            <tr key={i} className='document-row'>
              <td className={td}>{item.marks}</td>
              <td className={td}>{item.description || '—'}</td>
              <td className={num}>
                {formatQty(item.packages)} {item.packageType}
              </td>
              <td className={num}>
                {formatQty(item.quantity)} {item.unit}
              </td>
              <td className={num}>{formatQty(item.netWeightKg)}</td>
              <td className={num}>{formatQty(item.grossWeightKg)}</td>
              <td className={`${td} text-center tabular-nums`}>
                {item.lengthCm || item.widthCm || item.heightCm
                  ? `${formatQty(item.lengthCm, 1)} × ${formatQty(item.widthCm, 1)} × ${formatQty(item.heightCm, 1)}`
                  : ''}
              </td>
              <td className={num}>{formatQty(lineCbm(item))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className='document-row font-bold'>
            <td className={`${td} text-right`} colSpan={2}>
              TOTAL
            </td>
            <td className={num}>{formatQty(totals.packages)}</td>
            <td className={td} />
            <td className={num}>{formatQty(totals.netWeightKg)}</td>
            <td className={num}>{formatQty(totals.grossWeightKg)}</td>
            <td className={td} />
            <td className={num}>{formatQty(totals.cbm)}</td>
          </tr>
        </tfoot>
      </table>
      <TradeFooter doc={doc} />
    </SheetFrame>
  );
};
