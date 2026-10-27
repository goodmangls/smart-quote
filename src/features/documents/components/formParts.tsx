import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Incoterm } from '@/types';
import type { Party } from '../types';
import { removeAt, replaceAt } from '../useDocumentDraft';
import { FormSection, SelectField, TextAreaField, TextField } from './fields';

/** Form pieces shared by the document editors. */

export const INCOTERMS = Object.values(Incoterm).map((value) => ({ value, label: value }));

const CURRENCY_CODES = ['USD', 'EUR', 'KRW', 'JPY', 'CNY'] as const;

interface CurrencyFieldProps {
  value: string;
  onChange: (currency: string) => void;
  label?: string;
}

/** An unknown stored code shows as the first option rather than a blank select. */
export const CurrencyField = ({ value, onChange, label = 'Currency' }: CurrencyFieldProps) => (
  <SelectField
    label={label}
    value={(CURRENCY_CODES as readonly string[]).includes(value) ? value : CURRENCY_CODES[0]}
    options={CURRENCY_CODES.map((code) => ({ value: code as string, label: code }))}
    onChange={onChange}
  />
);

interface PartyFieldsProps {
  party: Party;
  onChange: (party: Party) => void;
}

export const PartyFields = ({ party, onChange }: PartyFieldsProps) => (
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

interface LineListProps<T> {
  title: string;
  items: readonly T[];
  onChange: (items: T[]) => void;
  create: () => T;
  /** Renders the fields of one line; `patch` merges into that line only. */
  renderLine: (item: T, patch: (change: Partial<T>) => void) => React.ReactNode;
  addLabel?: string;
}

/** A form section of repeatable lines with add and remove buttons. */
export const LineList = <T,>({
  title,
  items,
  onChange,
  create,
  renderLine,
  addLabel = 'Add line',
}: LineListProps<T>) => (
  <FormSection
    title={title}
    action={
      <button
        type='button'
        onClick={() => onChange([...items, create()])}
        className='inline-flex items-center gap-1 text-xs font-medium text-brand-blue-600 dark:text-brand-blue-300 hover:underline'
      >
        <Plus className='h-3.5 w-3.5' />
        {addLabel}
      </button>
    }
  >
    {items.map((item, i) => (
      <div key={i} className='space-y-2 rounded-md border border-gray-200 dark:border-gray-800 p-3'>
        <div className='flex items-center justify-between'>
          <span className='text-xs font-semibold text-gray-500'>Line {i + 1}</span>
          <button
            type='button'
            aria-label={`Remove line ${i + 1}`}
            onClick={() => onChange(removeAt(items, i))}
            className='rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-destructive-600 dark:hover:bg-gray-800'
          >
            <Trash2 className='h-3.5 w-3.5' />
          </button>
        </div>
        {renderLine(item, (change) => onChange(replaceAt(items, i, change)))}
      </div>
    ))}
  </FormSection>
);
