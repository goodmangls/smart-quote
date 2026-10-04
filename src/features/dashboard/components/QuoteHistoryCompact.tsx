import React, { useState, useEffect } from 'react';
import * as Sentry from '@sentry/browser';
import { FileText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { listQuotes } from '@/api/quoteApi';
import type { QuoteSummary } from '@/types';
import { formatKRW } from '@/lib/format';
import { STATUS_COLORS } from '@/features/history/constants';

// Status colours come from the history table's map so a quote reads the same
// on both screens. Rows are not links — there is no per-quote route to open —
// so they carry no chevron promising one.

export const QuoteHistoryCompact: React.FC = () => {
  const { t } = useLanguage();
  // Same labels as the history page. An unknown status from the API would make
  // t() echo its key, so fall back to the raw value as before.
  const statusLabel = (status: string) => {
    const key = `quote.status.${status}`;
    const label = t(key as Parameters<typeof t>[0]);
    return label === key ? status : label;
  };
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await listQuotes({ page: 1, perPage: 5 });
        setQuotes(result.quotes.slice(0, 5));
      } catch (e) {
        // Silently fail — quote history is not critical for UI
        Sentry.captureException(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className='animate-pulse motion-reduce:animate-none space-y-3 p-4'>
        {[1, 2, 3].map((i) => (
          <div key={i} className='h-10 rounded-lg bg-gray-100 dark:bg-gray-700/60' />
        ))}
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-10 px-4 text-center'>
        <span className='inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-700/60 dark:text-gray-500 mb-3'>
          <FileText aria-hidden='true' className='w-5 h-5' />
        </span>
        <p className='text-sm text-gray-500 dark:text-gray-400'>{t('dashboard.noQuotes')}</p>
      </div>
    );
  }

  return (
    <ul className='divide-y divide-gray-100 dark:divide-gray-700'>
      {quotes.map((quote) => (
        <li key={quote.id} className='flex items-center justify-between gap-3 px-5 py-3'>
          {/* Narrow screens stack ref over destination + status so neither is
              truncated away and the pill never touches the amount. */}
          <div className='flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0'>
            <span className='text-xs font-mono font-semibold text-gray-900 dark:text-gray-100 shrink-0'>
              {quote.referenceNo}
            </span>
            <div className='flex items-center gap-2 sm:gap-3 min-w-0'>
              <span className='text-sm text-gray-500 dark:text-gray-400 truncate'>
                → {quote.destinationCountry}
              </span>
              <span
                className={`inline-flex shrink-0 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[quote.status] ?? STATUS_COLORS.draft}`}
              >
                {statusLabel(quote.status)}
              </span>
            </div>
          </div>
          <span className='shrink-0 text-sm font-semibold text-gray-900 dark:text-white tabular-nums'>
            {formatKRW(quote.totalQuoteAmount)}
          </span>
        </li>
      ))}
    </ul>
  );
};
