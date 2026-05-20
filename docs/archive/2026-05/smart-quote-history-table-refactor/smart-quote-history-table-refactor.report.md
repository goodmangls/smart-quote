# Quote History Table Refactor 완료 보고서

> **Summary**: 258 라인 단일 컴포넌트 `QuoteHistoryTable.tsx` 를 router(36) + parts(156) + Mobile(126) + Desktop(156) + utils(25) + utils-test(63) 6 파일로 분리. 외부 인터페이스·DOM 등가성·시각 출력 모두 보존, vitest 1437/1437 PASS (기존 7/7 무수정 PASS = 하드 게이트), build ✓, matchRate 95%.
>
> **저자**: jaehong
> **작성일**: 2026-05-20
> **상태**: 완료 (Report 단계)
> **사이클**: `smart-quote-history-table-refactor` (parent: `smart-quote-code-analysis-2026-05-15` Health 7.8/10 P1 #3)
> **브랜치**: `refactor/history-table-split` (main 대비 7 커밋)

---

## 1. 계획 vs 실제

### 1.1 목표 달성 (Plan §1 / Design §1)

| 성공 기준 | 계획 | 실제 | 달성 |
|-----------|------|------|:----:|
| `QuoteHistoryTable.tsx` 분리 (mobile/desktop 명확 구분) | 258 → 분리 | 36 라인 thin router | ✅ |
| 행 단위 반복(만료/status/surcharge/margin/액션) 재사용 단위 추출 | 4~5 subcomponent | 5 named export (`StatusPill`/`SurchargeStaleBadge`/`ExpiryBadge`/`MarginText`/`RowActions`) | ✅ |
| `getExpiryFromDate` → `utils/` + 단위 테스트 | utils 분리 + 신규 | `utils/expiry.ts` (`getExpiryInfo`) + 7 케이스 PASS | ✅ |
| 기존 `__tests__/QuoteHistoryTable.test.tsx` 무수정 PASS | 게이트 | 7/7 무수정 PASS (git diff 0) | ✅ |
| Vitest / lint / tsc / build 회귀 0 | 게이트 | 50 files / 1437 tests PASS, eslint clean, tsc clean, build ✓ 6.23s | ✅ |
| 시각 회귀 0 (DOM·클래스·a11y 동일) | hard | className 1:1 보존, aria-label "View detail"/"Delete" 보존, DOM 노드별 동일 | ✅ (자동) / 수동 스모크 후속 |
| 외부 import 경로 유지 | hard | `QuoteHistoryPage.tsx` 무변경, named export `QuoteHistoryTable` + `Props` 5필드 동일 | ✅ |

### 1.2 범위 변화

**계획 범위 내 완전히 커버됨**:
- utils: `expiry.ts` + 단위 테스트
- parts: 5 presentational components (StatusPill / SurchargeStaleBadge / ExpiryBadge / MarginText / RowActions)
- views: `MobileQuoteTable` (Fragment 반환) + `DesktopQuoteTable` (`<table>` 단독 반환)
- router: `QuoteHistoryTable` thin router (Tailwind 분기 wrapper 2개)

**Out of scope (별 사이클 후보, design §5 그대로 유지)**:
- `QuoteHistoryPage` / `QuoteSearchBar` / `QuotePagination` 변경
- TanStack Table 도입 (정렬/가상 스크롤 등)
- `QuoteDetailModal` split (P1 #4 — 다음 후보)
- 새 Parts 의 다른 features (`/quote`, `/dashboard`, `/admin`) 확산

### 1.3 Open Questions 4건 — 답 검증

| # | Design 답 | 구현 결과 |
|---|-----------|-----------|
| 1 | 단일 파일 `QuoteHistoryTableParts.tsx` (디렉토리 X, `QuoteDetailSubcomponents.tsx` 패턴 일치) | ✅ 156 라인 단일 파일, 5 named export |
| 2 | `ExpiryBadge variant: 'mobile' \| 'desktop'` prop (span/div + mt-0.5 분기) | ✅ 단일 컴포넌트, 명시 분기 |
| 3 | 행 단위 `MobileQuoteRow`/`DesktopQuoteRow` 분리 안 함 (map() 인라인) | ✅ 양쪽 뷰 모두 `quotes.map((q) => ...)` 인라인 |
| 4 | Snapshot 도입 안 함 (게이트 = 기존 behavioral 테스트) | ✅ expiry.test.ts 는 `.toEqual` / `.toBe` 행동 기반, snapshot 0건 |

---

## 2. Do (구현 현황)

### 2.1 커밋 목록 (7개)

```
c33a5a3 📊 docs(analysis): smart-quote-history-table-refactor PDCA Check (matchRate 95%)
bb33e81 📋 docs(design): smart-quote-history-table-refactor design 신규
104251d 📋 docs(plan): smart-quote-history-table-refactor plan 신규
574a7cc ♻️ refactor(history): QuoteHistoryTable mobile/desktop 뷰 분리 — 외부 인터페이스 보존 (Phase C)
6b876ec ♻️ refactor(history): QuoteHistoryTableParts 추출 (Phase B)
4dd1123 ♻️ refactor(history): expiry util 추출 + 단위 테스트 (Phase A)
```

(+ 본 보고서 커밋이 마지막에 추가됨)

### 2.2 파일 변경 요약 (src/ only)

| 파일 | 변경 | 라인 (post) |
|------|------|:----------:|
| `src/features/history/components/QuoteHistoryTable.tsx` | 수정 (258 → 36) | 36 |
| `src/features/history/components/QuoteHistoryTableParts.tsx` | **신규** (5 named export) | 156 |
| `src/features/history/components/MobileQuoteTable.tsx` | **신규** (Fragment 반환) | 126 |
| `src/features/history/components/DesktopQuoteTable.tsx` | **신규** (`<table>` 단독) | 156 |
| `src/features/history/utils/expiry.ts` | **신규** (`getExpiryInfo`) | 25 |
| `src/features/history/utils/__tests__/expiry.test.ts` | **신규** (7 케이스) | 63 |

`git diff --shortstat origin/main...HEAD -- 'src/**'` → **+544 / -240 = net +304 라인**

### 2.3 DOM 등가성 보장 구조

```
원본:                                           본 사이클 결과:
<div>                                           <div>                                            ← QuoteHistoryTable
  <div className="sm:hidden">{cards/skel}  ≡    <div className="sm:hidden">                      ← QuoteHistoryTable
                                                  <MobileQuoteTable />     → Fragment 반환
                                                </div>
  </div>                                          
  <div className="hidden sm:block             ≡  <div className="hidden sm:block                ← QuoteHistoryTable
       overflow-x-auto">                              overflow-x-auto">
    <table>...</table>                              <DesktopQuoteTable />  → <table> 단독 반환
  </div>                                          </div>
</div>                                          </div>
```

→ 렌더된 최종 DOM 트리는 **노드별 동일**. wrapper div 추가/누락 없음.

---

## 3. Check (Gap 분석 결과)

`docs/03-analysis/smart-quote-history-table-refactor.analysis.md` 요약:

| 지표 | 값 |
|------|----|
| **Match Rate** | **95%** (≥90% 자격 충족) |
| §1 성공 기준 | 7/7 (100%) |
| §3 컴포넌트 스펙 className 1:1 | 8/8 (100%) |
| 자동 검증 게이트 | 4/4 (tsc/lint/vitest/build) |
| 외부 인터페이스 보존 (HARD) | ✅ `__tests__/QuoteHistoryTable.test.tsx` 7/7 무수정 PASS |
| DOM 등가성 (HARD) | ✅ 라우터+뷰 구조로 노드별 동일 |
| Open Questions 답 매칭 | 4/4 |
| Out of scope 위반 | 0 |
| Critical gap | **0** |
| 라인 예산 (soft) | ⚠️ +270 → +304 (+34 초과, 113%) — 비-로직 (prettier + JSDoc), 게이트 영향 없음 |
| Iterations needed | 0 |

---

## 4. Positive Delta (Design 대비 추가/개선)

| 항목 | Design | 구현 | 영향 |
|------|--------|------|------|
| `ExpiryBadgeProps.validityDate` 타입 | `string?` | `string \| null \| undefined` | `QuoteSummary.validityDate` 가 nullable 인데 design 누락. tsc 게이트 통과의 필수 보정. |
| JSDoc 풍부도 | 미명시 | 각 컴포넌트·variant·rule 주석 | 다음 작업자 진입 시간 ↓ (라인 +20 비용은 §6에서 회복 학습) |
| Phase 커밋 분리 | 4-커밋 권장 | 3 구현 + 2 docs + 1 analysis = 6 커밋 (Phase D 검증은 Phase C 안에 통합) | PR 리뷰 간소화, squash merge 영향 0 |

---

## 5. 핵심 학습 (메모리화 후보)

### 5.1 서브에이전트 출력 사후 검증 — `feedback_subagent_constraint_violation` 패턴 재확인

`gap-detector` 에이전트가 **"Analysis file written to..."** 라고 보고했지만 `ls` 결과 **파일이 실제 존재하지 않음**. 메모리 권고대로 결과 수용 전 검증 → 즉시 적발 → 수동 작성으로 보정. 시간 손실 회피.

→ 모든 서브에이전트 파일-생성 작업은 **즉시 `ls` 또는 `Read` 확인** 필수.

### 5.2 라인 예산 책정 시 prettier/JSDoc 비용 사전 반영

본 사이클 +34 초과 (113%) 사유 = prettier 다중 라인 className 포맷 (~20) + JSDoc (~26). 향후 component-split 사이클 budget 책정 시 **+30~+50 비-로직 버퍼** 사전 반영하면 hit rate ↑.

### 5.3 advisor 사전 검증의 가치

Design 단계에서 advisor 호출 3 bug 적발: (a) DOM wrapper div 누락 (data-test 면 통과하지만 시각 회귀 위험), (b) 테스트 게이트 가정 미검증, (c) 라인 예산 §6/§8 모순. **Do 단계 전 적발 = 재작업 0**. design→do 진입 시 advisor 호출은 비용 대비 가치 매우 높음.

### 5.4 행동 기반 테스트의 강건성 재확인

`QuoteHistoryTable.test.tsx` 가 모두 `getByText` / `getAllByLabelText` / `.animate-pulse class 존재` 같은 행동 단정만 사용 — DOM 구조 단정 0건. 결과: 1:6 분리 리팩토링이 **테스트 변경 0** 으로 통과. 향후 컴포넌트 테스트 작성 시 이 패턴이 표준.

---

## 6. 미수행 / 후속

### 6.1 본 사이클 외 후속

- **수동 스모크 (모바일/데스크톱/다크)** — 배포 전 사용자 확인 필요. 자동 게이트는 100% 통과했으나 시각 회귀는 100% 보장 불가.
- **`.bkit-memory.json` 미커밋** — 가장 최근 input-validation 패턴 일치, 의도된 선택.
- **PR 생성·push·머지** — 사용자 명시 요청 시.

### 6.2 별 사이클 후보 (parent code-analysis 의 잔여)

| 후보 | 우선순위 | 비고 |
|------|---------|------|
| `quote-detail-modal-split` | P1 #4 | `QuoteDetailModal.tsx` 355 라인 — 본 사이클 다음 |
| `supabase-config-cleanup` | P2 | `.env.example` dead config 제거 |
| backend N+1 점검 | 권장 | `.includes(:customer, :items)` + `QueryRecorder` 테스트 |
| `QuoteExporter` MAX_EXPORT_COUNT | 권장 | 10K → ENV 화 |
| `calculationService` `useMemo` 의존성 | 권장 | 점검 |

---

## 7. Verdict

| 항목 | 값 |
|------|----|
| matchRate | **95%** |
| Critical gap | 0 |
| Hard 게이트 | 6/6 PASS |
| Soft 게이트 | 1/2 (라인 예산 -5%) |
| 권장 다음 단계 | **`/pdca archive smart-quote-history-table-refactor`** (Report 완료, 4 PDCA 문서 archive 가능) |
| 분기 | PR open / main fast-forward / main 직접 머지 — 사용자 선택 |

**본 사이클 완료. parent code-analysis P1 #3 항목 close.** 다음 자연스러운 후속은 P1 #4 `quote-detail-modal-split`.
