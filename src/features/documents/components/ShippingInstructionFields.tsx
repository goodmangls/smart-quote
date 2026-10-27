import React from 'react';
import { PAYER_OPTIONS, type ShippingInstruction } from '../types';
import {
  CheckboxField,
  FormSection,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from './fields';
import { PartyFields } from './formParts';

const PAYERS = PAYER_OPTIONS.map((value) => ({
  value,
  label: value === 'third-party' ? 'Third party' : value[0].toUpperCase() + value.slice(1),
}));

interface ShippingInstructionFieldsProps {
  value: ShippingInstruction;
  currency: string;
  onChange: (value: ShippingInstruction) => void;
}

/** The booking details only the shipping instruction carries; the rest is the shared shipment. */
export const ShippingInstructionFields = ({
  value,
  currency,
  onChange,
}: ShippingInstructionFieldsProps) => {
  const set = (patch: Partial<ShippingInstruction>) => onChange({ ...value, ...patch });
  return (
    <div className='space-y-5'>
      <FormSection title='Forwarder / carrier'>
        <PartyFields party={value.forwarder} onChange={(forwarder) => set({ forwarder })} />
        <div className='grid grid-cols-2 gap-3'>
          <TextField
            label='Service'
            value={value.service}
            onChange={(service) => set({ service })}
          />
          <TextField
            label='Account No.'
            value={value.accountNo}
            onChange={(accountNo) => set({ accountNo })}
          />
        </div>
      </FormSection>

      <FormSection title='Pickup'>
        <TextAreaField
          label='Pickup address'
          rows={2}
          value={value.pickupAddress}
          onChange={(pickupAddress) => set({ pickupAddress })}
        />
        <div className='grid grid-cols-2 gap-3'>
          <TextField
            label='Pickup date'
            value={value.pickupDate}
            onChange={(pickupDate) => set({ pickupDate })}
          />
          <TextField
            label='Pickup contact'
            value={value.pickupContact}
            onChange={(pickupContact) => set({ pickupContact })}
          />
        </div>
      </FormSection>

      <FormSection title='Charges & insurance'>
        <div className='grid grid-cols-2 gap-3'>
          <SelectField
            label='Freight paid by'
            value={value.freightPaidBy}
            options={PAYERS}
            onChange={(freightPaidBy) => set({ freightPaidBy })}
          />
          <SelectField
            label='Duties & taxes paid by'
            value={value.dutiesPaidBy}
            options={PAYERS}
            onChange={(dutiesPaidBy) => set({ dutiesPaidBy })}
          />
        </div>
        <CheckboxField
          label='Cargo insurance required'
          checked={value.insurance}
          onChange={(insurance) => set({ insurance })}
        />
        {value.insurance && (
          <NumberField
            label={`Insured value (${currency})`}
            step={0.01}
            value={value.insuredValue}
            onChange={(insuredValue) => set({ insuredValue })}
          />
        )}
      </FormSection>

      <FormSection title='Instructions'>
        <TextAreaField
          label='Documents enclosed'
          rows={2}
          placeholder='e.g. Commercial invoice, packing list, export licence'
          value={value.documentsEnclosed}
          onChange={(documentsEnclosed) => set({ documentsEnclosed })}
        />
        <TextAreaField
          label='Special instructions'
          value={value.specialInstructions}
          onChange={(specialInstructions) => set({ specialInstructions })}
        />
      </FormSection>
    </div>
  );
};
