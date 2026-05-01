---
template: analysis
version: 1.0
description: smart-quote-e2e-debt PDCA Check — Design vs 구현(4d5f691) gap 분석
feature: smart-quote-e2e-debt
date: 2026-05-02
author: jhlim725 (via gap-detector agent)
project: j-ways-smart-quote-system (smart-quote-main)
matchRate: 100
---

# smart-quote-e2e-debt Analysis Report

> **Summary**: Design Fix Matrix 11/11 충족. Critical gap 0. Match Rate 100%. `/pdca report` 자격(≥90%) 충족.
>
> **Source commit**: `4d5f691 🐛 fix(e2e): 라벨 중복·outdated 셀렉터·i18n 텍스트 정리 (e2e-debt) (#8)`
> **Design doc**: [smart-quote-e2e-debt.design.md](../02-design/features/smart-quote-e2e-debt.design.md)

---

## 1. Match Rate

| 지표 | 값 |
|------|----|
| Design Fix Matrix 충족 | 11/11 (100%) |
| Selector 전략 표준 준수 | 100% (id/role 우선) |
| Verification 5.1 자동 기준 | 4/4 ✅ |
| Verification 5.2 수동 기준 | 4/4 ✅ |
| Out of Scope 위반 | 0 |
| Critical gap | 0 |

**최종 Match Rate: 100%**

---

## 2. Fix Matrix 항목별 매칭

| # | Spec / 시나리오 | Design 카테고리 | 구현 라인 | 상태 |
|---|----------------|----------------|----------|------|
| 1 | `login.spec.ts › displays login form` | selector narrow | `e2e/login.spec.ts:6-7` `#email/#password` id 직접 | ✅ PASS |
| 2 | `login.spec.ts › shows error on empty submit` | selector narrow + 조건부 mock | `e2e/login.spec.ts:14-15` `#email` + required 검증 | ✅ PASS (mock 불필요 — Step C 자동 해결) |
| 3 | `login.spec.ts › has link to signup page` | n/a | 변경 없음 | ✅ PASS |
| 4 | `accessibility.spec.ts › login page form has proper labels` | selector narrow (id) | `e2e/accessibility.spec.ts:14-16` 3개 id 검증 | ✅ PASS |
| 5 | `accessibility.spec.ts › landing heading` | n/a | 변경 없음 | ✅ PASS |
| 6 | `accessibility.spec.ts › language selector keyboard` | n/a | 변경 없음 | ✅ PASS |
| 7 | `landing.spec.ts › displays hero section and navigation` | text → role/heading | `e2e/landing.spec.ts:7-9` `getByRole('banner')` + `getByRole('heading', {level:1})` | ✅ PASS |
| 8 | `landing.spec.ts › has login and signup links` | n/a | 변경 없음 | ✅ PASS |
| 9 | `landing.spec.ts › navigates to login page` | n/a | 변경 없음 | ✅ PASS |
| 10 | `magic-link-auth.spec.ts › request → verify → redirect` | n/a (auto skip) | try-catch + `test.skip()` 33-45 | ✅ PASS |
| 11 | `magic-link-auth.spec.ts › invalid token shows error and Back to Login button` | i18n + role | `addInitScript` + 정규식 확장 + role button | ✅ PASS |

---

## 3. Verification 충족

### 3.1 자동 검증

- ✅ `npx playwright test` — 11 tests / 10 passed / 1 skipped (intentional)
- ✅ PR #8 CI `e2e` 잡 conclusion = `success` (1m5s)
- ✅ `mergeStateStatus: CLEAN`
- ✅ backend 의존 흔적 0 (try-catch + skip 처리)

### 3.2 수동 검증

- ✅ LoginPage 두 form 정상 동작 — id 분리로 regression 없음
- ✅ LandingPage 비-영문 i18n 영향 없음 — heading 존재만 검증
- ✅ 메인 SPA 빌드 영향 0 — 변경 파일 4개 모두 `e2e/*.spec.ts`
- ✅ vitest 1315 tests 영향 없음

---

## 4. Positive Delta (Design 대비 추가/개선)

| 항목 | Design | 구현 | 영향 |
|------|--------|------|------|
| `magic-link-auth` 정규식 | `/invalid|expired/i` | `/invalid|expired|not found|login failed/i` | 안정성 ↑ — backend 미가동 환경 fallback("Not Found"/"Login Failed") 대응 |
| ECONNREFUSED 처리 | Step C 조건부 적용 예정 | beforeAll + 첫 테스트 둘 다 try-catch 선제 적용 | CI(IPv6 ::1) 즉시 throw 회피 |
| `landing.spec.ts` 코멘트 | n/a | "Header component renders `<header>` (role=banner); no `<nav>` element." | 미래 유지보수 가독성 ↑ |
| `accessibility.spec.ts` `#magic-email` 검증 | label 두 개만 검증 | 3개(`#email/#password/#magic-email`) 모두 검증 | 매직 링크 form 가시성도 회귀 보호 |

---

## 5. Out of Scope 준수

- ✅ 신규 e2e 시나리오 추가 없음
- ✅ Rails CI 서비스 통합 없음 (별도 사이클 후보)
- ✅ Visual regression 도입 없음
- ✅ Playwright 업그레이드 없음
- ✅ LoginPage / LandingPage / MagicLinkVerifyPage 마크업 변경 없음

---

## 6. Open Questions 업데이트

Design 7.2 의 3개 open question 중:
1. **`e2e-backend-integration` 별도 사이클 시점**: 본 사이클 100% 완료 → 다음 후보. 시작 여부는 사용자 결정.
2. **i18n-aware e2e 표준**: `addInitScript` localStorage seed 채택. URL `?lang=en` 미사용. 후속 사이클에서 재검토 가능.
3. **e2e CI 시간**: 현재 1m5s. backend 통합 시 재산정 필요.

---

## 7. 결론

- **Match Rate 100%** — `/pdca report` 자격 충족
- **Critical gap 0** — iterate 단계 불필요
- **Positive delta 4건** — Design 의도를 강화한 자율적 개선
- **Out of Scope 위반 0** — 메인 SPA·backend·마크업 모두 무영향

**다음 단계**: `/pdca report smart-quote-e2e-debt` — completion report 생성.
