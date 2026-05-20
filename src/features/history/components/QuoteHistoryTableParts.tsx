import React from 'react';
import { AlertTriangle, Clock, Eye, Trash2 } from 'lucide-react';
import type { QuoteSummary } from '@/types';
import { STATUS_COLORS } from '@/features/history/constants';
import { getExpiryInfo } from '@/features/history/utils/expiry';

/**
 * QuoteHistoryTable 의 모바일/데스크톱 뷰에서 공유하는 작은 presentational 컴포넌트들.
 * 외부 features 에서 사용 금지 — history scope 내부 전용.
 *
 * 모두 원본 QuoteHistoryTable.tsx 의 className·element 1:1 보존.
 */

// ─────────────────────────────────────────────────
// StatusPill — 견적 상태 배지 (rounded-full)
// ─────────────────────────────────────────────────

export interface StatusPillProps {
  status: QuoteSummary['status'];
}

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[status]}`}
    >
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────
// SurchargeStaleBadge — 운임 재확인 배지 (amber)
// ─────────────────────────────────────────────────

export function SurchargeStaleBadge() {
  return (
    <span className='inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'>
      <AlertTriangle className='w-2.5 h-2.5' />
      재확인
    </span>
  );
}

// ─────────────────────────────────────────────────
// ExpiryBadge — 만료일 배지 (3색 분기)
// ─────────────────────────────────────────────────

export interface ExpiryBadgeProps {
  /** `QuoteSummary.validityDate` 가 `string | null` 이므로 두 형태 모두 허용 */
  validityDate?: string | null;
  status: QuoteSummary['status'];
  /**
   * variant 별 wrapper 차이:
   * - mobile : `<span>` (인라인, 마진 없음)
   * - desktop: `<div className="mt-0.5">` (날짜 아래 줄)
   */
  variant?: 'mobile' | 'desktop';
}

export function ExpiryBadge({ validityDate, status, variant = 'mobile' }: ExpiryBadgeProps) {
  if (!validityDate || (status !== 'draft' && status !== 'sent')) return null;
  const { daysLeft, expired, severity } = getExpiryInfo(validityDate);
  const colorClass =
    severity === 'expired'
      ? 'text-red-500 dark:text-red-400'
      : severity === 'soon'
        ? 'text-amber-500 dark:text-amber-400'
        : 'text-green-500 dark:text-green-400';
  const content = (
    <>
      <Clock className='w-2.5 h-2.5' />
      {expired ? 'Expired' : `${daysLeft}d left`}
    </>
  );
  if (variant === 'mobile') {
    return (
      <span className={`flex items-center gap-0.5 text-[10px] font-medium ${colorClass}`}>
        {content}
      </span>
    );
  }
  return (
    <div className={`flex items-center gap-0.5 mt-0.5 text-[10px] font-medium ${colorClass}`}>
      {content}
    </div>
  );
}

// ─────────────────────────────────────────────────
// MarginText — 마진율 텍스트 (≥10 green / else amber)
// ─────────────────────────────────────────────────

export interface MarginTextProps {
  profitMargin: number;
  /** 모바일 사용 시 'text-xs tabular-nums' 추가, 데스크톱은 부모 <td>가 제공 → undefined */
  className?: string;
}

export function MarginText({ profitMargin, className }: MarginTextProps) {
  const color =
    profitMargin >= 10
      ? 'text-green-600 dark:text-green-400'
      : 'text-amber-600 dark:text-amber-400';
  const cls = className ? `${color} ${className}` : color;
  return <span className={cls}>{profitMargin.toFixed(1)}%</span>;
}

// ─────────────────────────────────────────────────
// RowActions — View / Delete 액션 버튼 한 쌍
// ─────────────────────────────────────────────────

export interface RowActionsProps {
  id: number;
  refNo: string;
  onView: (id: number) => void;
  onDelete: (id: number, refNo: string) => void;
  /**
   * variant 별 sizing:
   * - mobile : p-2.5, w-5 h-5 (큰 터치 영역)
   * - desktop: p-2.5 sm:p-1.5, w-5 h-5 sm:w-4 sm:h-4
   *
   * wrapper:
   * - mobile : flex items-center gap-1 (justify 없음)
   * - desktop: flex items-center justify-center gap-1
   */
  variant?: 'mobile' | 'desktop';
}

export function RowActions({ id, refNo, onView, onDelete, variant = 'mobile' }: RowActionsProps) {
  const isDesktop = variant === 'desktop';
  const btnSize = isDesktop ? 'p-2.5 sm:p-1.5' : 'p-2.5';
  const iconSize = isDesktop ? 'w-5 h-5 sm:w-4 sm:h-4' : 'w-5 h-5';
  const wrapperClass = isDesktop
    ? 'flex items-center justify-center gap-1'
    : 'flex items-center gap-1';

  return (
    <div className={wrapperClass}>
      <button
        onClick={() => onView(id)}
        className={`${btnSize} rounded-md text-gray-400 hover:text-brand-blue-600 hover:bg-brand-blue-50 dark:hover:bg-brand-blue-900/20 transition-colors`}
        aria-label='View detail'
      >
        <Eye className={iconSize} />
      </button>
      <button
        onClick={() => onDelete(id, refNo)}
        className={`${btnSize} rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors`}
        aria-label='Delete'
      >
        <Trash2 className={iconSize} />
      </button>
    </div>
  );
}
