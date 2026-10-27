import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Package, Receipt } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import type { DocumentType } from '@/features/documents/types';

const CARDS: { type: DocumentType; title: string; body: string; icon: React.ElementType }[] = [
  {
    type: 'quotation',
    title: 'Quotation',
    body: 'Itemised price quote with VAT handling, terms and a signature block.',
    icon: FileText,
  },
  {
    type: 'commercial-invoice',
    title: 'Commercial Invoice',
    body: 'Customs invoice: parties, Incoterm, HS codes, unit prices and the declared total.',
    icon: Receipt,
  },
  {
    type: 'packing-list',
    title: 'Packing List',
    body: 'Packages, net and gross weights, dimensions and CBM for the same shipment.',
    icon: Package,
  },
];

const DocumentsPage = () => (
  <div className='min-h-screen bg-gray-50 dark:bg-gray-950'>
    <Header />
    <main className='mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8'>
      <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Documents</h1>
      <p className='mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400'>
        Fill in the form, check the A4 preview, then print or save as PDF. Drafts stay in this
        browser. The commercial invoice and packing list share one shipment, so their details always
        match.
      </p>
      <ul className='mt-8 grid gap-4 sm:grid-cols-3'>
        {CARDS.map(({ type, title, body, icon: Icon }) => (
          <li key={type}>
            <Link
              to={`/documents/${type}`}
              className='group flex h-full flex-col rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-colors hover:border-brand-blue-400 dark:hover:border-brand-blue-500'
            >
              <Icon className='h-6 w-6 text-brand-blue-600 dark:text-brand-blue-300' />
              <span className='mt-4 text-base font-semibold text-gray-900 dark:text-white'>
                {title}
              </span>
              <span className='mt-1 text-sm text-gray-600 dark:text-gray-400'>{body}</span>
              <span className='mt-4 text-xs font-semibold text-brand-blue-600 dark:text-brand-blue-300 group-hover:underline'>
                Open editor →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  </div>
);

export default DocumentsPage;
