---
feature: smart-quote-history-table-refactor
date: 2026-05-20
phase: design
plan_ref: docs/01-plan/features/smart-quote-history-table-refactor.plan.md
scope: 전체 (utils → parts → views → verification)
revision: α
status: draft
---

# Design — smart-quote-history-table-refactor (rev α)

## §0. 본 design 의 범위

Plan §3 채택안 **B(파일 분리 + 공유 subcomponents)** + **B-1(부모 Tailwind 분기)** 의 실제 구현 명세. 외부 인터페이스(`QuoteHistoryTable` named export + `Props`) 와 시각 출력은 **완전 동일** 하게 유지하는 것이 본 design 의 hard 제약.

## §1. Open Questions 답

| # | 질문 | 결정 | 근거 |
|---|------|------|------|
| 1 | `subcomponents/` 디렉토리 vs 단일 파일 | **단일 파일** `QuoteHistoryTableParts.tsx` | 기존 `QuoteDetailSubcomponents.tsx` (1420 bytes, 같은 디렉토리) 와 일관. 컴포넌트가 더 커지면 추후 디렉토리화 — 본 사이클은 일관성 우선. |
| 2 | `ExpiryBadge` mobile/desktop variant | **`variant: 'mobile' \| 'desktop'` prop** | 두 곳 차이는 wrapper 태그(`span` vs `div`) + `mt-0.5` 마진뿐. 한 컴포넌트가 분기 처리 — 두 파일 분리는 과함. JSX 안에서 `variant === 'mobile' ? <span/> : <div/>` 명시 분기로 타입 명료. |
| 3 | 행 단위 `MobileQuoteRow`/`DesktopQuoteRow` 분리 | **분리 안 함** (map() 인라인 유지) | Parts(Status/Expiry/Margin/Actions) 가 이미 메인 로직 추출. 행 단위까지 분리하면 onView/onDelete prop drilling + 파일 수 증가 대비 이득 적음. 후속 변경 시 재고. |
| 4 | Snapshot 테스트 도입 | **도입 안 함** | 프로젝트 전체 snapshot 사용처 1건(`calculationParity.test.ts` — 수치 parity 전용). UI Tailwind 클래스 snapshot 은 클래스 순서/공백 변경에 취약. **게이트 = 기존 `QuoteHistoryTable.test.tsx` 108 라인 무수정 PASS** + 수동 스모크 + 신규 utils 단위 테스트. |

## §2. 파일 구조 (최종)

```
src/features/history/
├── utils/
│   ├── expiry.ts                          (신규)
│   └── __tests__/
│       └── expiry.test.ts                 (신규)
├── components/
│   ├── QuoteHistoryTable.tsx              (대폭 축소: 258 → ~35 라인 thin router)
│   ├── QuoteHistoryTableParts.tsx         (신규) — StatusPill, SurchargeStaleBadge, ExpiryBadge, MarginText, RowActions
│   ├── MobileQuoteTable.tsx               (신규) — sm:hidden 카드 뷰
│   ├── DesktopQuoteTable.tsx              (신규) — hidden sm:block 테이블 뷰
│   ├── QuoteHistoryPage.tsx               (무변경)
│   ├── QuoteSearchBar.tsx                 (무변경)
│   ├── QuotePagination.tsx                (무변경)
│   ├── QuoteDetailModal.tsx               (무변경 — 본 사이클 비범위)
│   ├── QuoteCargoTable.tsx                (무변경)
│   ├── QuoteCostBreakdown.tsx             (무변경)
│   ├── QuoteDetailSubcomponents.tsx       (무변경)
│   └── __tests__/
│       └── QuoteHistoryTable.test.tsx     (무변경 PASS = 게이트)
└── constants.ts                            (무변경)
```

**신규 4 파일 / 수정 1 파일 / 무변경 8 파일.**

## §3. 컴포넌트 스펙

### 3.1 `src/features/history/utils/expiry.ts`

