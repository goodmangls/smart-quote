# Plan: smart-quote-e2e-debt

> 메인 SPA Playwright e2e 잡 GREEN화 — 라벨 중복(login) + landing hero 셀렉터 + backend 의존 fail 정리

## 1. 개요

| 항목 | 내용 |
|------|------|
| Feature | smart-quote-e2e-debt |
| 우선순위 | Medium (CI signal noise + 회귀 커버리지) |
| 영향 범위 | `e2e/*.spec.ts` (4 files), `src/pages/LoginPage.tsx`, `src/pages/LandingPage.tsx` 일부 |
| 시작일 | 2026-05-02 |
| 차단 | 없음 (main 기반 독립) |
| 분리 출처 | PR #7(insights-scaffold) Check 단계 — `feedback_split_cycle_principle.md` 룰 적용 |

### 배경

PR #7(insights-scaffold) CI에서 `check` 잡이 처음으로 GREEN 되면서 그 뒤에 의존하던 `e2e` 잡이 처음 실행 → 9 tests fail / 5 spec files 영향. 이전엔 `check` fail 때문에 `needs: check`인 e2e가 항상 SKIPPED라 fail이 가려져 있었음(pre-existing debt).

main 브랜치 보호가 없어 mergeable이지만, 이후 모든 PR이 `mergeStateStatus: UNSTABLE`로 떠 신호/노이즈 비율 악화. 회귀 검출 능력 0.

### 원인 인벤토리 (PR #7 e2e 실행 결과)

| # | spec | 실패 패턴 | 추정 원인 |
|---|------|----------|----------|
| 1 | `landing.spec.ts › displays hero section and navigation` | `getByText(/WCA.*MPL.*EAN.*JCtrans/) element(s) not found` | Landing 텍스트 변경(BridgeLogis 마이그레이션 이후) 또는 i18n 분기에서 영문이 사라짐 |
| 2 | `login.spec.ts › displays login form` | `getByLabel(/email/i) resolved to 2 elements` (strict mode violation) | LoginPage에 email input 2개 (이메일 + 매직 링크?) 또는 SignUp form이 동일 페이지에 같이 렌더 |
| 3 | `login.spec.ts › shows error on empty submit` | 동일 + `apiRequestContext.post: connect ECONNREFUSED ::1:3000` | (1) 라벨 중복 (2) Rails backend(::1:3000) 미가동 |
| 4 | `accessibility.spec.ts › login page form has proper labels` | 동일 라벨 중복 | (2)와 동일 |
| 5 | `magic-link-auth.spec.ts` | 다수 fail | 미확인 — design 단계에서 inspection |

ECONNREFUSED는 `e2e/login.spec.ts`의 form submit이 실제 Rails API로 POST를 시도하는 흐름 때문 — CI에는 Rails 서비스가 없음.

## 2. 현황 (PR #7 e2e run 25233354668)

```
e2e          fail   1m9s   https://github.com/jlinsights/smart-quote/actions/runs/25233354668/job/73994012740
check        pass   52s    (lint + tsc + vitest 1315 tests)
lighthouse   pass   56s
```

Test Files: 4 fail (accessibility, landing, login, magic-link-auth) / 다른 1 file pass 추정.

## 3. 구현 범위

### 안 1 — Login 페이지 라벨 중복 해소 (우선)

**파일**: `e2e/login.spec.ts`, `e2e/accessibility.spec.ts`, (필요 시) `src/pages/LoginPage.tsx`

**진단 방법**:
1. LoginPage 마크업 확인 — email input이 정말 2개인지(매직 링크/일반 로그인 분리 form?), signup link 영역에 별도 input이 있는지
2. 2개라면 라벨이 동일한지(예: 둘 다 `<label>Email</label>`) 확인

**해결 방향 (택일)**:
- (a) e2e 셀렉터를 `getByRole('textbox', { name: /email/i }).first()` 또는 form-scoped (`page.getByRole('form', {name: /sign in/i}).getByLabel(/email/i)`) 로 narrow.
- (b) LoginPage 라벨을 unique 하게(`Email address` vs `Magic link email`) 변경. 단 i18n 키(`src/i18n/translations.ts`) 동시 업데이트.

**리스크**: 낮음. e2e selector 변경이 우선(코드 영향 0). UI 라벨 변경은 i18n 4개 언어 영향 → 후순위.

### 안 2 — Landing hero 셀렉터 / 텍스트 동기화

**파일**: `e2e/landing.spec.ts`, (필요 시) `src/pages/LandingPage.tsx`

