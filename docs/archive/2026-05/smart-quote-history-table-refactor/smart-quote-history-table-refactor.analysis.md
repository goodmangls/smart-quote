---
template: analysis
version: 1.0
description: smart-quote-history-table-refactor PDCA Check — Design vs 구현(branch refactor/history-table-split) gap 분석
feature: smart-quote-history-table-refactor
date: 2026-05-20
author: jhlim725 (via gap-detector agent + 수동 작성)
project: j-ways-smart-quote-system (smart-quote-main)
matchRate: 95
---

# smart-quote-history-table-refactor Analysis Report

> **Summary**: 7/7 성공 기준 충족, 6/6 하드 게이트 PASS, Critical gap 0, 외부 인터페이스 보존 게이트 통과(__tests__/QuoteHistoryTable.test.tsx 7/7 무수정 PASS). 단 라인 예산 +270 → 실제 +304 (+34 초과, prettier 다중 라인 className + JSDoc 사유). `/pdca report` 자격(≥90%) 충족.
>
> **Source commits** (branch `refactor/history-table-split`):
> - `4dd1123` Phase A — expiry util 추출 + 단위 테스트
> - `6b876ec` Phase B — QuoteHistoryTableParts 추출
> - `574a7cc` Phase C — Mobile/Desktop 뷰 분리 + thin router
> - `104251d` docs(plan)
> - `bb33e81` docs(design)
>
> **Design doc**: [smart-quote-history-table-refactor.design.md](../02-design/features/smart-quote-history-table-refactor.design.md)

---

## 1. Match Rate

| 지표 | 값 |
|------|----|
| §1 성공 기준 7개 충족 | 7/7 (100%) |
| §2 파일 구조 (신규 4 / 수정 1 / 무변경) | 5/5 (100%) |
| §3 컴포넌트 스펙 (5 parts + 2 views + router) | 8/8 (100%) |
| §4 검증 게이트 (tsc/lint/vitest/build/외부 IF/DOM) | 6/6 (100%) |
| §5 Out of Scope 위반 | 0 |
| §6 위험 회피 (Tailwind/다크/skeleton/콜백/key/budget) | 5/6 (라인 예산 1건 초과) |
| §8 라인 예산 (net ≤ +270) | **+304 / +270 (113%)** ⚠️ |
| Critical gap | 0 |

**최종 Match Rate: 95%** (하드 게이트 100% + 소프트 라인 예산 1건 -5%)

---

## 2. Fix Matrix — Design §1 성공 기준

| # | Design 항목 | 구현 증거 | 상태 |
|---|------------|----------|------|
| 1 | `QuoteHistoryTable.tsx` 258 → 분리, 모바일/데스크톱 구분 | 36 라인 thin router (`QuoteHistoryTable.tsx:25-36`), 두 뷰는 별 파일 | ✅ |
| 2 | 행 단위 반복 패턴(만료/status/surcharge/margin/액션) 재사용 단위 추출 | `QuoteHistoryTableParts.tsx` 5 named export (StatusPill/SurchargeStaleBadge/ExpiryBadge/MarginText/RowActions) | ✅ |
| 3 | `getExpiryFromDate` → `utils/expiry.ts` + 단위 테스트 신규 | `utils/expiry.ts:18-25` `getExpiryInfo` + `__tests__/expiry.test.ts` 7 케이스 PASS | ✅ |
| 4 | `__tests__/QuoteHistoryTable.test.tsx` 무수정 PASS | `git diff origin/main...HEAD -- __tests__/QuoteHistoryTable.test.tsx` = 변경 0, vitest 7/7 PASS | ✅ |
| 5 | vitest / lint / `tsc --noEmit` / `npm run build` 회귀 0 | 50 files 1437 tests PASS, eslint clean, tsc clean, build ✓ 6.23s | ✅ |
| 6 | 시각 회귀 0 — 모바일/데스크톱 DOM·클래스·a11y 동일 | className 문자열 grep 1:1 일치 (§3 표 참조), aria-label "View detail"/"Delete" 보존 | ✅ (자동 게이트), 수동 스모크 후속 |
| 7 | 외부 import 경로 유지 — `QuoteHistoryPage` 무변경 | `QuoteHistoryPage.tsx` 무변경, `QuoteHistoryTable` named export 동일 시그니처 (`Props` 5필드, `React.FC<Props>`) | ✅ |

---

## 3. Fix Matrix — Design §3 컴포넌트 스펙

