import React from 'react';
import { formatMoney, quotationTotals } from '../calc';
import type { Quotation } from '../types';
import { MultiLine } from './fields';
import { SheetFrame } from './DocumentEditorLayout';

const Meta = ({ label, value }: { label: string; value: string }) => (
  <div className='flex justify-between gap-6 border-b border-gray-200 py-1'>
    <span className='text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-500'>
      {label}
    </span>
    <span className='text-right font-medium'>{value || '—'}</span>
  </div>
);

export const QuotationSheet = ({ doc }: { doc: Quotation }) => {
  const totals = quotationTotals(doc.items, doc.vatMode, doc.vatRate);
  const money = (v: number) => `${doc.currency} ${formatMoney(v, doc.currency)}`;
  const s = doc.supplier;

  return (
    <SheetFrame label='Quotation preview'>
      <header className='flex items-start justify-between gap-8 border-b-2 border-gray-900 pb-5'>
        <div className='min-w-0'>
          {s.logo ? (
            <img
              src={s.logo}
              alt={s.company || 'Company logo'}
              className='mb-2 h-10 w-auto object-contain'
            />
          ) : (
            <p className='mb-2 text-base font-bold tracking-tight'>{s.company || 'Your Company'}</p>
          )}
          <h1 className='text-[26px] font-bold leading-none tracking-[0.18em]'>QUOTATION</h1>
        </div>
        <div className='w-[62mm] shrink-0'>
          <Meta label='Quote No.' value={doc.quoteNo} />
          <Meta label='Date' value={doc.date} />
          <Meta label='Valid until' value={doc.validUntil} />
        </div>
      </header>

      <section className='grid grid-cols-2 gap-8 py-5'>
        <div>
          <p className='text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-500'>To</p>
          <p className='mt-1 text-[14px] font-semibold'>{doc.recipient || '—'}</p>
        </div>
        <div>
          <p className='text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-500'>
            Subject
          </p>
          <p className='mt-1 text-[14px] font-semibold whitespace-pre-line'>{doc.subject || '—'}</p>
        </div>
      </section>

      <table className='w-full border-collapse'>
        <thead>
          <tr className='border-y border-gray-900 text-left text-[9px] uppercase tracking-[0.12em] text-gray-600'>
            <th className='w-8 py-2 font-semibold'>No.</th>
            <th className='py-2 font-semibold'>Item / Description</th>
            <th className='w-[34mm] py-2 text-right font-semibold'>Amount</th>
            <th className='w-[30mm] py-2 pl-4 font-semibold'>Note</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((item, i) => (
            <tr key={i} className='document-row border-b border-gray-200 align-top'>
              <td className='py-3 text-gray-500'>{i + 1}</td>
              <td className='py-3 pr-4'>
                <p className='font-semibold'>{item.title || '—'}</p>
                <div className='mt-1 text-gray-600'>
                  <MultiLine text={item.details} className="before:mr-1.5 before:content-['·']" />
                </div>
              </td>
              <td className='py-3 text-right font-medium tabular-nums'>
                {formatMoney(item.amount, doc.currency)}
              </td>
              <td className='py-3 pl-4 text-gray-600'>{item.note}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className='document-row ml-auto mt-4 w-[78mm]'>
        {doc.vatMode !== 'none' && doc.vatRate > 0 && (
          <>
            <div className='flex justify-between py-1'>
              <span className='text-gray-600'>Subtotal</span>
              <span className='tabular-nums'>{money(totals.subtotal)}</span>
            </div>
            <div className='flex justify-between py-1'>
              <span className='text-gray-600'>VAT {doc.vatRate}%</span>
              <span className='tabular-nums'>{money(totals.vat)}</span>
            </div>
          </>
        )}
        <div className='mt-1 flex items-baseline justify-between border-t-2 border-gray-900 pt-2'>
          <span className='text-[9px] font-semibold uppercase tracking-[0.12em]'>Total</span>
          <span className='text-[16px] font-bold tabular-nums'>{money(totals.total)}</span>
        </div>
        <p className='mt-1 text-right text-[9px] text-gray-500'>
          {doc.vatMode === 'excluded' && 'VAT excluded from item amounts'}
          {doc.vatMode === 'included' && 'VAT included in item amounts'}
          {doc.vatMode === 'none' && 'No VAT applied'}
        </p>
      </section>

      {doc.terms.trim() && (
        <section className='document-row mt-8'>
          <p className='text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-500'>
            Terms & Conditions
          </p>
          <div className='mt-1 text-gray-700'>
            <MultiLine text={doc.terms} className="before:mr-1.5 before:content-['·']" />
          </div>
        </section>
      )}

      <footer className='document-row mt-10 flex items-end justify-between gap-8 border-t border-gray-300 pt-4'>
        <div className='text-[10px] text-gray-600'>
          <p className='text-[11px] font-bold text-gray-900'>{s.company}</p>
          {(s.representative || s.registrationNo) && (
            <p>
              {s.representative && `CEO ${s.representative}`}
              {s.representative && s.registrationNo && ' · '}
              {s.registrationNo && `Reg. No. ${s.registrationNo}`}
            </p>
          )}
          {s.address && <p>{s.address}</p>}
          {(s.phone || s.email) && <p>{[s.phone, s.email].filter(Boolean).join(' · ')}</p>}
          {s.website && <p>{s.website}</p>}
        </div>
        <div className='w-[56mm] shrink-0 text-center'>
          <div className='h-12 border-b border-gray-900' />
          <p className='mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-600'>
            {doc.signatureLabel}
          </p>
        </div>
      </footer>
    </SheetFrame>
  );
};
