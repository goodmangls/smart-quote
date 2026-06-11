---
template: report
feature: dashboard-test-flakiness
date: 2026-06-11
author: jhlim725
project: j-ways-smart-quote-system
status: completed
matchRate: 100
pr: 46
mergeCommit: 890d783
---

# dashboard-test-flakiness 완료 보고서

> **Match Rate**: 100% · **PR**: #46 (squash merge `890d783`) · **CI**: 전 job green (재실행 없이)
> **Source**: dep-upgrade PR #34 CI 발견 · codebase-health-2026-06-07 M7 · Task #8

---

## 1. 요약

`CustomerDashboard.test.tsx`가 CI `check` job을 **무작위 차단**하던 타이밍-의존 flaky(`"window is not defined"` unhandled error)를 **결정적으로 제거**했다. 원인은 페이지 렌더 테스트가 대시보드 훅 8개 중 3개만 mock하여 나머지 5개가 실제 async fetch를 띄우고, 그 콜백이 jsdom teardown 이후 resolve하며 `window`-의존 코드(authStorage/localStorage/Sentry)에 닿은 것. test-side에서 나머지 5개 훅을 mock 완성하여 실제 async fetch를 0으로 만들어 누수 경로 자체를 제거했다.

## 2. 변경

| 파일 | 변경 |
|------|------|
| `src/pages/__tests__/CustomerDashboard.test.tsx` | 미mock 5개 훅(`useFscRates`·`useMarginRules`·`useSurcharges`·`useAddonRates`·`useResolvedMargin`) `vi.mock` 추가 — 기존 3-mock 패턴(빈/기본 stub) 일치. `useSurcharges`는 `calculateApplied()=[]`/`totalAmount()=0` 함수, `useFscRates`는 중첩 `rates` 기본값 |

**기능 코드 무변경** (테스트 파일 1개 + PDCA 문서만).

## 3. 성공기준 달성

| # | 목표 | 측정 | 결과 |
|---|------|------|:----:|
| SC-1 | flaky 제거(결정적) | CustomerDashboard 로컬 10/10(원base)+5/5(rebase) clean, unhandled 0 | ✅ |
| SC-2 | 실제 async 미발생 | 대시보드 훅 8/8 mock | ✅ |
| SC-3 | 회귀 0 | 전체 vitest 56f/1464t green, lint `--max-warnings 0`, build OK | ✅ |
| SC-4 | CI 안정 | **PR #46 `check` job green (재실행 없이)** + backend-rspec/e2e/lighthouse pass | ✅ |

## 4. 동종 누수 점검 (회귀 방지)

| 후보 | 결과 |
|------|------|
| `ExchangeRateWidget.test`(useFscRates) | 이미 mock — 안전 |
| `TargetMarginRulesWidget.test`(useMarginRules) | 이미 mock + marginRuleApi mock — 안전 |
| `AdminWidgets.test`(#43 신규, rebase 중 유입) | admin 위젯을 **컴포넌트 레벨 stub** → 5훅 미실행 — 안전 |
| ServiceSection/SurchargePanel/QuoteCalculator | 렌더테스트 부재 — 해당 없음 |
| → **CustomerDashboard 단일 leaky 확정** | |

## 5. 학습

- **로컬 green ≠ CI green** (타이밍 의존): jsdom teardown 후 in-flight async가 `window`에 닿으면 CI에서만 간헐 fail. 페이지 렌더 테스트는 **transitive 훅 전부 mock**이 원칙(부분 mock = 누수).
- **측정 전 git fetch 필수**: 작업 도중 로컬 main이 origin보다 10커밋 **behind**(처음 'ahead'로 오판)임을 fetch 후 확인 → stale base 위 PR 방지. clean FF 후 새 브랜치에 재적용·재검증(신규 `AdminWidgets.test` 누수 재점검 포함).

## 6. Out of Scope / 후속

- **`dashboard-hooks-abort-guard`** (선택): 8개 대시보드 훅에 AbortController/isMounted 가드를 넣어 프로덕션 setState-after-unmount까지 차단하는 근본 하드닝. 본 사이클은 CI 결정성 회복에 집중, 훅-side는 별도 사이클 후보.

---

## Version History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-06-11 | 완료 보고서. PR #46 squash `890d783`, CI 전 job green, Match 100% | jhlim725 |