```ts
export interface ExpiryInfo {
  daysLeft: number;
  expired: boolean;
  severity: 'expired' | 'soon' | 'ok';
}

/**
 * 만료일 정보 계산. severity 분기:
 * - expired:  daysLeft <= 0
 * - soon:     1 <= daysLeft <= 3
 * - ok:       daysLeft >= 4
 *
 * 기존 inline 로직(QuoteHistoryTable.tsx:7-12 + 표시 시 3색 분기) 통합.
 */
export function getExpiryInfo(validityDate: string): ExpiryInfo {
  const expiry = new Date(validityDate);
  const now = new Date();
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const expired = daysLeft <= 0;
  const severity: ExpiryInfo['severity'] = expired
    ? 'expired'
    : daysLeft <= 3
      ? 'soon'
      : 'ok';
  return { daysLeft, expired, severity };
}
```

**테스트 케이스** (`expiry.test.ts`):
- 미래 10일 → `{ daysLeft: 10, expired: false, severity: 'ok' }`
- 미래 3일 → severity: 'soon'
- 미래 1일 → severity: 'soon'
- 오늘 (daysLeft = 0) → expired: true, severity: 'expired'
- 과거 1일 → daysLeft 음수, expired: true, severity: 'expired'
- 경계 4일 → 'ok' (3 초과)
- ISO 문자열 / 'YYYY-MM-DD' 형식 둘 다 허용

### 3.2 `src/features/history/components/QuoteHistoryTableParts.tsx`

5개 named export. 공통 import: `lucide-react` 의 Clock/AlertTriangle/Eye/Trash2, `STATUS_COLORS`, `getExpiryInfo`, `QuoteSummary['status']` type.

#### 3.2.1 `StatusPill`

```tsx
import type { QuoteSummary } from '@/types';
import { STATUS_COLORS } from '@/features/history/constants';

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
```

#### 3.2.2 `SurchargeStaleBadge`

```tsx
import { AlertTriangle } from 'lucide-react';

export function SurchargeStaleBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      <AlertTriangle className="w-2.5 h-2.5" />
      재확인
    </span>
  );
}
```

#### 3.2.3 `ExpiryBadge`

```tsx
import { Clock } from 'lucide-react';
import type { QuoteSummary } from '@/types';
import { getExpiryInfo } from '@/features/history/utils/expiry';

export interface ExpiryBadgeProps {
  validityDate?: string;
  status: QuoteSummary['status'];
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
      <Clock className="w-2.5 h-2.5" />
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
```

#### 3.2.4 `MarginText`

```tsx
export interface MarginTextProps {
  profitMargin: number;
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
```

**사용처별 className**:
- 모바일: `<MarginText profitMargin={q.profitMargin} className="text-xs tabular-nums" />` — 모바일은 상위에 text-xs/tabular-nums 가 없으므로 직접 적용 (원본 line 113~115 그대로)
- 데스크톱: `<MarginText profitMargin={q.profitMargin} />` — 부모 `<td className="... text-right tabular-nums">` 가 tabular-nums 제공

#### 3.2.5 `RowActions`

```tsx
import { Eye, Trash2 } from 'lucide-react';

export interface RowActionsProps {
  id: number;
  refNo: string;
  onView: (id: number) => void;
  onDelete: (id: number, refNo: string) => void;
  variant?: 'mobile' | 'desktop';
}

export function RowActions({ id, refNo, onView, onDelete, variant = 'mobile' }: RowActionsProps) {
  const isDesktop = variant === 'desktop';
  // 원본 클래스 보존:
  //  mobile : p-2.5,        w-5 h-5
  //  desktop: p-2.5 sm:p-1.5, w-5 h-5 sm:w-4 sm:h-4
  const btnSize = isDesktop ? 'p-2.5 sm:p-1.5' : 'p-2.5';
  const iconSize = isDesktop ? 'w-5 h-5 sm:w-4 sm:h-4' : 'w-5 h-5';
  const wrapperClass = isDesktop ? 'flex items-center justify-center gap-1' : 'flex items-center gap-1';

  return (
    <div className={wrapperClass}>
      <button
        onClick={() => onView(id)}
        className={`${btnSize} rounded-md text-gray-400 hover:text-brand-blue-600 hover:bg-brand-blue-50 dark:hover:bg-brand-blue-900/20 transition-colors`}
        aria-label="View detail"
      >
        <Eye className={iconSize} />
      </button>
      <button
        onClick={() => onDelete(id, refNo)}
        className={`${btnSize} rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors`}
        aria-label="Delete"
      >
        <Trash2 className={iconSize} />
      </button>
    </div>
  );
}
```

