import React from 'react';
import { emptyChargeLine } from '../defaults';
import type { ArrivalNotice, ChargeLine, FreightInvoice } from '../types';
import {
  CheckboxField,
  FormSection,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from './fields';
import { CurrencyField, LineList, PartyFields } from './formParts';
import { LogoField } from './LogoField';

interface FormProps<T> {
  doc: T;
  update: (patch: Partial<T>) => void;
}

/** The schema caps percentages at 100; a larger value would fail to reload. */
const clampPercent = (value: number) => Math.min(value, 100);

const ChargeLines = ({
  charges,
  currency,
  onChange,
}: {
  charges: readonly ChargeLine[];
  currency: string;
  onChange: (charges: ChargeLine[]) => void;
}) => (
  <LineList
    title='Charges'
    addLabel='Add charge'
    items={charges}
    onChange={onChange}
    create={() => emptyChargeLine(true)}
    renderLine={(line, patch) => (
      <>
        <TextField
          label='Charge'
          value={line.description}
          onChange={(description) => patch({ description })}
        />
        <div className='grid grid-cols-3 gap-3'>
          <NumberField
            label='Qty'
            step={0.01}
            value={line.quantity}
            onChange={(quantity) => patch({ quantity })}
          />
          <TextField label='Unit' value={line.unit} onChange={(unit) => patch({ unit })} />
          <NumberField
            label={`Rate (${currency})`}
            step={0.01}
            value={line.rate}
            onChange={(rate) => patch({ rate })}
          />
        </div>
        <CheckboxField
          label='Subject to VAT (leave off for zero-rated international freight)'
          checked={line.taxable}
          onChange={(taxable) => patch({ taxable })}
        />
      </>
    )}
  />
);

const VARIANTS = [
  { value: 'invoice', label: 'Freight invoice' },
  { value: 'debit-note', label: 'Debit note' },
] as const;

export const FreightInvoiceForm = ({ doc, update }: FormProps<FreightInvoice>) => (
  <div className='space-y-5'>
    <p className='rounded-md bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs text-gray-600 dark:text-gray-400'>
      A billing statement for freight charges. It is not a Korean tax invoice (세금계산서) — issue
      that separately through your e-invoicing system.
    </p>

    <FormSection title='Document'>
      <SelectField
        label='Title'
        value={doc.variant}
        options={VARIANTS}
        onChange={(variant) => update({ variant })}
      />
      <div className='grid grid-cols-2 gap-3'>
        <TextField
          label='Document No.'
          value={doc.invoiceNo}
          onChange={(invoiceNo) => update({ invoiceNo })}
        />
        <TextField label='Date' value={doc.date} onChange={(date) => update({ date })} />
        <TextField
          label='Due date'
          value={doc.dueDate}
          onChange={(dueDate) => update({ dueDate })}
        />
        <CurrencyField value={doc.currency} onChange={(currency) => update({ currency })} />
      </div>
      <LogoField value={doc.logo} onChange={(logo) => update({ logo })} />
    </FormSection>

    <FormSection title='From'>
      <PartyFields party={doc.issuer} onChange={(issuer) => update({ issuer })} />
      <TextField
        label='Business registration No.'
        value={doc.issuerRegNo}
        onChange={(issuerRegNo) => update({ issuerRegNo })}
      />
    </FormSection>
    <FormSection title='Bill to'>
      <PartyFields party={doc.billTo} onChange={(billTo) => update({ billTo })} />
    </FormSection>

    <FormSection title='Shipment'>
      <div className='grid grid-cols-2 gap-3'>
        <TextField
          label='AWB / B/L No.'
          value={doc.shipmentRef}
          onChange={(shipmentRef) => update({ shipmentRef })}
        />
        <TextField
          label='Carrier'
          value={doc.carrier}
          onChange={(carrier) => update({ carrier })}
        />
        <TextField label='Origin' value={doc.origin} onChange={(origin) => update({ origin })} />
        <TextField
          label='Destination'
          value={doc.destination}
          onChange={(destination) => update({ destination })}
        />
        <TextField
          label='Ship date'
          value={doc.shipDate}
          onChange={(shipDate) => update({ shipDate })}
        />
        <NumberField label='Pieces' value={doc.pieces} onChange={(pieces) => update({ pieces })} />
        <NumberField
          label='Chargeable weight (kg)'
          step={0.1}
          value={doc.chargeableWeightKg}
          onChange={(chargeableWeightKg) => update({ chargeableWeightKg })}
        />
      </div>
    </FormSection>

    <ChargeLines
      charges={doc.charges}
      currency={doc.currency}
      onChange={(charges) => update({ charges })}
    />

    <FormSection title='Totals & payment'>
      <div className='grid grid-cols-2 gap-3'>
        <NumberField
          label='VAT rate (%)'
          step={0.1}
          value={doc.vatRate}
          onChange={(vatRate) => update({ vatRate: clampPercent(vatRate) })}
        />
        <TextField
          label='Exchange rate note'
          placeholder='e.g. USD 1 = KRW 1,380 (date)'
          value={doc.exchangeRateNote}
          onChange={(exchangeRateNote) => update({ exchangeRateNote })}
        />
      </div>
      <TextAreaField
        label='Bank details'
        rows={3}
        value={doc.bankDetails}
        onChange={(bankDetails) => update({ bankDetails })}
      />
      <TextAreaField label='Notes' value={doc.notes} onChange={(notes) => update({ notes })} />
    </FormSection>
  </div>
);

const MODES = [
  { value: 'air', label: 'Air (MAWB / HAWB)' },
  { value: 'sea', label: 'Ocean (Master / House B/L)' },
] as const;

export const ArrivalNoticeForm = ({ doc, update }: FormProps<ArrivalNotice>) => {
  const isAir = doc.mode === 'air';
  return (
    <div className='space-y-5'>
      <FormSection title='Notice'>
        <SelectField
          label='Mode'
          value={doc.mode}
          options={MODES}
          onChange={(mode) => update({ mode })}
        />
        <div className='grid grid-cols-2 gap-3'>
          <TextField
            label='Notice No.'
            value={doc.noticeNo}
            onChange={(noticeNo) => update({ noticeNo })}
          />
          <TextField label='Date' value={doc.date} onChange={(date) => update({ date })} />
          <TextField
            label={isAir ? 'MAWB No.' : 'Master B/L No.'}
            value={doc.masterNo}
            onChange={(masterNo) => update({ masterNo })}
          />
          <TextField
            label={isAir ? 'HAWB No.' : 'House B/L No.'}
            value={doc.houseNo}
            onChange={(houseNo) => update({ houseNo })}
          />
        </div>
        <LogoField value={doc.logo} onChange={(logo) => update({ logo })} />
      </FormSection>

      <FormSection title='From'>
        <PartyFields party={doc.issuer} onChange={(issuer) => update({ issuer })} />
      </FormSection>
      <FormSection title='Notify (consignee)'>
        <PartyFields party={doc.notifyTo} onChange={(notifyTo) => update({ notifyTo })} />
      </FormSection>

      <FormSection title='Arrival'>
        <div className='grid grid-cols-2 gap-3'>
          <TextField
            label={isAir ? 'Airline / flight' : 'Vessel / voyage'}
            value={doc.carrier}
            onChange={(carrier) => update({ carrier })}
          />
          <TextField label='ETA' value={doc.eta} onChange={(eta) => update({ eta })} />
          <TextField
            label={isAir ? 'Airport of departure' : 'Port of loading'}
            value={doc.portOfLoading}
            onChange={(portOfLoading) => update({ portOfLoading })}
          />
          <TextField
            label={isAir ? 'Airport of arrival' : 'Port of discharge'}
            value={doc.portOfDischarge}
            onChange={(portOfDischarge) => update({ portOfDischarge })}
          />
          <TextField
            label='Warehouse'
            value={doc.warehouse}
            onChange={(warehouse) => update({ warehouse })}
          />
          <TextField
            label='Free time until'
            value={doc.freeTimeUntil}
            onChange={(freeTimeUntil) => update({ freeTimeUntil })}
          />
        </div>
      </FormSection>

      <FormSection title='Cargo'>
        <TextField
          label='Description of goods'
          value={doc.description}
          onChange={(description) => update({ description })}
        />
        <div className='grid grid-cols-2 gap-3'>
          <NumberField
            label='Pieces'
            value={doc.pieces}
            onChange={(pieces) => update({ pieces })}
          />
          <NumberField
            label='Gross weight (kg)'
            step={0.1}
            value={doc.grossWeightKg}
            onChange={(grossWeightKg) => update({ grossWeightKg })}
          />
          {isAir ? (
            <NumberField
              label='Chargeable weight (kg)'
              step={0.1}
              value={doc.chargeableWeightKg}
              onChange={(chargeableWeightKg) => update({ chargeableWeightKg })}
            />
          ) : (
            <NumberField
              label='Volume (CBM)'
              step={0.001}
              value={doc.cbm}
              onChange={(cbm) => update({ cbm })}
            />
          )}
        </div>
      </FormSection>

      <ChargeLines
        charges={doc.charges}
        currency={doc.currency}
        onChange={(charges) => update({ charges })}
      />

      <FormSection title='Release'>
        <div className='grid grid-cols-2 gap-3'>
          <CurrencyField value={doc.currency} onChange={(currency) => update({ currency })} />
          <NumberField
            label='VAT rate (%)'
            step={0.1}
            value={doc.vatRate}
            onChange={(vatRate) => update({ vatRate: clampPercent(vatRate) })}
          />
        </div>
        <TextAreaField
          label='Documents required for release'
          value={doc.documentsRequired}
          onChange={(documentsRequired) => update({ documentsRequired })}
        />
        <TextAreaField
          label='Remarks'
          value={doc.remarks}
          onChange={(remarks) => update({ remarks })}
        />
      </FormSection>
    </div>
  );
};