**진단 방법**:
1. LandingPage에서 `WCA / MPL / EAN / JCtrans` 텍스트 grep
2. 메모(`project_goodman_gls_identity.md`)에 따르면 핵심 정체성은 GSSA(EAN/MPL 회원). WCA / JCtrans 는 과거 정체성일 가능성 — 현재 마크업과 mismatch 가능성 높음

**해결 방향**:
- (a) e2e가 검색하는 텍스트를 현재 LandingPage의 *안정적인* 정체성 표지(예: `getByRole('heading', { level: 1 })` + `BridgeLogis` 또는 `GSSA` 텍스트)로 교체
- (b) 또는 LandingPage에 이 4개 멤버십 정체성을 명시적으로 다시 노출(브랜드 결정)

**리스크**: 낮음. (a)가 안전 기본값. (b)는 product 결정 필요 → 보류.

### 안 3 — Backend 의존 e2e 격리 (ECONNREFUSED)

**파일**: `playwright.config.ts`(검사), `e2e/login.spec.ts`, (선택) `.github/workflows/ci.yml`

**옵션**:
- (a) Playwright `page.route()` 로 `/api/v1/**` mock — 가벼움, 빠름. 본 사이클 추천.
- (b) CI에 Rails 서비스 추가 — 정확하나 e2e 시간 +수 분, 별도 사이클 가치.
- (c) Backend 의존 spec만 `test.skip()` 또는 별도 tag (`@backend`) → 본 e2e 잡에서 제외, 추후 통합.

**기본 선택**: (a). `shows error on empty submit` 시나리오는 form-validation(client) 만 검증하면 충분 — empty submit은 backend 도달 전 client에서 막혀야 정상.

**리스크**: 중간. mock 설계가 어색하면 false-positive. 단 본 사이클은 단순 client-side validation만 다룸.

### 안 4 — magic-link-auth.spec.ts 정밀 진단

**파일**: `e2e/magic-link-auth.spec.ts`

**진단 방법**: design 단계에서 spec 전문 + 실패 로그 정밀 확인 후 안 1/2/3 중 하나로 분류.

**리스크**: 미정 — design 후 결정.

## 4. 구현 순서

1. **Plan 문서 작성** ← 현재 단계
2. **Design 문서**: LoginPage 마크업 inspection + magic-link spec 전문 확인 + 4개 spec별 fix matrix 확정
3. **e2e 셀렉터/텍스트 fix** (안 1, 2, 4) — selector-only 변경 먼저
4. **Backend mock 적용** (안 3) — `page.route('/api/v1/**')`
5. **로컬 e2e 실행**: `npx playwright test --reporter=list` 전체 GREEN 확인
6. **PR 생성** → CI에서 e2e 잡 GREEN 검증
7. **Gap 분석 (`/pdca analyze smart-quote-e2e-debt`)**

## 5. 검증

- [ ] 로컬 `npx playwright test` 모든 spec PASS
- [ ] PR CI `e2e` 잡 GREEN
- [ ] PR `mergeStateStatus: CLEAN` 또는 `HAS_HOOKS` (UNSTABLE 탈출)
- [ ] backend 의존 흔적 0 (ECONNREFUSED 로그 없음)
- [ ] 셀렉터가 i18n/브랜드 변경에 둔감(role-based 또는 stable test-id)

## 6. 비범위 (이번 사이클에서 하지 않는 것)

- 신규 e2e 시나리오 추가 (커버리지 확장)
- Rails backend를 CI 서비스로 통합 (별도 사이클 `e2e-backend-integration` 후보)
- /quote, /dashboard, /admin, /schedule 흐름 e2e 신설
- Lighthouse 회귀 임계 강화
- Visual regression(playwright screenshots) 도입

## 7. 후속 작업

| 작업 | 트리거 |
|------|--------|
| Design 문서 | 본 plan 후 |
| 구현 | Design 후 `/pdca do` |
| Gap 분석 | 구현 후 `/pdca analyze` |
| `e2e-backend-integration` 별도 사이클 | 본 사이클 머지 후 (선택) |
| Visual regression | 본 사이클 안정화 후 |

## 8. 메모리 참조

- `feedback_split_cycle_principle.md` — PDCA Check에서 외부 차단·의도 cut만 남았으면 분리 사이클로 이관
- `project_goodman_gls_identity.md` — GSSA(EAN/MPL 회원). WCA/JCtrans 영향 점검
- `project_smart_quote_scope.md` — UPS/DHL Express 전용
