import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Incoterm } from '@/types';
import { emptyTradeItem } from '../defaults';
import type { Party, TradeItem, TradeShipment } from '../types';
import { removeAt, replaceAt } from '../useDocumentDraft';
import { FormSection, NumberField, SelectField, TextAreaField, TextField } from './fields';
import { LogoField } from './LogoField';

export type TradeFormMode = 'invoice' | 'packing';

interface TradeShipmentFormProps {
  doc: TradeShipment;
  update: (patch: Partial<TradeShipment>) => void;
  /** Which item fields to show first; both documents edit the same lines. */
  mode: TradeFormMode;
}

const INCOTERMS = Object.values(Incoterm).map((value) => ({ value, label: value }));

const CURRENCIES = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'KRW', label: 'KRW' },
  { value: 'JPY', label: 'JPY' },
  { value: 'CNY', label: 'CNY' },
] as const;

const PartyFields = ({ party, onChange }: { party: Party; onChange: (party: Party) => void }) => (
  <>
    <TextField label='Name' value={party.name} onChange={(name) => onChange({ ...party, name })} />
    <TextAreaField
      label='Address'
      rows={2}
      value={party.address}
      onChange={(address) => onChange({ ...party, address })}
    />
    <TextField
      label='Contact (tel / email)'
      value={party.contact}
      onChange={(contact) => onChange({ ...party, contact })}
    />
  </>
);

const ItemFields = ({
  item,
  mode,
  currency,
  onChange,
}: {
  item: TradeItem;
  mode: TradeFormMode;
  currency: string;
  onChange: (patch: Partial<TradeItem>) => void;
}) => {
  const invoiceFields = (
    <div className='grid grid-cols-2 gap-3'>
      <TextField label='HS code' value={item.hsCode} onChange={(hsCode) => onChange({ hsCode })} />
      <TextField label='Origin' value={item.origin} onChange={(origin) => onChange({ origin })} />
      <NumberField
        label={`Unit price (${currency})`}
        step={0.01}
        value={item.unitPrice}
        onChange={(unitPrice) => onChange({ unitPrice })}
      />
    </div>
  );
  const packingFields = (
    <div className='grid grid-cols-2 gap-3'>
      <NumberField
        label='Packages'
        value={item.packages}
        onChange={(packages) => onChange({ packages })}
      />
      <TextField
        label='Package type'
        value={item.packageType}
        onChange={(packageType) => onChange({ packageType })}
      />
      <NumberField
        label='Net weight (kg)'
        step={0.1}
        value={item.netWeightKg}
        onChange={(netWeightKg) => onChange({ netWeightKg })}
      />
      <NumberField
        label='Gross weight (kg)'
        step={0.1}
        value={item.grossWeightKg}
        onChange={(grossWeightKg) => onChange({ grossWeightKg })}
      />
      <div className='col-span-2 grid grid-cols-3 gap-2'>
        <NumberField
          label='L (cm)'
          step={0.1}
          value={item.lengthCm}
          onChange={(lengthCm) => onChange({ lengthCm })}
        />
        <NumberField
          label='W (cm)'
          step={0.1}
          value={item.widthCm}
          onChange={(widthCm) => onChange({ widthCm })}
        />
        <NumberField
          label='H (cm)'
          step={0.1}
          value={item.heightCm}
          onChange={(heightCm) => onChange({ heightCm })}
        />
      </div>
    </div>
  );

  return (
    <>
      <TextField
        label='Description of goods'
        value={item.description}
        onChange={(description) => onChange({ description })}
      />
      <div className='grid grid-cols-3 gap-3'>
        <TextField
          label='Marks & Nos.'
          value={item.marks}
          onChange={(marks) => onChange({ marks })}
        />
        <NumberField
          label='Quantity'
          value={item.quantity}
          onChange={(quantity) => onChange({ quantity })}
        />
        <TextField label='Unit' value={item.unit} onChange={(unit) => onChange({ unit })} />
      </div>
      {mode === 'invoice' ? invoiceFields : packingFields}
      <details className='text-xs'>
        <summary className='cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'>
          {mode === 'invoice' ? 'Packing list fields' : 'Commercial invoice fields'}
        </summary>
        <div className='mt-2'>{mode === 'invoice' ? packingFields : invoiceFields}</div>
      </details>
    </>
  );
};

