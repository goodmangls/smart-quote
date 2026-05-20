---
feature: smart-quote-history-table-refactor
date: 2026-05-20
phase: plan
parent_cycle: smart-quote-code-analysis-2026-05-15 (Health 7.8/10 P1 후보 #3)
revision: α
status: draft
---

# Plan — smart-quote-history-table-refactor (rev α)

## §0. 컨텍스트

- bkit:code-analyzer 종합 분석 (2026-05-15, Health 7.8/10) 의 **P1 후보 #3** `history-table-refactor`.
- 같은 분석의 P0 두 건은 모두 머지 완료:
  - `bundle-optimization-auth` → PR #15 `08cf7ff` (2026-05-15)
  - `input-validation-debt` → PR #16 `d9cfad8` + 회귀 hotfix #17 `c0f9357` (2026-05-15)
- 본 사이클 목표: **`QuoteHistoryTable.tsx` 의 모바일/데스크톱 뷰 단일 컴포넌트(3단 중첩 조건부 렌더링)를 의도가 드러나는 단위로 분리** — 행동 변화 0, 시각 회귀 0.

## §1. 목표 (success criteria)

- ✅ `src/features/history/components/QuoteHistoryTable.tsx` (현재 258 라인) 분리 — Mobile/Desktop 뷰가 명확히 구분되고 각 파일이 단일 책임만 갖는다
- ✅ 행 단위 렌더링에 반복되는 패턴(만료 표시·status pill·surchargeStale 배지·margin 색·액션 버튼)이 **재사용 가능한 작은 단위**로 추출된다
- ✅ `getExpiryFromDate` 헬퍼는 컴포넌트 모듈 밖 `utils/`로 이동 + 단위 테스트 신규
- ✅ 기존 테스트 `QuoteHistoryTable.test.tsx` (108 라인) **변경 없이 PASS**
- ✅ Vitest 1188 / lint / `tsc --noEmit` / `npm run build` 회귀 0
- ✅ 시각 회귀 0 — 모바일/데스크톱 양쪽 DOM·클래스·접근성 속성(`aria-label` 등) 동일 유지 (수동 스모크 + 가능하면 스냅샷)
- ✅ 외부 import 경로 유지 — `QuoteHistoryPage.tsx` 가 `QuoteHistoryTable` 을 그대로 쓰도록 named export 시그니처 보존

## §2. 현재 상태 (분석 결과)

### 파일 구조

- `src/features/history/components/QuoteHistoryTable.tsx` — **258 라인, 단일 함수 컴포넌트**
- 동일 디렉토리 이웃: `QuoteHistoryPage.tsx`, `QuoteSearchBar.tsx`, `QuotePagination.tsx`, `QuoteDetailModal.tsx`, `QuoteCargoTable.tsx`, `QuoteCostBreakdown.tsx`, `QuoteDetailSubcomponents.tsx`
- 테스트: `__tests__/QuoteHistoryTable.test.tsx` (108 라인)

### 구조적 이슈

1. **모바일/데스크톱 두 뷰가 한 컴포넌트** — `sm:hidden` 카드 블록(36~137) + `hidden sm:block` 테이블 블록(140~255). 시각 분기와 데이터 분기가 같은 함수 안에서 섞임.
2. **3단 조건부 중첩**: `isLoading ? (skeleton) : quotes.length === 0 ? (empty) : (list)` — 양쪽 뷰에서 동일 패턴 반복.
3. **행 단위 중복 로직** (모바일/데스크톱 각각):
   - 만료일 계산 + 상태(`expired`/`amber`/`green`) 색 분기 — 두 곳에서 거의 같은 JSX
   - status pill (rounded-full + STATUS_COLORS) — 두 곳
   - surchargeStale 배지 — 두 곳
   - profit margin 색 분기 (≥10 → green / else amber) — 두 곳
   - View / Delete 액션 버튼 — 두 곳
4. **헬퍼 모듈 외부 노출 없음** — `getExpiryFromDate` 가 컴포넌트 파일 안에 있어 단위 테스트 어려움.
5. **데스크톱 만료 표시는 IIFE 패턴** (189~201) — 가독성 저해.

### 인터페이스 (보존 대상)

```typescript
interface Props {
  quotes: QuoteSummary[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  onView: (id: number) => void;
  onDelete: (id: number, refNo: string) => void;
}
```

`QuoteHistoryTable` named export — `QuoteHistoryPage` 가 사용.

## §3. 옵션 매트릭스

### 분리 전략

| 옵션 | 구조 | 장점 | 단점 |
|------|------|------|------|
| **A. 한 파일 내부 서브컴포넌트** | `QuoteHistoryTable.tsx` 안에 `MobileView`, `DesktopView`, `Row*` 정의 | 변경 폭 최소, import 0 | 라인 수만 약간 줄어듦, 파일 책임은 그대로 |
| **B. 파일 분리 + 공유 subcomponents** (권장) | `MobileQuoteTable.tsx` / `DesktopQuoteTable.tsx` + `subcomponents/{ExpiryBadge,StatusBadge,SurchargeStaleBadge,MarginText,RowActions}.tsx` + `utils/expiry.ts` | 단일 책임, 테스트·재사용 용이, 모바일/데스크톱 독립 진화 | 신규 파일 7~9개, import 정리 필요 |
| **C. headless table (TanStack)** | `@tanstack/react-table` 도입 | 정렬·페이지 통합 가능 | 의존성 추가, 본 범위 초과 (페이지/필터는 외부 컴포넌트) |

→ **B 채택**. 본 사이클은 P1 리팩토링 — 책임 분리가 핵심 목표. C는 별 사이클 후보로 명시한다.

### 모바일 라우터 위치

| 옵션 | 설명 |
|------|------|
| **B-1. 부모(QuoteHistoryTable) 가 분기** (권장) | `<div className="sm:hidden"><MobileQuoteTable .../></div>` + `<div className="hidden sm:block"><DesktopQuoteTable .../></div>` — Tailwind 분기 유지, JS 측 width 측정 없음 |
| B-2. `useMediaQuery` 훅 도입 | JS 측 측정. SSR 없음(Vite SPA) 이라 가능하지만 hydration 이슈는 아니고, 불필요한 리렌더 발생 |

→ **B-1 채택** — 기존 Tailwind 분기와 동일 패턴 유지, 행동 0.

## §4. 작업 분해 (do 후보)

### Phase A — 유틸 추출

- **A1**: `src/features/history/utils/expiry.ts` 생성
  - `getExpiryFromDate(validityDate: string): { daysLeft: number; expired: boolean }` 이동
  - 추가: `getExpiryStatus(daysLeft, expired): 'expired' | 'soon' | 'ok'` (3-색 분기 정규화)
- **A2**: `src/features/history/utils/__tests__/expiry.test.ts` 신규 — 경계(0/1/3/4일), 과거/미래, 잘못된 입력 케이스

### Phase B — 공유 subcomponents 추출

각 컴포넌트는 props 받는 순수 presentational, `subcomponents/` 하위:

- **B1**: `subcomponents/StatusBadge.tsx` — `{status, surchargeStale?}` rounded-full pill + STATUS_COLORS + surchargeStale 배지 (옵션)
- **B2**: `subcomponents/ExpiryBadge.tsx` — `{validityDate, status, compact?}` Clock 아이콘 + 3-색 분기 (모바일/데스크톱 두 variant)
- **B3**: `subcomponents/MarginText.tsx` — `{profitMargin}` ≥10 green / else amber
- **B4**: `subcomponents/RowActions.tsx` — `{id, refNo, onView, onDelete, size?: 'mobile'|'desktop'}` Eye/Trash2 버튼

### Phase C — 뷰 분리

- **C1**: `MobileQuoteTable.tsx` 신규 — 카드 리스트 뷰, skeleton/empty/list 3-state, 행은 위 B-1~B-4 조합
- **C2**: `DesktopQuoteTable.tsx` 신규 — `<table>` 뷰, skeleton row/empty row/data row, 행은 동일 조합
- **C3**: `QuoteHistoryTable.tsx` 축소 — Tailwind 분기로 두 뷰를 단순 위임 (예상 30~40 라인)

### Phase D — 검증

- **D1**: `npx tsc --noEmit` PASS
- **D2**: `npm run lint --max-warnings 0` PASS
- **D3**: `npx vitest run` PASS (특히 `QuoteHistoryTable.test.tsx` 무수정 통과 — 외부 인터페이스 보존 증거)
- **D4**: `npm run build` PASS
- **D5**: 수동 스모크 — `/admin` history 탭에서 모바일(320~640px)/데스크톱(≥768px) 양쪽 시각·인터랙션(클릭/삭제) 확인
- **D6**: 가능하면 React Testing Library snapshot 으로 모바일/데스크톱 DOM 보존 확인

## §5. 비범위 (out of scope)

다음은 **별 사이클 후보**:

- **page-level 변경**: `QuoteHistoryPage.tsx`, `QuoteSearchBar.tsx`, `QuotePagination.tsx` 수정
- **TanStack Table 도입** (옵션 C) — 정렬/리사이즈/가상 스크롤 등이 필요해질 때
- **가상 스크롤** (대량 행 성능) — 현재 페이지당 행 수가 적어 불필요
- **모바일 뷰 자체 UX 개선** (스와이프, infinite scroll 등)
- **백엔드 변경** — 본 사이클은 프론트만
- **status/surchargeStale 의미 변경** — 현재 시각/행동 그대로 유지
- **`QuoteDetailModal` split** (P1 #4 별 사이클)

## §6. 위험 / 검증

| 위험 | 영향 | 완화 |
|------|------|------|
| 시각 회귀 (클래스 누락/순서) | 중 | 기존 클래스 문자열 그대로 옮기고 변경 최소화, snapshot 활용, 수동 스모크 |
| 기존 테스트 깨짐 | 중 | `QuoteHistoryTable.test.tsx` 무수정 PASS 를 게이트로 — 외부 named export 시그니처/`Props` 보존 |
| import 순환 | 낮 | subcomponents 와 utils 는 `QuoteHistoryTable` 만 의존하도록 단방향 (다른 파일에서 사용 시 별 도입 검토) |
| 새 subcomponent 가 다른 곳에서도 쓰임 → 범위 확장 | 낮 | 본 사이클은 `history/` 내부에만 한정, 다른 features 가 쓰고 싶으면 별 도입 |
| 라인 수 총합 증가 (분리로 인한) | 매우 낮 | 본 사이클의 목표는 라인 줄이기가 아닌 **책임 분리**. 총합 증가는 허용 |

## §7. 다음 단계

- `/pdca design smart-quote-history-table-refactor` — Design 문서에서 §3 옵션 B-1 의 정확한 파일/디렉토리 구조, 각 subcomponent 의 prop 시그니처, 모바일/데스크톱 variant 분기 방식 확정
- Design 승인 후 `/pdca do smart-quote-history-table-refactor` — 구현 (Phase A → B → C → D 순)

## §8. Open Questions (Design 단계에서 답할 것)

1. `subcomponents/` 디렉토리 vs `parts/` vs `bits/` — 프로젝트 컨벤션 어디?
   - 기존 `QuoteDetailSubcomponents.tsx` 단일 파일 패턴 vs 새로 디렉토리화 — 일관성 결정 필요
2. `ExpiryBadge` 의 모바일·데스크톱 variant — prop `compact` 한 컴포넌트 vs 별도 컴포넌트?
3. 행(`<tr>`/카드) 단위 컴포넌트(`MobileQuoteRow` / `DesktopQuoteRow`) 까지 분리할지, 아니면 뷰 컴포넌트 안에서 inline map 만?
4. Snapshot 테스트 도입 여부 — 현재 코드베이스에 inline snapshot 사용 사례 있는지 확인
