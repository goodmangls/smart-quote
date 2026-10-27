import React from 'react';
import { chargeAmount, chargeTotals, formatMoney, formatQty } from '../calc';
import type { ArrivalNotice, ChargeLine, FreightInvoice } from '../types';
import { MultiLine } from './fields';
import { SheetFrame } from './DocumentEditorLayout';
import {
  Box,
  Note,
  num,
  PartyBlock,
  SheetHeading,
  td,
  th,
  Totals,
  type TotalRow,
  Value,
} from './sheetParts';
import { boxGrid } from './sheetStyles';

/**
 * Forwarder documents that bill charges. One currency per document; VAT is
 * charged on the lines marked taxable only, because international freight is
 * zero-rated while local handling is not.
 */

const ChargesTable = ({
  charges,
  currency,
}: {
  charges: readonly ChargeLine[];
  currency: string;
}) => (
  <table className='mt-3 w-full border-collapse'>
    <thead>
      <tr>
        <th className={`${th} w-8`}>No.</th>
        <th className={`${th} text-left`}>Description</th>
        <th className={th}>Qty</th>
        <th className={th}>Rate ({currency})</th>
        <th className={th}>Amount ({currency})</th>
        <th className={th}>VAT</th>
      </tr>
    </thead>
    <tbody>
      {charges.map((line, i) => (
        <tr key={i} className='document-row'>
          <td className={`${td} text-center`}>{i + 1}</td>
          <td className={td}>{line.description || '—'}</td>
          <td className={num}>
            {formatQty(line.quantity)} {line.unit}
          </td>
          <td className={num}>{formatMoney(line.rate, currency)}</td>
          <td className={num}>{formatMoney(chargeAmount(line), currency)}</td>
          <td className={`${td} text-center`}>{line.taxable ? 'Taxable' : 'Zero-rated'}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const chargeRows = (charges: readonly ChargeLine[], vatRate: number, currency: string) => {
  const totals = chargeTotals(charges, vatRate);
  const money = (v: number) => `${currency} ${formatMoney(v, currency)}`;
  const rows: TotalRow[] = [];
  if (totals.nonTaxable > 0)
    rows.push({ label: 'Zero-rated charges', value: money(totals.nonTaxable) });
  if (totals.taxable > 0) rows.push({ label: 'Taxable charges', value: money(totals.taxable) });
  if (vatRate > 0 && totals.taxable > 0)
    rows.push({ label: `VAT ${vatRate}%`, value: money(totals.vat) });
  rows.push({ label: 'Total Due', value: money(totals.total), strong: true });
  return rows;
};

export const FreightInvoiceSheet = ({ doc }: { doc: FreightInvoice }) => {
  const isDebit = doc.variant === 'debit-note';
  return (
    <SheetFrame label={isDebit ? 'Debit note preview' : 'Freight invoice preview'}>
      <SheetHeading
        logo={doc.logo}
        logoAlt={doc.issuer.name}
        title={isDebit ? 'DEBIT NOTE' : 'FREIGHT INVOICE'}
      />
      <div className={boxGrid[4]}>
        <Box label='From' className='col-span-2 row-span-2'>
          <PartyBlock party={doc.issuer} />
          {doc.issuerRegNo && <p className='text-gray-700'>Reg. No. {doc.issuerRegNo}</p>}
        </Box>
        <Box label={isDebit ? 'Debit Note No.' : 'Invoice No.'}>
          <Value>{doc.invoiceNo}</Value>
        </Box>
        <Box label='Date'>
          <Value>{doc.date}</Value>
        </Box>
        <Box label='Due Date'>
          <Value>{doc.dueDate}</Value>
        </Box>
        <Box label='Shipment Ref. (AWB / B/L)'>
          <Value>{doc.shipmentRef}</Value>
        </Box>
        <Box label='Bill To' className='col-span-4'>
          <PartyBlock party={doc.billTo} />
        </Box>
      </div>
      <div className={boxGrid[4]}>
        <Box label='Carrier'>
          <Value>{doc.carrier}</Value>
        </Box>
        <Box label='Route'>
          <Value>{[doc.origin, doc.destination].filter(Boolean).join(' → ')}</Value>
        </Box>
        <Box label='Ship Date'>
          <Value>{doc.shipDate}</Value>
        </Box>
        <Box label='Pieces / Chargeable Wt'>
          <Value>
            {doc.pieces || doc.chargeableWeightKg
              ? `${formatQty(doc.pieces)} pcs / ${formatQty(doc.chargeableWeightKg)} kg`
              : ''}
          </Value>
        </Box>
      </div>

      <ChargesTable charges={doc.charges} currency={doc.currency} />
      <Totals rows={chargeRows(doc.charges, doc.vatRate, doc.currency)} />
      {doc.exchangeRateNote && (
        <p className='document-row mt-1 text-right text-[9px] text-gray-500'>
          {doc.exchangeRateNote}
        </p>
      )}

      {doc.bankDetails.trim() && (
        <div className={`${boxGrid[2]} document-row mt-4`}>
          <Box label='Remit To' className='col-span-2'>
            <MultiLine text={doc.bankDetails} />
          </Box>
        </div>
      )}
      <Note label='Notes' text={doc.notes} />
    </SheetFrame>
  );
};

export const ArrivalNoticeSheet = ({ doc }: { doc: ArrivalNotice }) => {
  const isAir = doc.mode === 'air';
  return (
    <SheetFrame label='Arrival notice preview'>
      <SheetHeading
        logo={doc.logo}
        logoAlt={doc.issuer.name}
        title='ARRIVAL NOTICE'
        subtitle={isAir ? 'Air cargo' : 'Ocean cargo'}
      />
      <div className={boxGrid[4]}>
        <Box label='From' className='col-span-2 row-span-2'>
          <PartyBlock party={doc.issuer} />
        </Box>
        <Box label='Notice No.'>
          <Value>{doc.noticeNo}</Value>
        </Box>
        <Box label='Date'>
          <Value>{doc.date}</Value>
        </Box>
        <Box label={isAir ? 'MAWB No.' : 'Master B/L No.'}>
          <Value>{doc.masterNo}</Value>
        </Box>
        <Box label={isAir ? 'HAWB No.' : 'House B/L No.'}>
          <Value>{doc.houseNo}</Value>
        </Box>
        <Box label='Notify (Consignee)' className='col-span-4'>
          <PartyBlock party={doc.notifyTo} />
        </Box>
      </div>
      <div className={boxGrid[4]}>
        <Box label={isAir ? 'Airline / Flight' : 'Vessel / Voyage'}>
          <Value>{doc.carrier}</Value>
        </Box>
        <Box label={isAir ? 'Airport of Departure' : 'Port of Loading'}>
          <Value>{doc.portOfLoading}</Value>
        </Box>
        <Box label={isAir ? 'Airport of Arrival' : 'Port of Discharge'}>
          <Value>{doc.portOfDischarge}</Value>
        </Box>
        <Box label='ETA'>
          <Value>{doc.eta}</Value>
        </Box>
        <Box label='Cargo Location / Warehouse' className='col-span-2'>
          <Value>{doc.warehouse}</Value>
        </Box>
        <Box label='Free Time Until' className='col-span-2'>
          <Value>{doc.freeTimeUntil}</Value>
        </Box>
        <Box label='Description of Goods' className='col-span-2'>
          <Value>{doc.description}</Value>
        </Box>
        <Box label='Pieces / Gross Wt'>
          <Value>
            {doc.pieces || doc.grossWeightKg
              ? `${formatQty(doc.pieces)} pcs / ${formatQty(doc.grossWeightKg)} kg`
              : ''}
          </Value>
        </Box>
        <Box label={isAir ? 'Chargeable Wt' : 'Volume'}>
          <Value>
            {isAir
              ? doc.chargeableWeightKg
                ? `${formatQty(doc.chargeableWeightKg)} kg`
                : ''
              : doc.cbm
                ? `${formatQty(doc.cbm)} CBM`
                : ''}
          </Value>
        </Box>
      </div>

      {doc.charges.length > 0 && (
        <>
          <ChargesTable charges={doc.charges} currency={doc.currency} />
          <Totals rows={chargeRows(doc.charges, doc.vatRate, doc.currency)} />
        </>
      )}
      <Note label='Documents Required for Release' text={doc.documentsRequired} />
      <Note label='Remarks' text={doc.remarks} />
    </SheetFrame>
  );
};
