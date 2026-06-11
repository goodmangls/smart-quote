---
template: plan
version: 1.1
feature: dashboard-test-flakiness
date: 2026-06-07
author: jhlim725
project: j-ways-smart-quote-system
status: draft
---

# dashboard-test-flakiness Plan

> **Status**: Draft
> **Project**: j-ways-smart-quote-system (Goodman GLS / J-Ways, bridgelogis.com)
> **Author**: jhlim725
> **Created**: 2026-06-07
> **PDCA Phase**: Plan
> **Source**: dep-upgrade PR #34 CI에서 발견(dep 무관), codebase-health-2026-06-07 M7, Task #8

---

## 1. Overview

### 1.1 Purpose

`CustomerDashboard.test.tsx`가 CI에서 간헐적으로 **"Unhandled Error: window is not defined"** 로 `check` job을 실패시킨다(로컬 재현 5/5 미발생, 동일 커밋 재실행 green = 타이밍 의존 flaky). 이는 **모든 PR의 `check` job을 무작위 차단**할 수 있는 CI 신뢰성 부채다. 결정적(deterministic)으로 만들어 제거한다.

### 1.2 Background — 검증된 근본 원인 (2026-06-07 직접 확인)

| 사실 | 근거 |
|------|------|
| `CustomerDashboard`(+자식 위젯)는 **8개** 대시보드 훅 사용 | `useFscRates`/`useMarginRules`/`useSurcharges`/`useAddonRates`/`useExchangeRates`/`usePortWeather`/`useLogisticsNews`/`useResolvedMargin` (grep) |
| 테스트는 **3개만 mock** | `CustomerDashboard.test.tsx` — `useExchangeRates`/`usePortWeather`/`useLogisticsNews`만 `vi.mock` |
| 미mock 5개가 **실제 async fetch** 발생 | 예: `useFscRates.ts:18-22` `fetchRates() → await getFscRates()`(apiClient) |
| teardown 후 fetch resolve → `window`(authStorage/localStorage/Sentry) 접근 → ReferenceError | CI 스택이 `useFscRates:25` setError('FSC 요율 조회 실패') 부근 가리킴 + "window is not defined" |
| `useExchangeRates`는 interval/listener cleanup 완비(line 54/65/76/83) | 누수는 **in-flight async fetch**(unmount 가드 부재)지 listener 아님 |

**즉**: 페이지 렌더 테스트가 일부 훅만 mock해 나머지가 실제 네트워크 async를 띄우고, jsdom teardown 이후 콜백이 `window`-의존 코드에 닿아 unhandled error가 된다. vitest는 unhandled error를 exit 1로 처리 → CI fail.

### 1.3 Related

| Type | Link |
|------|------|
| Analysis | `docs/03-analysis/codebase-health-2026-06-07.analysis.md` M7 (미커밋) |
| Memory | [[project_smart_quote_dep_upgrade_completed]] (발견 경위), [[feedback_ci_seed_pollution_db_test_prepare]] (로컬≠CI 계열) |

---

## 2. Scope

### 2.1 In Scope

1. **CustomerDashboard.test.tsx — 나머지 5개 훅 mock 완성**: `useFscRates`·`useMarginRules`·`useSurcharges`·`useAddonRates`·`useResolvedMargin`를 기존 3개와 동일한 `vi.mock` 패턴으로 추가(정상 데이터 반환 stub). → 실제 async fetch 0 → teardown 누수 0.
2. **동종 누수 점검**: 다른 대시보드/위젯 렌더 테스트(예: 위젯 개별 테스트)가 같은 미mock 패턴인지 grep 확인, 발견 시 동일 처리.
3. **결정성 검증**: 수정 후 해당 테스트 로컬 **N회(예: 10) 반복** + 전체 vitest green + (가능 시) CI 1회 확인.

### 2.2 Out of Scope (별도 follow-up)

- **훅-side unmount 가드**(AbortController/isMounted): 프로덕션 setState-after-unmount까지 막는 근본 하드닝이나 8개 훅 표면 → 별도 사이클 `dashboard-hooks-abort-guard`(선택). 본 사이클은 **CI 결정성 회복**에 집중.
- vitest `dangerouslyIgnoreUnhandledErrors` 류 **마스킹 금지**(원인 미해결).
- 기능 코드 변경.

---

## 3. Goals & Success Criteria

| # | 목표 | 측정 |
|---|------|------|
| SC-1 | flaky 제거(결정적) | `CustomerDashboard.test.tsx` 로컬 10/10 pass, unhandled error 0 |
| SC-2 | 실제 async 미발생 | 미mock 대시보드 훅 0 (8/8 mock) → fetch stub만 |
| SC-3 | 회귀 0 | 전체 vitest green(현 1447), 테스트 의도 유지(렌더/상호작용 assertion) |
| SC-4 | CI 안정 | PR `check` green (재실행 의존 없이) |

---

## 4. Open Decisions

| ID | 결정 | 옵션 | 권고 |
|----|------|------|------|
| R-1 | 수정 위치 | (a) **test-side**: 미mock 훅 mock 완성 / (b) hook-side: unmount 가드 | **(a) 권고** — 타깃·최소·기존 패턴 일치(페이지 테스트는 훅 단위테스트가 별도 존재). (b)는 broader 하드닝 follow-up |

> R-1은 차단 아님 — (a)로 진행, (b)는 §2.2 follow-up.

---

## 5. Implementation Order

```
1. CustomerDashboard.test.tsx: 5개 훅 vi.mock 추가(useFscRates/useMarginRules/useSurcharges/useAddonRates/useResolvedMargin)
2. 로컬 10x 반복 실행 → 결정성 확인(unhandled error 0)
3. 동종 테스트 grep 점검 → 필요 시 동일 처리
4. 전체 vitest + tsc/lint/build green
5. 커밋/PR → check green 확인(재실행 없이) → merge
```

검증: 수정 전 flaky가 CI에서만 나므로, **로컬 10x 반복**으로 결정성 입증(현 미mock 상태로도 로컬은 잘 통과하므로, 차이를 명확히 하려면 수정 전/후 비교 가능하면 기록).

---

## 6. Risks & Mitigations

| 리스크 | 영향 | 완화 |
|--------|------|------|
| 훅 mock으로 통합 커버리지↓ | 훅↔API 배선 미검증 | 페이지 테스트 본질은 렌더/상호작용. 훅 로직은 각 훅 단위테스트가 커버. 기존 3개도 이미 mock |
| 다른 테스트에 동종 누수 잔존 | flaky 재발 | §2.1-2 grep 점검 |
| mock 데이터가 위젯 렌더 깨뜨림 | 테스트 실패 | 기존 mock 패턴(정상 데이터 stub) 그대로 따름 |

---

## 7. Next Step

1. `/pdca do dashboard-test-flakiness` — test-side mock 완성 → 로컬 10x → PR
2. Design 생략 권고(테스트 mock 추가, 명확). (선택) follow-up `dashboard-hooks-abort-guard`