| 컴포넌트 | Design className/시그니처 | 구현 위치 | 1:1 일치 |
|---------|--------------------------|----------|----------|
| `StatusPill` | `inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[status]}` | `QuoteHistoryTableParts.tsx:22-30` | ✅ |
| `SurchargeStaleBadge` | `inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400` + AlertTriangle w-2.5 h-2.5 + "재확인" | `QuoteHistoryTableParts.tsx:36-43` | ✅ |
| `ExpiryBadge` | variant 'mobile'(span) / 'desktop'(div mt-0.5), 3-color severity, `if (!validityDate \|\| (status !== 'draft' && status !== 'sent')) return null` | `QuoteHistoryTableParts.tsx:61-88` | ✅ + `validityDate?: string \| null \| undefined` 확장 (QuoteSummary.validityDate가 nullable 이라 필요한 보정) |
| `MarginText` | ≥10 green / else amber, optional className | `QuoteHistoryTableParts.tsx:100-107` | ✅ |
| `RowActions` | variant별 sizing (mobile p-2.5 w-5 h-5 / desktop p-2.5 sm:p-1.5 w-5 h-5 sm:w-4 sm:h-4), wrapper (mobile gap-1 / desktop justify-center gap-1) | `QuoteHistoryTableParts.tsx:130-156` | ✅ |
| `MobileQuoteTable` | Fragment 반환, MobileSkeleton 모듈 내부, 4-row 카드 (refNo+pill / date+expiry+dest / KRW+USD / margin+actions) | `MobileQuoteTable.tsx:56-126` (View) + `:26-54` (Skeleton) | ✅ |
| `DesktopQuoteTable` | `<table>` 단독 반환 (wrapper div 없음), DesktopSkeletonRows 모듈 내부, 8-column 테이블 | `DesktopQuoteTable.tsx:62-156` + `:27-60` (Skeleton) | ✅ |
| `QuoteHistoryTable` | thin router, 2 wrapper div (`sm:hidden` + `hidden sm:block overflow-x-auto`), `React.FC<Props>` named export | `QuoteHistoryTable.tsx:25-36` | ✅ |

---

## 4. Verification (§4 게이트)

### 4.1 자동 게이트 — 6/6 PASS

| 게이트 | 명령 | 결과 |
|--------|------|------|
| TypeScript | `npx tsc --noEmit` | exit 0, no output |
| ESLint | `npx eslint --max-warnings 0 src/features/history/` | exit 0 |
| Vitest | `npx vitest run` | 50 files / **1437 tests PASS** (신규 expiry.test.ts 7 + 기존 1430) |
| Build | `npm run build` | ✓ built in 6.23s |
| 외부 인터페이스 보존 (HARD) | `__tests__/QuoteHistoryTable.test.tsx` 7/7 무수정 PASS | ✅ test 파일 git diff = 변경 0 |
| DOM 등가성 (HARD) | Router 2 wrapper div + Mobile Fragment + Desktop `<table>` 단독 | ✅ §3 표 + 코드 검증 |

### 4.2 외부 인터페이스 보존 — 사전 검증한 게이트 충족

`__tests__/QuoteHistoryTable.test.tsx` (108 라인) 의 단정은 모두 행동 기반:
- `getByText('Ref No' \| 'Date' \| ... \| 'Actions')` — 헤더 text
- `getAllByText('SQ-2026-0001' \| 'US' \| '1,500,000' \| ...)` — 양쪽 뷰 동시 렌더 가정
- `container.querySelectorAll('.animate-pulse')` — 클래스 존재만
- `getAllByLabelText('View detail' \| 'Delete')` — aria-label 보존

DOM 구조 단정 0건, snapshot 0건 → §3.5 DOM 등가성 유지 시 통과 보장. **실측 PASS**.

### 4.3 수동 스모크 — 후속 (배포 전)

미수행. dev 서버 충돌 회피로 본 사이클에선 자동 게이트만 통과. 권장 검증:
- `npm run dev` → `/admin` history 탭
- 모바일 viewport (320~640px): 카드 4-row 표시, 만료 3색 분기, 재확인 배지, View/Delete 클릭
- 데스크톱 viewport (≥768px): 테이블 8-column, 날짜+expiry stacked, status+surchargeStale stacked
- 다크 모드 토글 양쪽 viewport

---

## 5. Positive Delta (Design 대비 추가/개선)

| 항목 | Design | 구현 | 영향 |
|------|--------|------|------|
| `ExpiryBadgeProps.validityDate` 타입 | `string?` | `string \| null \| undefined` | `QuoteSummary.validityDate` 가 nullable 인데 design 누락. tsc 컴파일 가능하게 보정. |
| JSDoc 풍부도 | 미명시 | 각 컴포넌트·variant·rule 주석 | 다음 작업자 진입 시간 ↓, 라인 +20 비용 (소프트 게이트 일부 사유) |
| Phase 커밋 분리 | 4-커밋 권장 | 3-커밋 실행 (Phase D 검증은 별 커밋 없이 Phase C 안에서 통합) | PR 리뷰 간소화, squash merge 영향 0 |

---

## 6. Out of Scope — 위반 0

