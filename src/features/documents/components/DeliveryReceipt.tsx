import React from 'react';
import { formatQty, roundWeight } from '../calc';
import { emptyDeliveryLine } from '../defaults';
import type { DeliveryReceipt } from '../types';
import {
  MultiLine,
  FormSection,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from './fields';
import { LineList, PartyFields } from './formParts';
import { LogoField } from './LogoField';
import { SheetFrame } from './DocumentEditorLayout';
import {
  Box,
  num,
  PartyBlock,
  SheetHeading,
  Signature,
  td,
  th,
  Value,
} from './sheetParts';
import { boxGrid } from './sheetStyles';

/** Proof of delivery: what arrived, in what condition, signed by both sides. */

const CONDITIONS = [
  { value: 'good', label: 'Received in good order and condition' },
  { value: 'damaged', label: 'Received with damage' },
  { value: 'shortage', label: 'Received with shortage' },
] as const;

const sum = (values: number[]) => values.reduce((acc, v) => acc + v, 0);

export const DeliveryReceiptSheet = ({ doc }: { doc: DeliveryReceipt }) => (
  <SheetFrame label='Delivery receipt preview'>
    <SheetHeading
      logo={doc.logo}
      logoAlt={doc.carrier}
      title='DELIVERY RECEIPT'
      subtitle='Proof of Delivery (POD)'
    />
    <div className={boxGrid[4]}>
      <Box label='Receipt No.'>
        <Value>{doc.receiptNo}</Value>
      </Box>
      <Box label='Tracking / AWB No.'>
        <Value>{doc.trackingNo}</Value>
      </Box>
      <Box label='Carrier'>
        <Value>{doc.carrier}</Value>
      </Box>
      <Box label='Delivered On'>
        <Value>{[doc.deliveryDate, doc.deliveryTime].filter(Boolean).join(' ')}</Value>
      </Box>
      <Box label='Shipper' className='col-span-2'>
        <PartyBlock party={doc.shipper} />
      </Box>
      <Box label='Consignee' className='col-span-2'>
        <PartyBlock party={doc.consignee} />
      </Box>
      <Box label='Delivery Address' className='col-span-4'>
        {doc.deliveryAddress.trim() ? (
          <MultiLine text={doc.deliveryAddress} />
        ) : (
          <Value>{''}</Value>
        )}
      </Box>
    </div>

    <table className='mt-3 w-full border-collapse'>
      <thead>
        <tr>
          <th className={`${th} w-8`}>No.</th>
          <th className={`${th} text-left`}>Description of Goods</th>
          <th className={th}>Packages</th>
          <th className={th}>Weight (kg)</th>
        </tr>
      </thead>
      <tbody>
        {doc.items.map((line, i) => (
          <tr key={i} className='document-row'>
            <td className={`${td} text-center`}>{i + 1}</td>
            <td className={td}>{line.description || '—'}</td>
            <td className={num}>
              {formatQty(line.packages)} {line.packageType}
            </td>
            <td className={num}>{formatQty(line.weightKg)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className='document-row font-bold'>
          <td className={`${td} text-right`} colSpan={2}>
            TOTAL
          </td>
          <td className={num}>{formatQty(roundWeight(sum(doc.items.map((l) => l.packages))))}</td>
          <td className={num}>{formatQty(roundWeight(sum(doc.items.map((l) => l.weightKg))))}</td>
        </tr>
      </tfoot>
    </table>

    <section className='document-row mt-4 border border-gray-900 p-2'>
      <ul className='space-y-1'>
        {CONDITIONS.map((c) => (
          <li key={c.value} className='flex items-center gap-2'>
            <span
              aria-hidden
              className='inline-flex h-3 w-3 items-center justify-center border border-gray-900 text-[9px] leading-none'
            >
              {doc.condition === c.value ? '✓' : ''}
            </span>
            <span className={doc.condition === c.value ? 'font-semibold' : 'text-gray-600'}>
              {c.label}
            </span>
          </li>
        ))}
      </ul>
      {doc.conditionRemarks.trim() && (
        <div className='mt-2 border-t border-gray-300 pt-1 text-gray-700'>
          <MultiLine text={doc.conditionRemarks} />
        </div>
      )}
    </section>

    <footer className='document-row mt-8 flex items-end justify-between gap-8'>
      <Signature name={doc.deliveredBy} caption='Delivered by' />
      <Signature name={doc.receivedBy} caption='Received by (name & signature)' />
    </footer>
  </SheetFrame>
);

interface FormProps {
  doc: DeliveryReceipt;
  update: (patch: Partial<DeliveryReceipt>) => void;
}

export const DeliveryReceiptForm = ({ doc, update }: FormProps) => (
  <div className='space-y-5'>
    <FormSection title='Delivery'>
      <div className='grid grid-cols-2 gap-3'>
        <TextField
          label='Receipt No.'
          value={doc.receiptNo}
          onChange={(receiptNo) => update({ receiptNo })}
        />
        <TextField
          label='Tracking / AWB No.'
          value={doc.trackingNo}
          onChange={(trackingNo) => update({ trackingNo })}
        />
        <TextField
          label='Carrier'
          value={doc.carrier}
          onChange={(carrier) => update({ carrier })}
        />
        <TextField
          label='Delivery date'
          value={doc.deliveryDate}
          onChange={(deliveryDate) => update({ deliveryDate })}
        />
        <TextField
          label='Delivery time'
          value={doc.deliveryTime}
          onChange={(deliveryTime) => update({ deliveryTime })}
        />
      </div>
      <TextAreaField
        label='Delivery address'
        rows={2}
        value={doc.deliveryAddress}
        onChange={(deliveryAddress) => update({ deliveryAddress })}
      />
      <LogoField value={doc.logo} onChange={(logo) => update({ logo })} />
    </FormSection>

    <FormSection title='Shipper'>
      <PartyFields party={doc.shipper} onChange={(shipper) => update({ shipper })} />
    </FormSection>
    <FormSection title='Consignee'>
      <PartyFields party={doc.consignee} onChange={(consignee) => update({ consignee })} />
    </FormSection>

    <LineList
      title='Goods delivered'
      items={doc.items}
      onChange={(items) => update({ items })}
      create={emptyDeliveryLine}
      renderLine={(line, patch) => (
        <>
          <TextField
            label='Description of goods'
            value={line.description}
            onChange={(description) => patch({ description })}
          />
          <div className='grid grid-cols-3 gap-3'>
            <NumberField
              label='Packages'
              value={line.packages}
              onChange={(packages) => patch({ packages })}
            />
            <TextField
              label='Package type'
              value={line.packageType}
              onChange={(packageType) => patch({ packageType })}
            />
            <NumberField
              label='Weight (kg)'
              step={0.1}
              value={line.weightKg}
              onChange={(weightKg) => patch({ weightKg })}
            />
          </div>
        </>
      )}
    />

    <FormSection title='Condition & signatures'>
      <SelectField
        label='Condition on arrival'
        value={doc.condition}
        options={CONDITIONS}
        onChange={(condition) => update({ condition })}
      />
      <TextAreaField
        label='Exceptions (damage, shortage)'
        value={doc.conditionRemarks}
        onChange={(conditionRemarks) => update({ conditionRemarks })}
      />
      <div className='grid grid-cols-2 gap-3'>
        <TextField
          label='Delivered by'
          value={doc.deliveredBy}
          onChange={(deliveredBy) => update({ deliveredBy })}
        />
        <TextField
          label='Received by'
          value={doc.receivedBy}
          onChange={(receivedBy) => update({ receivedBy })}
        />
      </div>
    </FormSection>
  </div>
);
