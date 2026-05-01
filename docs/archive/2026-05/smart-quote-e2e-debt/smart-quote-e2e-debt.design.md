---
template: design
version: 1.0
description: 메인 SPA Playwright e2e fail 9건 정리 — 라벨 중복 / landing 셀렉터 / backend 의존 격리
feature: smart-quote-e2e-debt
date: 2026-05-02
author: jhlim725
project: j-ways-smart-quote-system (smart-quote-main)
version_value: 0.1.0
---

# smart-quote-e2e-debt Design Document

> **Summary**: PR #7(insights-scaffold) Check 단계에서 처음 노출된 e2e fail 9건을 spec별로 정밀 진단하고, 각 항목별 fix 카테고리(selector-only / text-stable / mock / inspect)를 확정한다.
>
> **Project**: j-ways-smart-quote-system (smart-quote-main)
> **Status**: Draft
> **Planning Doc**: [smart-quote-e2e-debt.plan.md](../../01-plan/features/smart-quote-e2e-debt.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. e2e 잡을 GREEN 으로 회복시켜 PR `mergeStateStatus` 가 `UNSTABLE` 을 탈출하게 한다.
2. e2e 가 i18n 변경·브랜드 마이그레이션·라벨 미세조정에 둔감해지도록 selector 전략을 role/id 기반으로 일관화한다.
3. backend(Rails) 가 CI 에 없어도 client-side 시나리오는 독립적으로 통과하게 한다 (mock 또는 흐름 재정의).

### 1.2 Design Principles

- **Selector stability over text matching**: 텍스트 정규식보다 `id` / `role+name` / `form-scoped` 셀렉터 우선.
- **Client-only first**: backend 의존 시나리오는 별도 사이클(`e2e-backend-integration`)로 분리. 본 사이클은 client-side 만 통과시킴.
- **Skip is acceptable**: backend 미가동시 자동 `test.skip()` 처리(이미 `magic-link-auth.spec.ts` 첫 테스트가 채택). CI fail 보다 skip 이 신호 가치 높음.
- **No new coverage**: 기존 4 spec files 의 GREEN 화에만 집중. 신규 시나리오 금지.

---

## 2. Inventory (정밀 진단)

### 2.1 LoginPage 마크업 (확정)

`src/pages/LoginPage.tsx` 는 **두 개의 form** 을 동일 페이지에 렌더:

| form | input id | input name | label key | type |
|------|----------|------------|-----------|------|
| 일반 로그인 (라인 117-159) | `email` | `email` | `t('auth.email')` | `type='email'` |
| 일반 로그인 (라인 134-150) | `password` | `password` | `t('auth.password')` | `type='password'` |
| 매직 링크 (라인 175+) | `magic-email` | `magic-email` | `t('auth.magicLink.emailLabel')` | `type='email'` |

**문제**: `t('auth.email')` 와 `t('auth.magicLink.emailLabel')` 모두 영문에서 "Email" 단어를 포함 → `getByLabel(/email/i)` 가 두 elements 매치 → strict mode violation.

**i18n 키 영향**: 4개 언어(`en/ko/cn/ja`) 라벨 모두 영향. 본 사이클은 **i18n 손대지 않고 selector 만 narrow** 함.

### 2.2 LandingPage 마크업 (확정)

`grep -nE "(WCA|MPL|EAN|JCtrans)" src/pages/LandingPage.tsx` → **결과 0**.

→ `e2e/landing.spec.ts` 의 `getByText(/WCA.*MPL.*EAN.*JCtrans/)` 는 **이미 마크업에 없는 텍스트**를 찾는 outdated assertion.

메모리 `project_goodman_gls_identity.md` 와 align: 핵심 정체성은 GSSA(EAN/MPL 회원). WCA / JCtrans 는 과거 마크업의 잔재.

### 2.3 magic-link-auth.spec.ts (확정)

```ts
test('request → verify → redirect to dashboard', async ({ page, request }) => {
  ...
  test.skip(!reqRes.ok(), 'Rails API not reachable in this environment');  // ← 자동 skip
});

test('invalid token shows error and Back to Login button', async ({ page }) => {
  await page.goto('/auth/verify?token=bogus-token-value');
  await expect(page.getByText(/invalid|expired/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /back to login/i })).toBeVisible();
});
```

`MagicLinkVerifyPage.tsx` (라인 20, 32, 64):
- 라인 20: `setError(t('auth.magicLink.invalidLink'))`
- 라인 32: `setError(result.error ?? t('auth.magicLink.expired'))`
- 라인 64: `{t('auth.magicLink.backToLogin')}`

**가설 A**: i18n default 가 `ko` 면 텍스트가 한국어("유효하지 않은 링크" / "로그인으로 돌아가기") → 정규식 `/invalid|expired/i`, `/back to login/i` 매치 실패.

**가설 B**: 라인 64 가 `<button>` 이 아니라 `<Link>` 또는 `<a>` 면 `getByRole('button')` 매치 실패.

→ Do 단계에서 마크업 직접 확인 후 selector 를 role-agnostic + i18n-keyed test-id 로 교체. 또는 페이지 URL 쿼리로 `?lang=en` 강제하여 영어 텍스트 유도.

### 2.4 Login submit ECONNREFUSED (확정)

`e2e/login.spec.ts › shows error on empty submit`:
```ts
await page.getByRole('button', { name: /sign in/i }).click();
const emailInput = page.getByLabel(/email/i);  // 2 elements ← 우선 fail
await expect(emailInput).toHaveAttribute('required', '');
```

**1차 fail**: 같은 라벨 중복(2.1)으로 strict violation. 이게 해결되면:

**2차 가능성**: `required` HTML 속성이 client validation 을 막아 backend 도달 전 차단해야 정상. 그런데 LoginPage 의 `handleSubmit` 이 `e.preventDefault()` 후 직접 fetch 를 시도할 가능성 → ECONNREFUSED.

→ Do 단계에서 LoginPage `handleSubmit` 흐름 확인. 만약 `required` 만으로 안 막히면, e2e 에서 `page.route('/api/v1/**', route => route.abort())` 로 backend 호출 차단.

---

## 3. Fix Matrix

| # | Spec / 시나리오 | 근본 원인 | Fix 카테고리 | 변경 대상 | 예상 변경량 |
|---|----------------|----------|-------------|----------|-----------|
| 1 | `login.spec.ts › displays login form` | 라벨 중복 | selector narrow | spec only | ±2 line |
| 2 | `login.spec.ts › shows error on empty submit` | 라벨 중복 + (잠재) backend POST | selector narrow + (조건부) `page.route` mock | spec only | ±5 line |
| 3 | `login.spec.ts › has link to signup page` | (현재 PASS 추정) | n/a | n/a | 0 |
| 4 | `accessibility.spec.ts › login page form has proper labels` | 라벨 중복 | selector narrow (id 직접) | spec only | ±2 line |
| 5 | `accessibility.spec.ts › landing page has proper heading structure` | (현재 PASS 추정) | n/a | n/a | 0 |
| 6 | `accessibility.spec.ts › language selector is keyboard accessible` | (현재 PASS 추정) | n/a | n/a | 0 |
| 7 | `landing.spec.ts › displays hero section and navigation` | outdated 텍스트 (WCA/MPL/EAN/JCtrans) | text → role/heading | spec only | ±2 line |
| 8 | `landing.spec.ts › has login and signup links` | (현재 PASS 추정) | n/a | n/a | 0 |
| 9 | `landing.spec.ts › navigates to login page` | (현재 PASS 추정) | n/a | n/a | 0 |
| 10 | `magic-link-auth.spec.ts › request → verify → redirect` | backend skip 처리됨 | n/a (자동 skip) | n/a | 0 |
| 11 | `magic-link-auth.spec.ts › invalid token shows error and Back to Login button` | i18n 텍스트 또는 role mismatch | role/text 재정의 + 영어 강제 | spec only (URL `?lang=en` 또는 i18n localStorage seed) | ±5 line |

**총 변경 추정**: spec files 4개에서 ~16 line 수정. 메인 SPA 코드 변경 0.

### 3.1 Selector 전략 표준 (본 사이클 채택)

| 의도 | 선호 셀렉터 | 회피 셀렉터 |
|------|-----------|------------|
| 특정 input | `page.locator('#email')` 또는 `getByRole('textbox', { name: /^email$/i })` | `getByLabel(/email/i)` (라벨 중복 위험) |
| 폼 내부 input | `page.locator('form').first().getByLabel(...)` | global `getByLabel` |
| 버튼/링크 액션 | `getByRole('button|link', { name: /.../ }).first()` | text 정규식 직접 |
| 페이지 식별 | `getByRole('heading', { level: 1 })` 의 존재만 검증 | 특정 단어 매칭 (브랜드 변경 영향) |

---

## 4. Implementation Plan

### Step A — selector-only fix (안전, 우선)

대상: `e2e/login.spec.ts`, `e2e/accessibility.spec.ts`, `e2e/landing.spec.ts`.

변경 패턴:
```ts
// before
await expect(page.getByLabel(/email/i)).toBeVisible();
// after
await expect(page.locator('#email')).toBeVisible();

// before
await expect(page.getByText(/WCA.*MPL.*EAN.*JCtrans/).first()).toBeVisible();
// after
await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
```

검증: `npx playwright test e2e/login.spec.ts e2e/accessibility.spec.ts e2e/landing.spec.ts --reporter=list`.

### Step B — magic-link-auth invalid token 정밀 fix

대상: `e2e/magic-link-auth.spec.ts` 두 번째 테스트.

진단 명령:
```bash
npx playwright test e2e/magic-link-auth.spec.ts --reporter=list --headed=false 2>&1 | tail -40
```

분기:
- **B1. i18n 한국어 매치 실패**: `await page.addInitScript(() => localStorage.setItem('language', 'en'))` 후 `await page.goto(...)`.
- **B2. role mismatch (button vs link)**: spec selector 를 `getByRole('link|button', { name: ... })` 로 완화 또는 마크업 grep 결과에 맞춰 정확화.

### Step C — login submit ECONNREFUSED 처리

대상: `e2e/login.spec.ts › shows error on empty submit`.

조건부 진행:
- Step A 적용 후 재실행. fail 사라지면 종료.
- 여전히 ECONNREFUSED 면 `page.route('**/api/v1/**', route => route.abort())` 추가 + `required` HTML 속성 검증만 남김.

### Step D — 로컬 전체 실행 + push

```bash
npx playwright test --reporter=list   # 전체 spec GREEN 확인
git push origin feature/e2e-debt
gh pr create --base main --title "🐛 fix(e2e): 라벨 중복·outdated 셀렉터·backend 의존 정리"
```

CI `e2e` 잡 GREEN 확인 후 머지.

---

## 5. Verification

### 5.1 자동 검증

- [ ] `npx playwright test` 로컬 실행 — 모든 spec PASS (또는 명시적 skip)
- [ ] `npx playwright test --reporter=list` 출력에 `failed` 0
- [ ] PR CI `e2e` 잡 conclusion = `success`
- [ ] `gh pr view N --json mergeStateStatus` → `CLEAN` (또는 `HAS_HOOKS` — 모두 mergeable)

### 5.2 수동 검증

- [ ] LoginPage 두 form 모두 정상 동작 (regression 없음)
- [ ] LandingPage 비-영문 i18n 도 e2e 영향 없음
- [ ] 메인 SPA 빌드 영향 0 (`npm run build` 동일)
- [ ] vitest 1315 tests 영향 없음

---

## 6. Rollback

본 사이클 변경은 **e2e/*.spec.ts 4개 파일에 한정**. revert 단순:

```bash
git revert <commit-hash>
git push origin main
```

메인 SPA 코드(0 line 변경) 영향 없음. PDCA 메모만 status 되돌리면 됨.

---

## 7. Risks / Open Questions

### 7.1 Risks

| 위험 | 가능성 | 완화 |
|------|-------|------|
| Step B 분기에서 i18n 강제가 SPA 의 다른 hydration 흐름을 깨트림 | 낮음 | `addInitScript` 는 페이지 로드 전 실행되므로 안전. 회귀 테스트 시 dev server 동시 실행. |
| Step C 의 `page.route` mock 이 향후 실제 backend 통합 e2e 에서 제거되어야 함 | 중간 | spec 주석에 `// TODO(e2e-backend-integration)` 명시. |
| 메모리에 따르면 라벨 중복은 i18n 4개 언어 영향 — 미래 라벨 변경시 회귀 가능 | 낮음 | id-기반 selector 채택으로 라벨 텍스트 자체에서 분리. |

### 7.2 Open Questions

1. **`e2e-backend-integration` 별도 사이클 시작 시점**: 본 사이클 머지 직후 / 별 PR 후 / 보류 — 사용자 결정 필요.
2. **i18n-aware e2e 패턴 표준화**: localStorage seed vs URL query (`?lang=en`) — 사용자 선호.
3. **e2e CI 시간 한계**: 현재 1m9s. backend 통합 후 ~5min 예상. lighthouse 와 동시 실행할지 직렬 실행할지.

---

## 8. Out of Scope

- 신규 e2e 시나리오 (커버리지 확장)
- Visual regression (screenshot baseline)
- Rails CI 통합
- Playwright 버전 업그레이드
- LoginPage / LandingPage / MagicLinkVerifyPage 마크업 변경 (단, Step B/C 진단 결과 마크업 측 결함이면 별건 chore commit 분리)

---

## 9. Memory References

- `feedback_split_cycle_principle.md` — 분리 사이클 룰
- `project_goodman_gls_identity.md` — GSSA(EAN/MPL) 정체성
- `project_smart_quote_scope.md` — UPS/DHL Express 전용 (본 사이클 영향 없음, 메모만 보존)
