import React from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { DOCUMENT_GROUPS, DOCUMENTS, GROUP_INFO } from '@/features/documents/registry';

const DocumentsPage = () => (
  <div className='min-h-screen bg-gray-50 dark:bg-gray-950'>
    <Header />
    <main className='mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8'>
      <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Documents</h1>
      <p className='mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400'>
        Fill in the form, check the A4 preview, then print or save as PDF. Drafts stay in this
        browser — use Export JSON to keep or share one.
      </p>

      {DOCUMENT_GROUPS.map((group) => {
        const docs = DOCUMENTS.filter((d) => d.group === group);
        const headingId = `documents-${group}`;
        return (
          <section key={group} aria-labelledby={headingId} className='mt-10'>
            <h2 id={headingId} className='text-sm font-semibold text-gray-900 dark:text-white'>
              {GROUP_INFO[group].title}
            </h2>
            <p className='mt-0.5 text-xs text-gray-500 dark:text-gray-400'>
              {GROUP_INFO[group].body}
            </p>
            <ul className='mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {docs.map(({ type, title, body, icon: Icon }) => (
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
          </section>
        );
      })}
    </main>
  </div>
);

export default DocumentsPage;
