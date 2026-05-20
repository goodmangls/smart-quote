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
 * 데스크톱 테이블 뷰. 부모 라우터(`QuoteHistoryTable`)가
 * `<div className="hidden sm:block overflow-x-auto">` 래퍼를 보유하므로,
 * 본 컴포넌트는 wrapper div 없이 `<table>` 을 최상위로 반환한다.
 * (DOM 등가성 hard 규칙 — design §3.4)
 */

function DesktopSkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className='border-b border-gray-100 dark:border-gray-700/50'>
          <td className='px-4 py-3'>
            <div className='h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse' />
          </td>
          <td className='px-4 py-3'>
            <div className='h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse' />
          </td>
          <td className='px-4 py-3'>
            <div className='h-5 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse' />
          </td>
          <td className='px-4 py-3'>
            <div className='h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto' />
          </td>
          <td className='px-4 py-3'>
            <div className='h-3 w-14 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto' />
          </td>
          <td className='px-4 py-3'>
            <div className='h-3 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto' />
          </td>
          <td className='px-4 py-3'>
            <div className='h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mx-auto' />
          </td>
          <td className='px-4 py-3'>
            <div className='h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto' />
          </td>
        </tr>
      ))}
    </>
  );
}

export const DesktopQuoteTable: React.FC<Props> = ({
  quotes,
  isLoading,
  hasActiveFilters,
  onView,
  onDelete,
}) => {
  const emptyMessage = hasActiveFilters
    ? 'No quotes match your filters.'
    : 'No quotes saved yet. Calculate a quote and save it!';

  return (
    <table className='w-full text-sm'>
      <thead>
        <tr className='border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'>
          <th className='text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400'>
            Ref No
          </th>
          <th className='text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400'>Date</th>
          <th className='text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400'>Dest</th>
          <th className='text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400'>
            Amount (KRW)
          </th>
          <th className='text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400'>USD</th>
          <th className='text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400'>
            Margin
          </th>
          <th className='text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400'>
            Status
          </th>
          <th className='text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400'>
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          <DesktopSkeletonRows />
        ) : quotes.length === 0 ? (
          <tr>
            <td colSpan={8} className='px-4 py-12 text-center text-gray-400 dark:text-gray-400'>
              {emptyMessage}
            </td>
          </tr>
        ) : (
          quotes.map((q) => (
            <tr
              key={q.id}
              className='border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors'
            >
              <td className='px-4 py-3 font-mono text-xs font-medium text-gray-900 dark:text-white'>
                {q.referenceNo}
              </td>
              <td className='px-4 py-3 text-xs'>
                <div className='text-gray-500 dark:text-gray-400'>
                  {new Date(q.createdAt).toLocaleDateString('ko-KR')}
                </div>
                <ExpiryBadge validityDate={q.validityDate} status={q.status} variant='desktop' />
              </td>
              <td className='px-4 py-3'>
                <span className='inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'>
                  {q.destinationCountry}
                </span>
              </td>
              <td className='px-4 py-3 text-right font-medium text-gray-900 dark:text-white tabular-nums'>
                {formatNum(q.totalQuoteAmount)}
              </td>
              <td className='px-4 py-3 text-right text-gray-500 dark:text-gray-400 tabular-nums text-xs'>
                ${q.totalQuoteAmountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className='px-4 py-3 text-right tabular-nums'>
                <MarginText profitMargin={q.profitMargin} />
              </td>
              <td className='px-4 py-3 text-center'>
                <div className='flex flex-col items-center gap-0.5'>
                  <StatusPill status={q.status} />
                  {q.surchargeStale && <SurchargeStaleBadge />}
                </div>
              </td>
              <td className='px-4 py-3'>
                <RowActions
                  id={q.id}
                  refNo={q.referenceNo}
                  onView={onView}
                  onDelete={onDelete}
                  variant='desktop'
                />
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
};
