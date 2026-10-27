import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { emptyQuotationItem } from '../defaults';
import type { Quotation } from '../types';
import { removeAt, replaceAt } from '../useDocumentDraft';
import { FormSection, NumberField, SelectField, TextAreaField, TextField } from './fields';
import { LogoField } from './LogoField';

interface QuotationFormProps {
  doc: Quotation;
  update: (patch: Partial<Quotation>) => void;
}

const VAT_MODES = [
  { value: 'excluded', label: 'VAT added on top' },
  { value: 'included', label: 'VAT included in amounts' },
  { value: 'none', label: 'No VAT' },
] as const;

const CURRENCIES = [
  { value: 'KRW', label: 'KRW' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'JPY', label: 'JPY' },
  { value: 'CNY', label: 'CNY' },
] as const;

export const QuotationForm = ({ doc, update }: QuotationFormProps) => {
  const supplier = (patch: Partial<Quotation['supplier']>) =>
    update({ supplier: { ...doc.supplier, ...patch } });

  return (
    <div className='space-y-5'>
      <FormSection title='Quotation'>
        <div className='grid grid-cols-2 gap-3'>
          <TextField
            label='Quote No.'
            value={doc.quoteNo}
            onChange={(quoteNo) => update({ quoteNo })}
          />
          <TextField label='Date' value={doc.date} onChange={(date) => update({ date })} />
          <TextField
            label='Valid until'
            value={doc.validUntil}
            onChange={(validUntil) => update({ validUntil })}
          />
          <TextField
            label='To (recipient)'
            value={doc.recipient}
            onChange={(recipient) => update({ recipient })}
          />
        </div>
        <TextAreaField
          label='Subject'
          rows={2}
          value={doc.subject}
          onChange={(subject) => update({ subject })}
        />
        <div className='grid grid-cols-3 gap-3'>
          <SelectField
            label='Currency'
            value={CURRENCIES.some((c) => c.value === doc.currency) ? doc.currency : 'KRW'}
            options={CURRENCIES}
            onChange={(currency) => update({ currency })}
          />
          <SelectField
            label='VAT'
            className='col-span-2'
            value={doc.vatMode}
            options={VAT_MODES}
            onChange={(vatMode) => update({ vatMode })}
          />
        </div>
        {doc.vatMode !== 'none' && (
          <NumberField
            label='VAT rate (%)'
            step={0.5}
            value={doc.vatRate}
            onChange={(vatRate) => update({ vatRate })}
          />
        )}
      </FormSection>

      <FormSection
        title='Items'
        action={
          <button
            type='button'
            onClick={() => update({ items: [...doc.items, emptyQuotationItem()] })}
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
              <span className='text-xs font-semibold text-gray-500'>Item {i + 1}</span>
              <button
                type='button'
                aria-label={`Remove item ${i + 1}`}
                onClick={() => update({ items: removeAt(doc.items, i) })}
                className='rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-destructive-600 dark:hover:bg-gray-800'
              >
                <Trash2 className='h-3.5 w-3.5' />
              </button>
            </div>
            <TextField
              label='Item'
              value={item.title}
              onChange={(title) => update({ items: replaceAt(doc.items, i, { title }) })}
            />
            <TextAreaField
              label='Details (one per line)'
              value={item.details}
              onChange={(details) => update({ items: replaceAt(doc.items, i, { details }) })}
            />
            <div className='grid grid-cols-2 gap-3'>
              <NumberField
                label={`Amount (${doc.currency})`}
                value={item.amount}
                onChange={(amount) => update({ items: replaceAt(doc.items, i, { amount }) })}
              />
              <TextField
                label='Note'
                value={item.note}
                onChange={(note) => update({ items: replaceAt(doc.items, i, { note }) })}
              />
            </div>
          </div>
        ))}
      </FormSection>

      <FormSection title='Supplier'>
        <LogoField value={doc.supplier.logo} onChange={(logo) => supplier({ logo })} />
        <TextField
          label='Company'
          value={doc.supplier.company}
          onChange={(company) => supplier({ company })}
        />
        <div className='grid grid-cols-2 gap-3'>
          <TextField
            label='Representative'
            value={doc.supplier.representative}
            onChange={(representative) => supplier({ representative })}
          />
          <TextField
            label='Business reg. no.'
            value={doc.supplier.registrationNo}
            onChange={(registrationNo) => supplier({ registrationNo })}
          />
          <TextField
            label='Phone'
            value={doc.supplier.phone}
            onChange={(phone) => supplier({ phone })}
          />
          <TextField
            label='Email'
            value={doc.supplier.email}
            onChange={(email) => supplier({ email })}
          />
        </div>
        <TextField
          label='Website'
          value={doc.supplier.website}
          onChange={(website) => supplier({ website })}
        />
        <TextField
          label='Address'
          value={doc.supplier.address}
          onChange={(address) => supplier({ address })}
        />
      </FormSection>

      <FormSection title='Footer'>
        <TextAreaField
          label='Terms (one per line)'
          value={doc.terms}
          onChange={(terms) => update({ terms })}
        />
        <TextField
          label='Signature label'
          value={doc.signatureLabel}
          onChange={(signatureLabel) => update({ signatureLabel })}
        />
      </FormSection>
    </div>
  );
};