export const TradeShipmentForm = ({ doc, update, mode }: TradeShipmentFormProps) => (
  <div className='space-y-5'>
    <p className='rounded-md bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs text-gray-600 dark:text-gray-400'>
      The commercial invoice and the packing list share these details. A change here appears on
      both.
    </p>

    <FormSection title='Invoice'>
      <div className='grid grid-cols-2 gap-3'>
        <TextField
          label='Invoice No.'
          value={doc.invoiceNo}
          onChange={(invoiceNo) => update({ invoiceNo })}
        />
        <TextField
          label='Date'
          value={doc.invoiceDate}
          onChange={(invoiceDate) => update({ invoiceDate })}
        />
      </div>
      <TextField
        label='Reference / PO No.'
        value={doc.reference}
        onChange={(reference) => update({ reference })}
      />
      <LogoField value={doc.logo} onChange={(logo) => update({ logo })} />
    </FormSection>

    <FormSection title='Shipper / Exporter'>
      <PartyFields party={doc.shipper} onChange={(shipper) => update({ shipper })} />
    </FormSection>

    <FormSection title='Consignee'>
      <PartyFields party={doc.consignee} onChange={(consignee) => update({ consignee })} />
    </FormSection>

    <FormSection title='Notify party (leave blank if same as consignee)'>
      <PartyFields party={doc.notifyParty} onChange={(notifyParty) => update({ notifyParty })} />
    </FormSection>

    <FormSection title='Shipment'>
      <div className='grid grid-cols-2 gap-3'>
        <TextField
          label='Port of loading'
          value={doc.portOfLoading}
          onChange={(portOfLoading) => update({ portOfLoading })}
        />
        <TextField
          label='Port of discharge'
          value={doc.portOfDischarge}
          onChange={(portOfDischarge) => update({ portOfDischarge })}
        />
        <TextField
          label='Carrier / flight'
          value={doc.carrier}
          onChange={(carrier) => update({ carrier })}
        />
        <TextField
          label='Departure date'
          value={doc.departureDate}
          onChange={(departureDate) => update({ departureDate })}
        />
        <TextField
          label='Country of origin'
          value={doc.countryOfOrigin}
          onChange={(countryOfOrigin) => update({ countryOfOrigin })}
        />
        <TextField
          label='Final destination'
          value={doc.destination}
          onChange={(destination) => update({ destination })}
        />
        <SelectField
          label='Incoterm'
          value={doc.incoterm}
          options={INCOTERMS}
          onChange={(incoterm) => update({ incoterm })}
        />
        <TextField
          label='Payment terms'
          value={doc.paymentTerms}
          onChange={(paymentTerms) => update({ paymentTerms })}
        />
        <SelectField
          label='Currency'
          value={CURRENCIES.some((c) => c.value === doc.currency) ? doc.currency : 'USD'}
          options={CURRENCIES}
          onChange={(currency) => update({ currency })}
        />
      </div>
    </FormSection>

    <FormSection
      title='Items'
      action={
        <button
          type='button'
          onClick={() => update({ items: [...doc.items, emptyTradeItem()] })}
          className='inline-flex items-center gap-1 text-xs font-medium text-brand-blue-600 dark:text-brand-blue-300 hover:underline'
        >
          <Plus className='h-3.5 w-3.5' />
          Add item
        </button>
      }
    >
      {doc.items.map((item, i) => (
        <div
          key={i}
          className='space-y-2 rounded-md border border-gray-200 dark:border-gray-800 p-3'
        >
          <div className='flex items-center justify-between'>
            <span className='text-xs font-semibold text-gray-500'>Line {i + 1}</span>
            <button
              type='button'
              aria-label={`Remove line ${i + 1}`}
              onClick={() => update({ items: removeAt(doc.items, i) })}
              className='rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-destructive-600 dark:hover:bg-gray-800'
            >
              <Trash2 className='h-3.5 w-3.5' />
            </button>
          </div>
          <ItemFields
            item={item}
            mode={mode}
            currency={doc.currency}
            onChange={(patch) => update({ items: replaceAt(doc.items, i, patch) })}
          />
        </div>
      ))}
    </FormSection>

    <FormSection title='Footer'>
      <TextAreaField
        label='Remarks'
        value={doc.remarks}
        onChange={(remarks) => update({ remarks })}
      />
      <TextField
        label='Signatory name'
        value={doc.signatory}
        onChange={(signatory) => update({ signatory })}
      />
    </FormSection>
  </div>
);
