import React from 'react';
import { QuoteSummary } from '@/types';
import { formatNum } from '@/lib/format';
import {
  ExpiryBadge,
  MarginText,
  RowActions,
  StatusPill,
  SurchargeStaleBadge,
} from './QuoteHistoryTableParts';

interface Props {
  quotes: QuoteSummary[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  onView: (id: number) => void;
  onDelete: (id: number, refNo: string) => void;
}

/**
 * 모바일 카드 리스트 뷰. 부모 라우터(`QuoteHistoryTable`)가 `<div className="sm:hidden">`
 * 래퍼를 보유하므로, 본 컴포넌트는 wrapper div 없이 카드들을 Fragment 로 반환한다.
 * (DOM 등가성 hard 규칙 — design §3.3)
 */

function MobileSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className='px-4 py-4 border-b border-gray-100 dark:border-gray-700/50 space-y-3'
        >
          <div className='flex items-center justify-between'>
            <div className='h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse' />
            <div className='h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse' />
          </div>
          <div className='flex items-center justify-between'>
            <div className='h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse' />
            <div className='h-5 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse' />
          </div>
          <div className='flex items-center justify-between'>
            <div className='h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse' />
            <div className='h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse' />
          </div>
          <div className='flex items-center justify-between'>
            <div className='h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse' />
            <div className='h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse' />
          </div>
        </div>
      ))}
    </>
  );
}

export const MobileQuoteTable: React.FC<Props> = ({
  quotes,
  isLoading,
  hasActiveFilters,
  onView,
  onDelete,
}) => {
  const emptyMessage = hasActiveFilters
    ? 'No quotes match your filters.'
    : 'No quotes saved yet. Calculate a quote and save it!';

  if (isLoading) {
    return <MobileSkeleton />;
  }
  if (quotes.length === 0) {
    return (
      <div className='px-4 py-12 text-center text-gray-400 dark:text-gray-400'>{emptyMessage}</div>
    );
  }
  return (
    <>
      {quotes.map((q) => (
        <div
          key={q.id}
          className='px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors space-y-1.5'
        >
          {/* row 1: refNo + surchargeStale ↔ status pill */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-1.5'>
              <span className='font-mono text-xs font-medium text-gray-900 dark:text-white'>
                {q.referenceNo}
              </span>
              {q.surchargeStale && <SurchargeStaleBadge />}
            </div>
            <StatusPill status={q.status} />
          </div>
          {/* row 2: date + expiry ↔ destination */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400'>
              <span>{new Date(q.createdAt).toLocaleDateString('ko-KR')}</span>
              <ExpiryBadge validityDate={q.validityDate} status={q.status} variant='mobile' />
            </div>
            <span className='inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'>
              {q.destinationCountry}
            </span>
          </div>
          {/* row 3: KRW ↔ USD */}
          <div className='flex items-center justify-between'>
            <span className='font-medium text-gray-900 dark:text-white tabular-nums'>
              {formatNum(q.totalQuoteAmount)}
            </span>
            <span className='text-xs text-gray-500 dark:text-gray-400 tabular-nums'>
              ${q.totalQuoteAmountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {/* row 4: margin ↔ actions */}
          <div className='flex items-center justify-between'>
            <MarginText profitMargin={q.profitMargin} className='text-xs tabular-nums' />
            <RowActions
              id={q.id}
              refNo={q.referenceNo}
              onView={onView}
              onDelete={onDelete}
              variant='mobile'
            />
          </div>
        </div>
      ))}
    </>
  );
};