### 3.3 `src/features/history/components/MobileQuoteTable.tsx`

`sm:hidden` 카드 리스트 뷰. 원본 라인 36~137 의 책임을 그대로 옮긴다.

> **DOM 등가성 hard 규칙**: 본 컴포넌트는 **wrapper `<div>` 를 추가하지 않는다**. `sm:hidden` div 는 부모 라우터(§3.5)에 있고, 본 컴포넌트는 그 자식들(skeleton 3개 / empty 1개 / 카드 N개)을 **Fragment 로 반환**해 원본 DOM 구조를 그대로 유지한다.

**Props**: `MobileQuoteTableProps = Props` (즉 `QuoteHistoryTable` 의 `Props` 와 동일).

**구조**:
```tsx
export function MobileQuoteTable({ quotes, isLoading, hasActiveFilters, onView, onDelete }: Props) {
  const emptyMessage = hasActiveFilters
    ? 'No quotes match your filters.'
    : 'No quotes saved yet. Calculate a quote and save it!';

  if (isLoading) {
    return <MobileSkeleton />;  // Fragment 로 3개 skeleton 카드 반환 (원본 38~57)
  }
  if (quotes.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-gray-400 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }
  return (
    <>
      {quotes.map((q) => (
        <div key={q.id} className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors space-y-1.5">
          {/* row 1: refNo + surchargeStale ↔ status pill */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-medium text-gray-900 dark:text-white">{q.referenceNo}</span>
              {q.surchargeStale && <SurchargeStaleBadge />}
            </div>
            <StatusPill status={q.status} />
          </div>
          {/* row 2: date + expiry ↔ destination */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{new Date(q.createdAt).toLocaleDateString('ko-KR')}</span>
              <ExpiryBadge validityDate={q.validityDate} status={q.status} variant="mobile" />
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {q.destinationCountry}
            </span>
          </div>
          {/* row 3: KRW ↔ USD */}
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900 dark:text-white tabular-nums">{formatNum(q.totalQuoteAmount)}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              ${q.totalQuoteAmountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {/* row 4: margin ↔ actions */}
          <div className="flex items-center justify-between">
            <MarginText profitMargin={q.profitMargin} className="text-xs tabular-nums" />
            <RowActions id={q.id} refNo={q.referenceNo} onView={onView} onDelete={onDelete} variant="mobile" />
          </div>
        </div>
      ))}
    </>
  );
}
```

**원본과 차이**:
- `expiry` 변수 추출 inline 분기 제거 — `ExpiryBadge` 가 자체 분기.
- 그 외 모든 element/클래스 문자열 1:1 동일. wrapper `<div>` 추가 없음 (Fragment 반환).

#### `MobileSkeleton` (모듈 내부, export 안 함)

원본 line 38~57 그대로 — 3개 skeleton 카드를 Fragment 로 반환:

```tsx
function MobileSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="px-4 py-4 border-b border-gray-100 dark:border-gray-700/50 space-y-3">
          {/* 원본 41~55 그대로 */}
        </div>
      ))}
    </>
  );
}
```

### 3.4 `src/features/history/components/DesktopQuoteTable.tsx`

`hidden sm:block` 테이블 뷰. 원본 라인 140~255 의 책임 그대로.

> **DOM 등가성 hard 규칙**: 본 컴포넌트는 **`<table>` 자체를 최상위로 반환** 한다. wrapper `<div>` 를 추가하지 않는다. 원본은 `<div className="hidden sm:block overflow-x-auto">` 한 개 안에 `<table>` 이 들어 있었다 — 라우터(§3.5) 가 `hidden sm:block overflow-x-auto` 를 한 div 에 합쳐 들고, 본 컴포넌트는 그 자식으로 `<table>` 만 둔다.

