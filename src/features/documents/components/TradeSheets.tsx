import React from 'react';
import { formatMoney, formatQty, invoiceTotals, lineAmount, lineCbm, packingTotals } from '../calc';
import type { Payer, ProformaInvoice, TradeCore, TradeShipment } from '../types';
import { MultiLine } from './fields';
import { SheetFrame } from './DocumentEditorLayout';
import {
  Box,
  Label,
  Note,
  num,
  PartyBlock,
  SheetHeading,
  Signature,
  td,
  th,
  Value,
} from './sheetParts';
import { boxGrid } from './sheetStyles';

/**
 * Commercial invoice, packing list and shipping instruction render the same
 * shipment record, so the invoice number, parties and item lines always
 * agree — customs compares the documents side by side. The proforma invoice
 * uses the invoice layout with its own record.
 */

const TradeHeader = ({ doc, title }: { doc: TradeCore; title: string }) => (
  <>
    <SheetHeading logo={doc.logo} logoAlt={doc.shipper.name} title={title} />

    <div className={boxGrid[4]}>
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

    <div className={boxGrid[4]}>
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

const TradeFooter = ({ doc, statement }: { doc: TradeCore; statement: string }) => (
  <footer className='document-row mt-6 flex items-end justify-between gap-8'>
    <div className='min-w-0 flex-1'>
      {doc.remarks.trim() && (
        <>
          <Label>Remarks</Label>
          <MultiLine text={doc.remarks} className='text-gray-700' />
        </>
      )}
      <p className='mt-3 text-[9.5px] text-gray-600'>{statement}</p>
    </div>
    <Signature name={doc.signatory} caption='Authorized Signature' />
  </footer>
);

const CERTIFY = 'We hereby certify that the information on this document is true and correct.';

const InvoiceTable = ({ doc }: { doc: TradeCore }) => {
  const totals = invoiceTotals(doc.items);
  return (
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
  );
};

export const CommercialInvoiceSheet = ({ doc }: { doc: TradeShipment }) => (
  <SheetFrame label='Commercial invoice preview'>
    <TradeHeader doc={doc} title='COMMERCIAL INVOICE' />
    <InvoiceTable doc={doc} />
    <TradeFooter doc={doc} statement={CERTIFY} />
  </SheetFrame>
);

export const ProformaInvoiceSheet = ({ doc }: { doc: ProformaInvoice }) => (
  <SheetFrame label='Proforma invoice preview'>
    <TradeHeader doc={doc} title='PROFORMA INVOICE' />
    <InvoiceTable doc={doc} />
    <div className={`${boxGrid[3]} document-row mt-3`}>
      <Box label='Valid Until'>
        <Value>{doc.validUntil}</Value>
      </Box>
      <Box label='Bank Details (for advance payment)' className='col-span-2'>
        {doc.bankDetails.trim() ? <MultiLine text={doc.bankDetails} /> : <Value>{''}</Value>}
      </Box>
    </div>
    <TradeFooter
      doc={doc}
      statement='This proforma invoice is issued for quotation, payment or import-licence purposes and is not a demand for payment of a shipped consignment.'
    />
  </SheetFrame>
);

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
      <TradeFooter doc={doc} statement={CERTIFY} />
    </SheetFrame>
  );
};

const PAYER_LABEL: Record<Payer, string> = {
  shipper: 'Shipper',
  consignee: 'Consignee',
  'third-party': 'Third party',
};

/** Booking request from the shipper to the forwarder, built from the same shipment record. */
export const ShippingInstructionSheet = ({ doc }: { doc: TradeShipment }) => {
  const si = doc.instructions;
  const totals = packingTotals(doc.items);
  return (
    <SheetFrame label='Shipping instruction preview'>
      <SheetHeading logo={doc.logo} logoAlt={doc.shipper.name} title='SHIPPING INSTRUCTION' />

      <div className={boxGrid[4]}>
        <Box label='To (Forwarder / Carrier)' className='col-span-2 row-span-2'>
          <PartyBlock party={si.forwarder} />
        </Box>
        <Box label='Invoice No.'>
          <Value>{doc.invoiceNo}</Value>
        </Box>
        <Box label='Date'>
          <Value>{doc.invoiceDate}</Value>
        </Box>
        <Box label='Service'>
          <Value>{si.service}</Value>
        </Box>
        <Box label='Account No.'>
          <Value>{si.accountNo}</Value>
        </Box>
        <Box label='Shipper' className='col-span-2'>
          <PartyBlock party={doc.shipper} />
        </Box>
        <Box label='Consignee' className='col-span-2'>
          <PartyBlock party={doc.consignee} />
        </Box>
      </div>

      <div className={boxGrid[4]}>
        <Box label='Pickup Address' className='col-span-2'>
          {si.pickupAddress.trim() ? <MultiLine text={si.pickupAddress} /> : <Value>{''}</Value>}
        </Box>
        <Box label='Pickup Date'>
          <Value>{si.pickupDate}</Value>
        </Box>
        <Box label='Pickup Contact'>
          <Value>{si.pickupContact}</Value>
        </Box>
        <Box label='Port of Loading'>
          <Value>{doc.portOfLoading}</Value>
        </Box>
        <Box label='Port of Discharge'>
          <Value>{doc.portOfDischarge}</Value>
        </Box>
        <Box label='Final Destination'>
          <Value>{doc.destination}</Value>
        </Box>
        <Box label='Incoterm'>
          <Value>{doc.incoterm}</Value>
        </Box>
        <Box label='Freight Charges Paid By'>
          <Value>{PAYER_LABEL[si.freightPaidBy]}</Value>
        </Box>
        <Box label='Duties & Taxes Paid By'>
          <Value>{PAYER_LABEL[si.dutiesPaidBy]}</Value>
        </Box>
        <Box label='Insurance' className='col-span-2'>
          <Value>
            {si.insurance
              ? `Required — insured value ${doc.currency} ${formatMoney(si.insuredValue, doc.currency)}`
              : 'Not required'}
          </Value>
        </Box>
      </div>

      <table className='mt-3 w-full border-collapse'>
        <thead>
          <tr>
            <th className={`${th} text-left`}>Marks & Nos.</th>
            <th className={`${th} text-left`}>Description of Goods</th>
            <th className={th}>HS Code</th>
            <th className={th}>Packages</th>
            <th className={th}>Gross Wt (kg)</th>
            <th className={th}>CBM</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((item, i) => (
            <tr key={i} className='document-row'>
              <td className={td}>{item.marks}</td>
              <td className={td}>{item.description || '—'}</td>
              <td className={`${td} text-center`}>{item.hsCode}</td>
              <td className={num}>
                {formatQty(item.packages)} {item.packageType}
              </td>
              <td className={num}>{formatQty(item.grossWeightKg)}</td>
              <td className={num}>{formatQty(lineCbm(item))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className='document-row font-bold'>
            <td className={`${td} text-right`} colSpan={3}>
              TOTAL
            </td>
            <td className={num}>{formatQty(totals.packages)}</td>
            <td className={num}>{formatQty(totals.grossWeightKg)}</td>
            <td className={num}>{formatQty(totals.cbm)}</td>
          </tr>
        </tfoot>
      </table>

      <Note label='Documents Enclosed' text={si.documentsEnclosed} />
      <Note label='Special Instructions' text={si.specialInstructions} />

      <footer className='document-row mt-6 flex justify-end'>
        <Signature name={doc.signatory} caption='Shipper Signature' />
      </footer>
    </SheetFrame>
  );
};
