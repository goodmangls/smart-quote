import React from 'react';
import type { Party } from '../types';
import { MultiLine } from './fields';

/**
 * Building blocks of the boxed A4 sheets (invoice, packing list, orders,
 * forwarder documents). The quotation keeps its own lighter layout.
 */

export const Label = ({ children }: { children: React.ReactNode }) => (
  <p className='text-[8.5px] font-semibold uppercase tracking-[0.1em] text-gray-500'>{children}</p>
);

interface BoxProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

/** A ruled cell. Place inside a `boxGrid` so neighbouring borders collapse to one line. */
export const Box = ({ label, children, className = '' }: BoxProps) => (
  <div className={`border border-gray-900 p-2 ${className}`}>
    <Label>{label}</Label>
    <div className='mt-0.5 min-h-[14px]'>{children}</div>
  </div>
);

export const PartyBlock = ({ party }: { party: Party }) => (
  <>
    <p className='font-semibold'>{party.name || '—'}</p>
    <MultiLine text={party.address} className='text-gray-700' />
    {party.contact && <p className='text-gray-700'>{party.contact}</p>}
  </>
);

export const Value = ({ children }: { children: React.ReactNode }) => (
  <p className='font-medium'>{children || '—'}</p>
);

export const th =
  'border border-gray-900 bg-gray-100 px-1.5 py-1 text-[8.5px] font-semibold uppercase tracking-[0.06em]';
export const td = 'border border-gray-900 px-1.5 py-1 align-top';
export const num = `${td} text-right tabular-nums`;

interface SheetHeadingProps {
  logo: string;
  logoAlt: string;
  title: string;
  /** A second line under the title, e.g. the Korean name of the document. */
  subtitle?: string;
}

export const SheetHeading = ({ logo, logoAlt, title, subtitle }: SheetHeadingProps) => (
  <header className='mb-3 flex items-center justify-between gap-6'>
    {logo ? (
      <img src={logo} alt={logoAlt || 'Company logo'} className='h-9 w-auto object-contain' />
    ) : (
      <span />
    )}
    <div className='text-right'>
      <h1 className='text-[20px] font-bold tracking-[0.2em]'>{title}</h1>
      {subtitle && <p className='text-[9px] text-gray-500'>{subtitle}</p>}
    </div>
  </header>
);

interface SignatureProps {
  name: string;
  caption: string;
  className?: string;
}

export const Signature = ({ name, caption, className = '' }: SignatureProps) => (
  <div className={`w-[60mm] shrink-0 text-center ${className}`}>
    <div className='h-12 border-b border-gray-900' />
    <p className='mt-1 font-semibold'>{name || ' '}</p>
    <p className='text-[8.5px] uppercase tracking-[0.1em] text-gray-500'>{caption}</p>
  </div>
);

/** A labelled free-text block, printed only when it has content. */
export const Note = ({ label, text }: { label: string; text: string }) =>
  text.trim() ? (
    <section className='document-row mt-4'>
      <Label>{label}</Label>
      <MultiLine text={text} className='text-gray-700' />
    </section>
  ) : null;

export interface TotalRow {
  label: string;
  value: string;
  strong?: boolean;
}

/** Right-aligned summary under a priced table. */
export const Totals = ({ rows }: { rows: readonly TotalRow[] }) => (
  <section className='document-row ml-auto mt-3 w-[80mm]'>
    {rows.map((row) => (
      <div
        key={row.label}
        className={`flex items-baseline justify-between py-0.5 ${
          row.strong ? 'mt-1 border-t-2 border-gray-900 pt-1.5 text-[13px] font-bold' : ''
        }`}
      >
        <span className={row.strong ? '' : 'text-gray-600'}>{row.label}</span>
        <span className='tabular-nums'>{row.value}</span>
      </div>
    ))}
  </section>
);