**구조**:
```tsx
export function DesktopQuoteTable({ quotes, isLoading, hasActiveFilters, onView, onDelete }: Props) {
  const emptyMessage = hasActiveFilters
    ? 'No quotes match your filters.'
    : 'No quotes saved yet. Calculate a quote and save it!';

  return (
    <table className="w-full text-sm">
        <thead>{/* 원본 142~153 그대로 */}</thead>
        <tbody>
          {isLoading ? (
            <DesktopSkeletonRows />
          ) : quotes.length === 0 ? (
            <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-400">{emptyMessage}</td></tr>
          ) : (
            quotes.map((q) => (
              <tr key={q.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900 dark:text-white">{q.referenceNo}</td>
                <td className="px-4 py-3 text-xs">
                  <div className="text-gray-500 dark:text-gray-400">
                    {new Date(q.createdAt).toLocaleDateString('ko-KR')}
                  </div>
                  <ExpiryBadge validityDate={q.validityDate} status={q.status} variant="desktop" />
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {q.destinationCountry}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white tabular-nums">{formatNum(q.totalQuoteAmount)}</td>
                <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 tabular-nums text-xs">
                  ${q.totalQuoteAmountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-right tabular-nums"><MarginText profitMargin={q.profitMargin} /></td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <StatusPill status={q.status} />
                    {q.surchargeStale && <SurchargeStaleBadge />}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <RowActions id={q.id} refNo={q.referenceNo} onView={onView} onDelete={onDelete} variant="desktop" />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
  );
}
```

**원본과 차이**:
- `<div className="hidden sm:block overflow-x-auto">` 래퍼 div 는 **부모 라우터(§3.5)** 가 통째로 보유. 본 컴포넌트는 `<table>` 만 반환 → DOM 깊이 동일.
- 데스크톱 만료 IIFE (189~201) → `<ExpiryBadge variant="desktop" />` 한 줄로 대체.
- 그 외 모든 element/클래스 문자열 1:1 동일.

#### `DesktopSkeletonRows` (모듈 내부)

원본 line 155~169 그대로 — 5개 skeleton row.

### 3.5 `src/features/history/components/QuoteHistoryTable.tsx` (축소)

```tsx
import { MobileQuoteTable } from './MobileQuoteTable';
import { DesktopQuoteTable } from './DesktopQuoteTable';
import type { QuoteSummary } from '@/types';

interface Props {
  quotes: QuoteSummary[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  onView: (id: number) => void;
  onDelete: (id: number, refNo: string) => void;
}

export const QuoteHistoryTable: React.FC<Props> = (props) => {
  return (
    <div>
      <div className="sm:hidden">
        <MobileQuoteTable {...props} />
      </div>
      <div className="hidden sm:block overflow-x-auto">
        <DesktopQuoteTable {...props} />
      </div>
    </div>
  );
};
```

**예상 라인**: ~25 라인 (현재 258).
**외부 시그니처**: 변경 없음 — named export `QuoteHistoryTable`, `Props` 동일 5필드, `React.FC<Props>` 타입 유지(기존과 동일).

**DOM 등가성 (원본 대비)**:

```
원본:                                                  본 design (개정 후):
<div>                                                  <div>
  <div className="sm:hidden">{children}</div>     ≡     <div className="sm:hidden"><MobileQuoteTable/></div>
  <div className="hidden sm:block overflow-x-auto">  ≡  <div className="hidden sm:block overflow-x-auto">
    <table>...</table>                                    <DesktopQuoteTable/>  → 반환값이 <table>
  </div>                                               </div>
</div>                                                 </div>
```

`MobileQuoteTable` 가 Fragment, `DesktopQuoteTable` 가 `<table>` 단독 반환이므로 **렌더된 최종 DOM 트리는 원본과 노드별 동일**.

## §4. 구현 순서

4-Phase, 권장 4-커밋 (또는 2-커밋: A+B / C+D). 각 Phase 끝에서 `npx tsc --noEmit` + `npx vitest run` PASS 확인 후 다음 Phase 진입.

