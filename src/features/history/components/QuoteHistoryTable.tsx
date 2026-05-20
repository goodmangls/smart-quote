import React from 'react';
import { QuoteSummary } from '@/types';
import { MobileQuoteTable } from './MobileQuoteTable';
import { DesktopQuoteTable } from './DesktopQuoteTable';

interface Props {
  quotes: QuoteSummary[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  onView: (id: number) => void;
  onDelete: (id: number, refNo: string) => void;
}

/**
 * Quote 이력 테이블 — 모바일 카드 뷰 / 데스크톱 테이블 뷰 라우터.
 *
 * 외부 시그니처(named export `QuoteHistoryTable` + `Props`)는 보존.
 * 실제 렌더링은 MobileQuoteTable / DesktopQuoteTable 가 담당하고,
 * 본 컴포넌트는 Tailwind 분기(`sm:hidden` / `hidden sm:block`)와 wrapper div 만 제공.
 *
 * 원본 258 라인 단일 컴포넌트에서 → utils/expiry, QuoteHistoryTableParts(5종),
 * MobileQuoteTable, DesktopQuoteTable 로 분리되었다. 자세한 의도는
 * docs/02-design/features/smart-quote-history-table-refactor.design.md 참조.
 */
export const QuoteHistoryTable: React.FC<Props> = (props) => {
  return (
    <div>
      <div className='sm:hidden'>
        <MobileQuoteTable {...props} />
      </div>
      <div className='hidden sm:block overflow-x-auto'>
        <DesktopQuoteTable {...props} />
      </div>
    </div>
  );
};