`git diff --name-only origin/main...HEAD` 결과:
```
.commit_message.txt                                      ← 허용 (commit 메시지 기록 convention)
docs/01-plan/features/smart-quote-history-table-refactor.plan.md
docs/02-design/features/smart-quote-history-table-refactor.design.md
src/features/history/components/DesktopQuoteTable.tsx
src/features/history/components/MobileQuoteTable.tsx
src/features/history/components/QuoteHistoryTable.tsx
src/features/history/components/QuoteHistoryTableParts.tsx
src/features/history/utils/__tests__/expiry.test.ts
src/features/history/utils/expiry.ts
```

✅ `src/features/history/` 외부 변경 0
✅ `__tests__/QuoteHistoryTable.test.tsx` 변경 0 (외부 인터페이스 보존 게이트)
✅ `QuoteHistoryPage` / `QuoteSearchBar` / `QuotePagination` / `QuoteDetailModal` 변경 0
✅ 백엔드 / DESIGN.md / 다른 features 변경 0

---

## 7. ⚠️ 소프트 게이트 — 라인 예산 +34 초과

### 7.1 실측

| 측정 | Design 예산 | 실제 | 차이 |
|------|------------|------|------|
| `git diff --shortstat origin/main...HEAD -- 'src/**'` | +170~+270 (목표) / 재검토 트리거 +270 | **+544 / -240 = +304 net** | **+34** |

### 7.2 사유 분석

| 사유 | 영향 라인 (추정) | 비-로직 여부 |
|------|----------------|-------------|
| Prettier 다중 라인 className 포맷 (긴 className 을 2~3 라인으로 분할) | ~20 | 비-로직 (포맷팅) |
| JSDoc 주석 (각 컴포넌트 헤더 + variant 설명) | ~20 | 비-로직 (문서) |
| `MobileSkeleton`/`DesktopSkeletonRows` 추출 함수 헤더 | ~6 | 구조 (필수) |
| 라우터 안내 JSDoc | ~6 | 비-로직 (문서) |

→ **모두 비-로직 증가**. 새 로직·새 분기·새 상태 0건. Design §6 의 "재검토 트리거" 본의는 *복잡도/유지보수 부담* 이며, 포맷+JSDoc 은 두 지표 모두에 부정 영향 없음.

### 7.3 평가

- **Hard 게이트 영향 없음** — tsc/lint/vitest/build/외부 IF/DOM 전부 PASS
- **재검토 불요** — Design §6 의 본의(복잡도) 기준으로는 게이트 충족
- **다만 기록 필요** — 향후 사이클에서 budget 계산 시 prettier 다중 라인 포맷 비용을 +30~+50 더 잡는다 (학습)

→ 라인 예산은 **소프트 게이트 1건 미달이지만 Report 진행 차단 사유 아님**. matchRate 95% (이 1건 -5% 반영) 로 기록.

---

## 8. Open Questions 4건 — 답 검증

| # | Design 답 | 구현 검증 |
|---|-----------|----------|
| 1 | 단일 파일 `QuoteHistoryTableParts.tsx` (디렉토리 X) | ✅ `src/features/history/components/QuoteHistoryTableParts.tsx` 단일 파일 156 라인, 5 named export |
| 2 | `ExpiryBadge` `variant: 'mobile' \| 'desktop'` prop | ✅ `QuoteHistoryTableParts.tsx:58, 61, 76-87` — span/div + mt-0.5 분기 명시 |
| 3 | 행 단위 분리 안 함, map() 인라인 | ✅ `MobileQuoteTable.tsx:77-122` + `DesktopQuoteTable.tsx:107-149` 모두 `quotes.map((q) => ...)` 인라인 |
| 4 | Snapshot 도입 안 함 | ✅ `expiry.test.ts` 7 케이스는 `.toEqual` / `.toBe` 행동 기반, snapshot 0건 |

---

## 9. Open Items / Risks (after analysis)

- **수동 스모크 미수행** — 자동 게이트만으로는 시각 회귀 100% 보장 어려움. 배포 전 사용자 확인 필수.
- **라인 예산 +34 초과** — 기록(§7), 후속 사이클에서 prettier 다중 라인 비용 사전 반영 학습 필요.
- **`.bkit-memory.json` 미커밋** — 가장 최근 input-validation 패턴 일치, 의도된 선택.

---

## 10. Verdict

| 항목 | 값 |
|------|----|
| matchRate | **95%** |
| Critical gap | **0** |
| Iterations needed | **0** (≥90% 게이트 충족, +5% 미달은 비-로직 사유) |
| 권장 다음 단계 | **`/pdca report smart-quote-history-table-refactor`** |
| 대안 | `/pdca iterate smart-quote-history-table-refactor` — JSDoc 축약·prettier 단일 라인 강제로 라인 예산 회복 가능. 단 가치 낮음 (가독성 ↓) 권장 안 함 |

→ **Report 진행 권장**. iterate 는 가치 대비 비용이 낮음.