> **PR 머지 정책**: PR 은 **squash merge** 가 표준 (recent: #15/#16/#17 모두 squash). per-commit CI 는 정보용이며, Phase A·B 직후 신규 모듈이 임포트되지 않아 "unreferenced" 경고가 날 수 있다 — Phase C 에서 임포트되면 해소. bisect/리뷰 용이성을 우선하면 2-커밋(A+B / C+D) 권장.

> **테스트 게이트 사전 검증 (2026-05-20)**: `__tests__/QuoteHistoryTable.test.tsx` (108 라인) 실제 내용 검증 완료. 단정은 모두 행동 기반 — `getByText`/`getAllByText`/`getAllByLabelText('View detail'\|'Delete')`/`container.querySelectorAll('.animate-pulse')`. DOM 구조·스냅샷 단정 0건. §3.5 의 DOM 등가성 유지 시 게이트 통과 안전.

### Phase A — utils (1 커밋)

- A1. `src/features/history/utils/expiry.ts` 생성 — `ExpiryInfo` 타입 + `getExpiryInfo()`
- A2. `src/features/history/utils/__tests__/expiry.test.ts` 생성 — §3.1 테스트 케이스 7건
- A3. `npx vitest run src/features/history/utils/__tests__/expiry.test.ts` PASS 확인
- A4. `npx tsc --noEmit` PASS

> 이 단계에선 `QuoteHistoryTable.tsx` 미변경. utils 가 누구도 import 하지 않은 상태로 일단 그린.

**커밋 메시지**: `♻️ refactor(history): expiry util 추출 + 단위 테스트`

### Phase B — parts (1 커밋)

- B1. `src/features/history/components/QuoteHistoryTableParts.tsx` 생성 — 5 named export (StatusPill, SurchargeStaleBadge, ExpiryBadge, MarginText, RowActions)
- B2. `npx tsc --noEmit` PASS (parts 가 expiry util 을 import)
- B3. `npx vitest run` 전체 PASS — 본 단계까지 `QuoteHistoryTable.test.tsx` 는 여전히 원본 컴포넌트를 테스트

**커밋 메시지**: `♻️ refactor(history): QuoteHistoryTableParts 추출 (StatusPill/SurchargeStaleBadge/ExpiryBadge/MarginText/RowActions)`

### Phase C — views (1 커밋)

- C1. `src/features/history/components/MobileQuoteTable.tsx` 생성 — §3.3 구조
- C2. `src/features/history/components/DesktopQuoteTable.tsx` 생성 — §3.4 구조
- C3. `QuoteHistoryTable.tsx` 를 §3.5 thin router 로 교체
- C4. `npx tsc --noEmit` PASS
- C5. `npm run lint --max-warnings 0` PASS
- C6. `npx vitest run` 전체 PASS — **이 시점에서 `QuoteHistoryTable.test.tsx` 가 무수정 PASS = 외부 인터페이스 보존 게이트 통과**

**커밋 메시지**: `♻️ refactor(history): QuoteHistoryTable mobile/desktop 뷰 분리 — 외부 인터페이스 보존`

### Phase D — 검증 (별 커밋 불요, A/B/C 통합 검증)

- D1. `npm run build` PASS (frontend tsc + vite build)
- D2. `npx vitest run` 1188+ tests PASS
- D3. 수동 스모크
  - `npm run dev` 후 로컬에서 `/admin` 진입
  - 모바일 viewport (Chrome DevTools, 375x812 iPhone 등) 에서 history 탭 → quote 목록 카드 표시 / 만료 배지 색 / 재확인 배지 / 액션 클릭 (View → 상세 모달 / Delete → 확인 다이얼로그) 정상
  - 데스크톱 viewport (≥768px) 에서 history 탭 → 테이블 표시 / 컬럼 정렬 / 만료 배지 / status 칼럼 stacked / 액션 정상
  - 다크 모드 토글로 동일 확인
- D4. (선택) 화면 캡처로 before/after 비교 — 모바일·데스크톱 각 1장씩

**검증 게이트 (모두 PASS 필수)**:

| 게이트 | 기준 |
|--------|------|
| 외부 인터페이스 보존 | `__tests__/QuoteHistoryTable.test.tsx` **무수정** 으로 PASS |
| 타입 안정성 | `npx tsc --noEmit` exit 0 |
| 린트 | `npm run lint --max-warnings 0` exit 0 |
| 빌드 | `npm run build` exit 0 |
| 테스트 | `npx vitest run` 모두 PASS, 신규 expiry.test.ts 추가 |
| 시각 회귀 | 수동 스모크 모바일+데스크톱+다크모드 양호 |

## §5. 비범위 / 명시 (Plan §5 보강)

- `QuoteHistoryTable.tsx` 가 export 하는 다른 무엇 없음 — 본 사이클은 `QuoteHistoryTable` 만 변경.
- `QuoteDetailSubcomponents.tsx` 와 새 `QuoteHistoryTableParts.tsx` 간 통합 검토 안 함 — 후속.
- 새 Parts 의 다른 features(`/quote`, `/dashboard`) 사용 확장 금지 — `/history/` 내부에 한정 (필요 시 별 사이클로 승격).
- i18n (`t()` 키) 변경 없음 — 'No quotes…', 'Expired', '재확인' 등 하드코딩 문자열은 원본 그대로 유지 (한국어/영어 혼재는 기존 패턴).

## §6. 위험 / 회피 (재정의)

| 위험 | 회피 |
|------|------|
| Tailwind 클래스 순서 미세 변동으로 시각 회귀 | §3 의 클래스 문자열을 **그대로 복사** — 새로 타이핑 금지. Edit tool 로 원본 → 새 파일로 일치 이동 |
| 다크 모드 클래스 누락 | `dark:` prefix 모두 보존, 수동 스모크 D3 에서 다크모드 토글 |
| skeleton 개수 변화 (모바일 3, 데스크톱 5) | §3.3/§3.4 의 `Array.from({ length: 3 })`/`{ length: 5 }` 원본 유지 |
| onView/onDelete 콜백 시그니처 변경 | Props 타입 단일 정의 (QuoteHistoryTable 의 Props 를 MobileQuoteTable/DesktopQuoteTable 에 재사용) |
| 행 단위 `<div key={q.id}>` 가 `<article>`/기타로 바뀌어 CSS selector 영향 | `<div key={q.id}>` 유지, 자식 요소 element 모두 보존 |
| ExpiryBadge desktop variant 의 `mt-0.5` 가 다른 컨텍스트에서 잘못 적용 | 항상 부모가 직접 노출 — 다른 features 에서 사용 금지 |
| 라인 카운트 총합 증가 | 본 사이클의 가치는 책임 분리이므로 §8 예상치 **net +270 라인** 까지 허용. 그 초과 시 design 재검토 (§8 의 +170~+270 추정과 일치) |

## §7. 다음 단계

- 본 design 검토 완료 후 `/pdca do smart-quote-history-table-refactor` — Phase A→B→C→D 순으로 구현
- do 단계 완료 후 `/pdca analyze smart-quote-history-table-refactor` — gap-detector agent 가 design vs 구현 비교

## §8. 영향 분석

### 영향 받는 파일

| 파일 | 변경 | 비고 |
|------|------|------|
| `src/features/history/components/QuoteHistoryTable.tsx` | 수정 (~258 → ~25 라인) | 외부 시그니처 보존 |
| `src/features/history/components/QuoteHistoryTableParts.tsx` | **신규** | 5 named export |
| `src/features/history/components/MobileQuoteTable.tsx` | **신규** | sm:hidden 뷰 |
| `src/features/history/components/DesktopQuoteTable.tsx` | **신규** | hidden sm:block 뷰 |
| `src/features/history/utils/expiry.ts` | **신규** | getExpiryInfo |
| `src/features/history/utils/__tests__/expiry.test.ts` | **신규** | 7 케이스 |

### 영향 받지 않는 것 (검증 대상)

- `QuoteHistoryPage.tsx` — `QuoteHistoryTable` named import 그대로 유효
- `__tests__/QuoteHistoryTable.test.tsx` — 무수정 PASS = 게이트
- 백엔드 — 변경 0
- 다른 features (`/quote`, `/dashboard`, `/admin`) — 새 Parts 사용 안 함, 변경 0
- DESIGN.md / Tailwind 토큰 — 변경 0 (기존 클래스 문자열 그대로 사용)

### 예상 PR 규모

- +400~+500 lines (신규 4 파일)
- -230 lines (QuoteHistoryTable.tsx 축소)
- Net +170~+270 lines (책임 분리 비용 — 허용 한도 +200 안팎)
