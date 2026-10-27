import React from 'react';
import { formatMoney, formatQty, lineAmount, orderTotals } from '../calc';
import type { OrderLine, PurchaseOrder, SalesContract } from '../types';
import { MultiLine } from './fields';
import { SheetFrame } from './DocumentEditorLayout';
import {
  Box,
  Note,
  num,
  PartyBlock,
  SheetHeading,
  Signature,
  td,
  th,
  Totals,
  type TotalRow,
  Value,
} from './sheetParts';
import { boxGrid } from './sheetStyles';

/** Offer sheet / sales contract and purchase order: priced quantity × unit price lines. */

const OrderLinesTable = ({
  items,
  currency,
}: {
  items: readonly OrderLine[];
  currency: string;
}) => (
  <table className='mt-3 w-full border-collapse'>
    <thead>
      <tr>
        <th className={`${th} w-8`}>No.</th>
        <th className={`${th} text-left`}>Description / Specification</th>
        <th className={th}>Qty</th>
        <th className={th}>Unit Price ({currency})</th>
        <th className={th}>Amount ({currency})</th>
      </tr>
    </thead>
    <tbody>
      {items.map((line, i) => (
        <tr key={i} className='document-row'>
          <td className={`${td} text-center`}>{i + 1}</td>
          <td className={td}>
            <p className='font-medium'>{line.description || '—'}</p>
            <MultiLine text={line.specification} className='text-gray-600' />
          </td>
          <td className={num}>
            {formatQty(line.quantity)} {line.unit}
          </td>
          <td className={num}>{formatMoney(line.unitPrice, currency)}</td>
          <td className={num}>{formatMoney(lineAmount(line), currency)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const money = (value: number, currency: string) => `${currency} ${formatMoney(value, currency)}`;

/** One row per term that was filled in — an empty clause is left off the page. */
const TermRows = ({ rows }: { rows: readonly [string, string][] }) => {
  const filled = rows.filter(([, value]) => value.trim() !== '');
  if (filled.length === 0) return null;
  return (
    <table className='document-row mt-4 w-full border-collapse'>
      <tbody>
        {filled.map(([label, value]) => (
          <tr key={label}>
            <th className={`${th} w-[38mm] text-left align-top`}>{label}</th>
            <td className={td}>
              <MultiLine text={value} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export const SalesContractSheet = ({ doc }: { doc: SalesContract }) => {
  const isOffer = doc.variant === 'offer';
  const totals = orderTotals(doc.items);
  return (
    <SheetFrame label={isOffer ? 'Offer sheet preview' : 'Sales contract preview'}>
      <SheetHeading
        logo={doc.logo}
        logoAlt={doc.seller.name}
        title={isOffer ? 'OFFER SHEET' : 'SALES CONTRACT'}
      />
      <div className={boxGrid[4]}>
        <Box label='Seller' className='col-span-2 row-span-2'>
          <PartyBlock party={doc.seller} />
        </Box>
        <Box label={isOffer ? 'Offer No.' : 'Contract No.'}>
          <Value>{doc.refNo}</Value>
        </Box>
        <Box label='Date'>
          <Value>{doc.date}</Value>
        </Box>
        <Box label={isOffer ? 'Offer Valid Until' : 'Valid Until'} className='col-span-2'>
          <Value>{doc.validUntil}</Value>
        </Box>
        <Box label='Buyer' className='col-span-4'>
          <PartyBlock party={doc.buyer} />
        </Box>
      </div>

      <p className='mt-3 text-gray-700'>
        {isOffer
          ? 'We are pleased to offer the following goods on the terms and conditions set out below.'
          : 'The Seller agrees to sell and the Buyer agrees to buy the following goods on the terms and conditions set out below.'}
      </p>

      <OrderLinesTable items={doc.items} currency={doc.currency} />
      <Totals
        rows={[{ label: 'Total Amount', value: money(totals.total, doc.currency), strong: true }]}
      />

      <TermRows
        rows={[
          ['Price Terms', [doc.incoterm, doc.namedPlace].filter(Boolean).join(' ')],
          ['Origin', doc.origin],
          ['Packing', doc.packing],
          ['Shipment', doc.shipmentPeriod],
          ['Port of Loading', doc.portOfLoading],
          ['Port of Destination', doc.portOfDestination],
          ['Payment', doc.payment],
          ['Inspection', doc.inspection],
          ['Insurance', doc.insurance],
        ]}
      />
      <Note label='Other Terms and Conditions' text={doc.otherTerms} />

      <footer className='document-row mt-8 flex items-end justify-between gap-8'>
        {isOffer ? (
          <>
            <Signature name={doc.buyerSignatory} caption='Accepted by (Buyer)' />
            <Signature name={doc.sellerSignatory} caption='Offered by (Seller)' />
          </>
        ) : (
          <>
            <Signature name={doc.buyerSignatory} caption='Buyer' />
            <Signature name={doc.sellerSignatory} caption='Seller' />
          </>
        )}
      </footer>
    </SheetFrame>
  );
};

export const PurchaseOrderSheet = ({ doc }: { doc: PurchaseOrder }) => {
  const totals = orderTotals(doc.items, doc.taxRate);
  const rows: TotalRow[] =
    doc.taxRate > 0
      ? [
          { label: 'Subtotal', value: money(totals.subtotal, doc.currency) },
          { label: `Tax ${doc.taxRate}%`, value: money(totals.tax, doc.currency) },
          { label: 'Total', value: money(totals.total, doc.currency), strong: true },
        ]
      : [{ label: 'Total', value: money(totals.total, doc.currency), strong: true }];

  return (
    <SheetFrame label='Purchase order preview'>
      <SheetHeading logo={doc.logo} logoAlt={doc.buyer.name} title='PURCHASE ORDER' />
      <div className={boxGrid[4]}>
        <Box label='Buyer' className='col-span-2 row-span-2'>
          <PartyBlock party={doc.buyer} />
        </Box>
        <Box label='PO No.'>
          <Value>{doc.poNo}</Value>
        </Box>
        <Box label='Date'>
          <Value>{doc.date}</Value>
        </Box>
        <Box label='Required Delivery'>
          <Value>{doc.deliveryDate}</Value>
        </Box>
        <Box label='Delivery Terms'>
          <Value>{doc.incoterm}</Value>
        </Box>
        <Box label='Supplier' className='col-span-2'>
          <PartyBlock party={doc.supplier} />
        </Box>
        <Box label='Ship To' className='col-span-2'>
          {doc.shipTo.name ? (
            <PartyBlock party={doc.shipTo} />
          ) : (
            <p className='font-medium'>Same as buyer</p>
          )}
        </Box>
        <Box label='Payment Terms' className='col-span-2'>
          <Value>{doc.paymentTerms}</Value>
        </Box>
        <Box label='Shipping Method' className='col-span-2'>
          <Value>{doc.shippingMethod}</Value>
        </Box>
      </div>

      <OrderLinesTable items={doc.items} currency={doc.currency} />
      <Totals rows={rows} />
      <Note label='Notes' text={doc.notes} />

      <footer className='document-row mt-8 flex justify-end'>
        <Signature name={doc.signatory} caption='Authorized by (Buyer)' />
      </footer>
    </SheetFrame>
  );
};
