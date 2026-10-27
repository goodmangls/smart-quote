import React from 'react';
import { emptyTradeItem } from '../defaults';
import type { TradeCore, TradeItem } from '../types';
import { FormSection, NumberField, SelectField, TextAreaField, TextField } from './fields';
import { CurrencyField, INCOTERMS, LineList, PartyFields } from './formParts';
import { LogoField } from './LogoField';

export type TradeFormMode = 'invoice' | 'packing';

interface TradeShipmentFormProps {
  doc: TradeCore;
  update: (patch: Partial<TradeCore>) => void;
  /** Which item fields to show first; every shipment document edits the same lines. */
  mode: TradeFormMode;
  /** Shown above the form when the record is shared between documents. */
  sharedNote?: string;
}

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

export const TradeShipmentForm = ({ doc, update, mode, sharedNote }: TradeShipmentFormProps) => (
  <div className='space-y-5'>
    {sharedNote && (
      <p className='rounded-md bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs text-gray-600 dark:text-gray-400'>
        {sharedNote}
      </p>
    )}

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
        <CurrencyField value={doc.currency} onChange={(currency) => update({ currency })} />
      </div>
    </FormSection>

    <LineList
      title='Items'
      addLabel='Add item'
      items={doc.items}
      onChange={(items) => update({ items })}
      create={emptyTradeItem}
      renderLine={(item, patch) => (
        <ItemFields item={item} mode={mode} currency={doc.currency} onChange={patch} />
      )}
    />

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
