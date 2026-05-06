---
title: insights admin gate — Rails JWT 재설계
status: PLAN (decisions confirmed)
author: jhlim725
created: 2026-05-05
decisions_confirmed: 2026-05-05
supersedes: docs/01-plan/features/insights-deploy.plan.md (인증 부분만)
related_pr: #9 (feature/insights-deploy) → close 후 신규 PR 로 대체
---

## 0. 배경 — 왜 재설계인가

`insights-deploy.plan.md:52-54` 가 메인 SPA AuthContext 를 "Supabase JWT 사용" 으로 잘못 기록했고, 그 위에서 design.md 가 "동일 origin Supabase cookie 자동 공유" architecture 를 세웠다. 실제 코드 사실:

| 영역 | plan/design 가정 | 실제 코드 |
|------|------------------|-----------|
| 메인 SPA 인증 | Supabase JWT | Rails JWT (HS256, `/api/v1/auth/login`) |
| Supabase 클라이언트 | `bridgelogis.com` 에서 cookie set | `src/` 전체 import 0건 |
| `app_metadata.role` | 변조 불가 권한 원천 | Rails `users.role` 이 단일 권한 원천 |
| `auth.users` 테이블 | admin user 데이터 채우기 필요 | 미사용. Rails `users` 가 SSOT |

→ 현재 `apps/insights/middleware.ts` 는 발급된 적 없는 Supabase cookie 를 검증한다. PR #9 머지 + Vercel env 설정 + admin user 생성 모두 거쳐도 게이트는 항상 `redirect /login` 만 반환.

본 plan 은 PR #9 의 코드 자산(Next 15 업그레이드, vercel.json rewrites, admin shell 골격)은 살리고 **인증 레이어만 Rails JWT 기반으로 교체**한다.

---

## 1. Goal

`bridgelogis.com/insights/admin/**` 접근 시 메인 SPA 와 동일한 Rails JWT 세션을 검증해 admin role 만 통과시키는 게이트를, **메인 SPA 인증 흐름 변경 없이** 구축한다.

성공 기준 (verifiable):
1. 비로그인 상태로 `/insights/admin` 접근 → `bridgelogis.com/login?redirect=/insights/admin` 으로 redirect
2. `role=admin` 사용자가 메인에서 로그인 → `/insights/admin` 진입 시 200, admin shell 렌더
3. `role=member` 사용자가 `/insights/admin` 접근 → `/dashboard` 로 redirect
4. preview deploy 에서도 동일 동작 (production URL 로 점프하지 않음)
5. 메인 SPA `/login`, `/signup`, `/quote`, `/admin` 등 기존 동작 0 회귀

---

## 2. Scope

### In scope
- `apps/insights/middleware.ts` 재작성 (Rails JWT 검증으로 교체)
- `apps/insights/lib/auth/` 디렉토리 재구성 (`@supabase/ssr` 제거, Rails 검증 모듈 추가)
- 메인 SPA `LoginPage.tsx` query param `?redirect=` 처리 추가 (현재는 `location.state.from` 만 봄)
- 메인 SPA 로그인 성공 시 Rails 가 httpOnly cookie 도 발급하도록 `auth_controller.rb` 변경 (옵션 1 채택 시)
- 또는 Rails `/api/v1/auth/me` endpoint 신설 (옵션 2 채택 시)
- `apps/insights/package.json` — `@supabase/ssr`, `@supabase/supabase-js` 제거, JWT lib 추가
- `apps/insights/next.config.mjs` — `^15.0.3` 캐럿을 `15.0.3` 핀으로 (선택)
- `package.json` (root) — `insights:build` 스크립트 추가 (선택, Codex #5 지적 반영)
- design.md, plan.md 의 잘못된 인증 전제 정정
- `.context/codex-session-id` 활용 후속 검증

### Out of scope (별도 사이클)
- 메인 SPA 의 Supabase Auth 마이그레이션 (필요 없음 — Rails JWT 유지)
- Supabase 프로젝트의 다른 활용 (만약 있다면 별도 식별)
- `insights-content-migration` (MDX), `insights-i18n-routing` (ko/en)
- 메인 SPA 의 `/admin` route 권한 체계 변경 (현행 React Context 기반 유지)
- `users.role` → 다른 권한 모델로의 일반화

---

## 3. Architecture — 인증 데이터 흐름

```
┌─────────────────────────┐
│ Browser (사용자)         │
│ origin: bridgelogis.com  │
└──────────┬──────────────┘
           │
           │ POST /api/v1/auth/login
           ▼
┌─────────────────────────┐
│ Rails API               │
│ (Render, *.onrender.com) │
│  1. JWT.encode(payload)  │
│  2. Set-Cookie:          │
│     bl_session=<token>;  │
│     Domain=.bridgelogis.com │
│     HttpOnly; Secure;    │
│     SameSite=Lax         │
└──────────┬──────────────┘
           │
           │ 응답 + JSON body 의 access/refresh 도 그대로 (메인 SPA 호환)
           ▼
┌──────────────────────────────────────────┐
│ Browser                                   │
│  - 메모리 access token: 메인 SPA 가 사용  │
│  - localStorage refresh: 메인 SPA 가 사용 │
│  - .bridgelogis.com cookie: 모든          │
│    bridgelogis.com 요청에 자동 부착        │
└──────────┬───────────────────────────────┘
           │
           │ GET /insights/admin
           ▼
┌─────────────────────────┐
│ Vercel main project      │
│ vercel.json rewrite:     │
│ /insights/* → smart-quote│
│  -insights.vercel.app    │
└──────────┬──────────────┘
           │ rewrite (Vercel proxy, 사용자 입장 same origin)
           │ Cookie 헤더에 bl_session 포함됨
           ▼
┌─────────────────────────┐
│ apps/insights middleware │
│  1. cookie('bl_session') │
│     읽기                  │
│  2. JWT.verify(secret)   │
│     OR fetch Rails /me   │
│  3. role === 'admin' ?   │
│     pass : redirect      │
└─────────────────────────┘
```

핵심 가정 (검증 필요):
- Vercel rewrites 를 통한 cross-project 호출에서 **브라우저는 단일 origin(`bridgelogis.com`) 으로 인식** → `.bridgelogis.com` cookie 가 자동으로 부착됨. 이는 Vercel docs 와 일치하지만 첫 배포 시 실측 필수.

---

## 4. 핵심 결정 포인트 (사용자 확인 필요)

### D1. middleware 검증 방식

| 옵션 | 동작 | 장점 | 단점 |
|------|------|------|------|
| **A. middleware 자체 JWT decode** | `jsonwebtoken` 으로 secret verify, `payload.role` 읽기 | 1 RTT, 빠름 (~5ms) | `secret_key_base` 를 Vercel env 에 추가 — secret 노출 표면 1 → 2 |
| **B. Rails `/api/v1/auth/me` 호출** | middleware 가 cookie 받아 Rails endpoint 로 forward, JSON 응답에서 role 확인 | secret 한 곳, Rails 가 단일 권한 진실 | admin 페이지 매 요청 1회 Rails 왕복 (~200-400ms Render Singapore) |
| **C. Hybrid** | middleware 가 JWT decode (만료/서명만) + Rails me 호출 (role 최신성) | 만료된 토큰은 즉시 차단, role 변경은 즉시 반영 | 복잡도 증가 |

**✅ 확정: B (2026-05-05).** 이유:
- secret 한 곳 — 운영 단순
- admin 페이지는 트래픽이 적음 — 200-400ms 지연 허용
- `users.role` 변경 즉시 반영 (JWT exp 15분 기다릴 필요 없음)
- middleware 코드 단순 (fetch + status check)

### D2. cookie 발급 방식

| 옵션 | 변경 | 장점 | 단점 |
|------|------|------|------|
| **A. Rails 가 httpOnly cookie 추가 발급** | `auth_controller#login` 응답에 `Set-Cookie: bl_session=<access>; Domain=.bridgelogis.com` | 브라우저 자동 전송, XSS 면역 | 메인 SPA 도메인이 `bridgelogis.com` 이어야 동작 (vercel.app preview 는 별도) |
| **B. 클라이언트가 `document.cookie` 로 set** | 메인 SPA 가 로그인 성공 후 token 을 cookie 로 복제 | 추가 백엔드 변경 0 | XSS 노출, JS-set cookie 는 httpOnly 불가 |

**✅ 확정: A (2026-05-05).** 이유:
- localStorage refresh + 메모리 access 패턴은 그대로 유지 (메인 SPA 회귀 0)
- httpOnly + Secure + SameSite=Lax 는 OWASP 권장
- Rails 변경: `auth_controller.rb` `render` 직전 `cookies.signed[...]` or `response.set_cookie(...)` 한 줄 추가
- preview 환경(`*.vercel.app`)에서는 cookie domain 매칭 안 됨 → D3=A 정책으로 preview 차단 (폴백 미구현)

### D3. preview 환경 admin 게이트 정책

| 옵션 | 동작 | 보안 |
|------|------|------|
| **A. preview 도 동일 게이트, cookie 없으면 401** | production 과 동일 — preview 에서는 admin 페이지 자체가 안 열림 | 가장 안전 |
| **B. preview 는 게이트 우회 (`VERCEL_ENV !== 'production'` 시 pass)** | preview QA 가 편함 | preview URL 노출 시 admin 페이지 무방비 |
| **C. preview 는 별도 토큰(`X-Preview-Auth: <static-secret>`)** | CI 자동 테스트 가능 | 토큰 관리 추가 |

**✅ 확정: A (2026-05-05).** 이유: Codex 지적 #9. preview 도 admin 은 잠그는 게 표준. QA 는 production cookie 를 import 하거나 메인 SPA 미리보기로 로그인 후 진행.

### D4. PR #9 처리 방식

| 옵션 | 동작 | 트레이드 |
|------|------|----------|
| **A. PR #9 force-push** | `feature/insights-deploy` 에 직접 새 커밋 + force-push | 히스토리 깔끔, 단일 PR |
| **B. fix-up 커밋 추가** | 기존 PR #9 위에 수정 커밋 쌓기 | force-push 위험 0, 히스토리 지저분 |
| **C. PR #9 close + 새 PR** | `feature/insights-admin-rails-auth` 신규 브랜치 | 의도 명확, plan 도 깨끗 |

**✅ 확정: C (2026-05-05).** 이유:
- PR #9 description/리뷰 댓글이 Supabase 전제 기반 — 새 PR 이 의도 전달에 유리
- 새 branch 는 `4e4f8a7` 부터 분기 (main 동기화 완료 시점)
- PR #9 는 close 시 "재설계로 대체 — see #N" 코멘트
- 신규 브랜치명: `feature/insights-admin-rails-auth`

---

## 5. 변경 파일 매트릭스

| # | 파일 | 변경 종류 | 설명 |
|---|------|-----------|------|
| 1 | `apps/insights/middleware.ts` | 재작성 | Rails JWT cookie 검증 |
| 2 | `apps/insights/lib/auth/supabase-server.ts` | 삭제 | 더 이상 미사용 |
| 3 | `apps/insights/lib/auth/rails-session.ts` | 신규 | cookie 추출 + Rails `/me` fetch (or JWT decode) |
| 4 | `apps/insights/app/admin/login/page.tsx` | 수정 | Supabase 의존 제거, 메인 `/login?redirect=...` 로 단순 redirect |
| 5 | `apps/insights/app/admin/layout.tsx` | 수정 | Supabase server client import 제거, server-side role 재검증 (선택) |
| 6 | `apps/insights/app/admin/page.tsx` | 수정 | 동일 |
| 7 | `apps/insights/package.json` | 수정 | `@supabase/ssr`, `@supabase/supabase-js` 제거. `next: 15.0.3` 핀 |
| 8 | `apps/insights/package-lock.json` | 재생성 | npm install |
| 9 | `apps/insights/.env.example` | 수정 | `NEXT_PUBLIC_SUPABASE_*` 제거, `RAILS_API_URL` 추가 |
| 10 | `smart-quote-api/app/controllers/api/v1/auth_controller.rb` | 수정 | login/refresh 응답에 httpOnly cookie 추가 |
| 11 | `smart-quote-api/config/application.rb` (또는 cors.rb) | 확인 | 이미 cookies middleware 활성화되어 있는지 |
| 12 | `smart-quote-api/spec/requests/api/v1/auth_spec.rb` | 수정 | cookie 발급 검증 추가 |
| 13 | `smart-quote-api/app/controllers/api/v1/users_controller.rb` 또는 신규 `me_controller.rb` | 신규/수정 | `GET /api/v1/auth/me` (옵션 D1=B 채택 시) |
| 14 | `src/pages/LoginPage.tsx` | 수정 | `useSearchParams().get('redirect')` 지원 |
| 15 | `vercel.json` (root) | 확인 | rewrites 순서 그대로, 추가 변경 0 가능성 높음 |
| 16 | `package.json` (root) | 수정 (선택) | `insights:build` 스크립트 추가 (Codex #5) |
| 17 | `docs/01-plan/features/insights-deploy.plan.md` | archive | 본 plan 으로 대체 표시 |
| 18 | `docs/02-design/features/insights-deploy.design.md` | 수정 | 인증 architecture 섹션 정정 |
| 19 | `.commit_message.txt` | 수정 | 한국어 한 줄 |

총 변경 ~13 파일 (소스) + ~6 파일 (문서/설정).

---

## 6. Implementation Steps (TDD 가능 단위)

### Step 1 — 결정 포인트 확정 (대화)
- 사용자에게 D1/D2/D3/D4 확인
- 결정 결과를 plan 문서 ## 4 에 update

### Step 2 — Rails 변경 (백엔드 먼저) ✅ DONE (2026-05-05)

구현 결과:
- `application.rb` cookies middleware 활성화 (Step 2a)
- `auth_controller.rb` — `set_session_cookie!` private helper + `include ActionController::Cookies` + login/refresh/register/verify_magic_link 4 곳에 cookie 발급 (Step 2b)
- `/api/v1/auth/me` 이미 존재 → 신설 불필요 (Step 2c 스킵)
- rspec: bl_session 7 examples 전부 GREEN, auth_spec 32 examples 중 30 GREEN (failures 2건은 pre-existing /me 평면응답 불일치 + magic_link mail enqueue debt)
- 회귀 0건 (94 examples 중 본 사이클 변경 책임 0)


#### 2a. `application.rb` cookies middleware 활성화
- 현재 `config.api_only = true` 로 cookies middleware 비활성. 수동 추가:
  ```ruby
  config.middleware.use ActionDispatch::Cookies
  ```
- 위치: `Application` 클래스 안, `config.api_only = true` 다음 줄
- **Verify**: rspec request spec 에서 `response.cookies["bl_session"]` 가 nil 아닌 값 반환 가능 여부

#### 2b. `auth_controller.rb` cookie 발급
- 기존 `login`, `refresh`, `register` action 의 `render json: ...` 직전 추가:
  ```ruby
  set_session_cookie!(token)
  ```
- private helper:
  ```ruby
  def set_session_cookie!(access_token)
    cookies[:bl_session] = {
      value: access_token,
      domain: session_cookie_domain,
      httponly: true,
      secure: Rails.env.production?,
      same_site: :lax,
      expires: 15.minutes.from_now
    }
  end

  def session_cookie_domain
    return :all if Rails.env.test? || Rails.env.development?
    ENV.fetch("SESSION_COOKIE_DOMAIN", ".bridgelogis.com")
  end
  ```
- logout endpoint 는 현재 controller 에 없음 — 별도 사이클(`auth-logout-endpoint`) 또는 본 plan §2 In scope 추가 시 `cookies.delete(:bl_session, domain: ...)` 포함
- **Verify**: rspec — login 성공 시 `Set-Cookie: bl_session=...; HttpOnly; SameSite=Lax`, login 실패 시 cookie 없음, refresh 시 cookie 회전

#### ~~2c. `GET /api/v1/auth/me` 신설~~ ✅ 이미 존재 (`auth_controller#me`, `routes.rb:9`, spec 84-114)
- 기존 endpoint 그대로 사용
- ⚠️ controller 응답이 `{ user: user_json(...) }` 형태인데 spec 은 `body["email"]` 평면 접근 — 본 사이클 작업이 spec/controller 불일치(별도 debt)에 영향받지 않도록 middleware fetch 시 `body["user"]?.role ?? body["role"]` 양쪽 호환 처리 (Step 3a)

### Step 3 — Next middleware 재작성 ✅ DONE (2026-05-05)

구현 결과:
- `apps/insights/lib/auth/rails-session.ts` 신규 (`fetchSessionUser` + 평면/wrapped 응답 호환)
- `apps/insights/lib/auth/rails-session.test.ts` 7 examples GREEN (cookie 미존재/평면/wrapped/401/network/malformed/env 누락)
- `apps/insights/middleware.ts` 재작성 — `fetchSessionUser` 호출, `user_metadata` fallback 제거 (Codex #6)
- `apps/insights/app/admin/page.tsx` UI 텍스트 정정 ("Supabase JWT" → "Rails JWT (httpOnly bl_session cookie)")
- `apps/insights/app/admin/login/page.tsx` 이미 메인 `/login?redirect=` 로 보내는 redirect-only 형태 — 변경 0
- `apps/insights/lib/auth/supabase-server.ts` 삭제
- `apps/insights/vitest.config.ts` 신규 (root config 의 setup path 충돌 회피)
- type-check 0 errors, middleware 컴파일 ✅


#### 3a. `apps/insights/lib/auth/rails-session.ts` 신규
- D1=B 채택 시:
  ```typescript
  import type { NextRequest } from 'next/server';

  export interface SessionUser {
    id: string;
    email: string;
    role: 'admin' | 'member' | string;
  }

  export async function fetchSessionUser(req: NextRequest): Promise<SessionUser | null> {
    const cookie = req.cookies.get('bl_session');
    if (!cookie?.value) return null;

    const apiUrl = process.env.RAILS_API_URL;
    if (!apiUrl) throw new Error('RAILS_API_URL not configured');

    try {
      const res = await fetch(`${apiUrl}/api/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${cookie.value}`,
          'X-Forwarded-For': req.headers.get('x-forwarded-for') ?? '',
        },
        cache: 'no-store',
      });
      if (!res.ok) return null;
      return (await res.json()) as SessionUser;
    } catch {
      return null;
    }
  }
  ```
- **Verify**: vitest unit — fetch mock 으로 200/401/network-error 3 케이스

#### 3b. `apps/insights/middleware.ts` 재작성
- 기존 Supabase 의존 제거
- 위 `fetchSessionUser` 호출 → null 이면 `/login?redirect=...` 로 redirect
- `user.role !== 'admin'` 이면 `/dashboard` 로 redirect
- `VERCEL_ENV` 분기는 redirect origin 결정에만 유지 (Codex 지적 #9 보완)
- **Verify**: e2e — preview 와 production 양쪽에서 비로그인/member/admin 3 케이스

#### 3c. `apps/insights/app/admin/login/page.tsx` 단순화
- 더 이상 자체 로그인 폼 없음 — useEffect 로 `window.location = '/login?redirect=/insights/admin'`
- 또는 정적 메시지 + 메인 로그인 링크
- **Verify**: render 테스트

### Step 4 — package.json 정리 ✅ DONE (2026-05-05)

- `apps/insights/package.json` — `@supabase/ssr`, `@supabase/supabase-js` 제거
- D1=B 채택으로 jsonwebtoken 추가 불필요
- next 핀(`15.0.3`)은 시도 후 React 19 stable peer 미인정 (Next 15.0.3 peer: `^18.2.0 || 19.0.0-rc-*`)으로 캐럿 유지로 회귀. lock 이 자동 15.5.x 잡음 (현재: `next@15.5.15`) — Codex #4 지적은 결과적으로 trade-off (캐럿 드리프트 vs React 19 stable 호환). 본 사이클은 호환성 우선
- root `insights:build` 스크립트는 별도 사이클(`monorepo-build-scripts`)로 미룸 — 본 사이클 scope 외
- **Verify**: `npm install` 통과, type-check 0 errors, middleware 컴파일 ✅, rails-session test 7/7
- **Pre-existing 회귀 아님:** 404/_error prerender 에러 — 515b6ac 커밋 메시지에 이미 명시 ("로컬 build 8회 시도 동일 좌표 fail, Vercel preview 가 결정적 테스트"). Disclaimer.test.tsx jsx preserve 충돌도 본 사이클 이전부터 존재 (root vitest config 가 apps/** exclude)

### Step 5 — 메인 SPA `LoginPage.tsx` redirect param 지원 ✅ DONE (2026-05-05)

구현 결과:
- `src/lib/safeRedirect.ts` 신규 — `resolveLoginRedirect` (화이트리스트 prefix `/insights`, `/dashboard`, `/quote`, `/admin`, `/schedule`, `/guide`, `/history`, `/notice`)
- `src/lib/safeRedirect.test.ts` 22 examples GREEN — boundary, 절대 URL, protocol-relative, javascript:/data:/vbscript:, backslash, query/hash 보존, 비화이트리스트 모두 검증
- `src/pages/LoginPage.tsx` — `useSearchParams()` 추가 + `resolveLoginRedirect` 호출. 로그인 성공 시 safe query redirect 우선 → state.from → admin/member default 순
- 메인 SPA 전체 vitest: 46 files / 1366 tests / 100% pass / **회귀 0건**


```typescript
const [searchParams] = useSearchParams();
const redirectParam = searchParams.get('redirect');
const fromState = (location.state as { from?: { pathname: string } })?.from?.pathname;
const redirectTo = redirectParam ?? fromState ?? '/dashboard';
// 로그인 성공 후 navigate(redirectTo)
```
- redirect URL 화이트리스트 검증 (open redirect 방어): `/insights/`, `/dashboard`, `/quote`, `/admin` 등 자기 도메인 path 만 허용
- **Verify**: vitest — 다양한 redirect 입력 (정상/외부 URL/스크립트) 검증

### Step 6.5 — Codex 재검증 blocker 5건 fix ✅ DONE (2026-05-05)

Codex 재검증(session 019df778 resume)에서 발견된 5 blockers 모두 해결:

| Blocker | 해결 |
|---------|------|
| **B1** `credentials: 'include'` 누락 | AuthContext 5 fetch (login/refresh×2/register/password) + authApi 2 (magic_link/verify) + apiClient (request + retry + refreshAccessToken) — 총 9 fetch 갱신 |
| **B2** Rails CORS `credentials: true` 미설정 | `cors.rb` `resource "*"` 블록에 `credentials: true` 추가 |
| **B3** API origin `*.onrender.com` ↔ `.bridgelogis.com` cookie domain mismatch | **사용자 인프라 결정 위임** (Step 7 옵션 A 추정) — Render Custom Domain `api.bridgelogis.com` 마이그레이션 필요. 코드는 옵션 A 가정 위에서 작성 |
| **B4** logout endpoint 미구현 | `routes.rb` `post "auth/logout"` + `auth_controller#logout` (`cookies.delete`) + `AuthContext.logout` async fetch + AuthContextType 시그니처 `() => void` → `() => Promise<void>` + rspec 2 GREEN + AuthContext.test.tsx 2 회귀 fix |
| **B5** `/insights/*` redirect는 SPA navigate가 아닌 full document load | `LoginPage.tsx` — `safeQueryRedirect` 가 `/insights` 또는 `/insights/...` 면 `window.location.assign`, 그 외 `navigate()` |

**검증 결과:**
- ✅ Rails auth_spec 34 examples / 32 GREEN (pre-existing OI-5/OI-6 2건만 fail, 회귀 0)
- ✅ logout rspec 2/2 GREEN
- ✅ 메인 SPA type-check 0 errors
- ✅ 메인 SPA vitest 46 files / **1366 tests / 100% pass / 회귀 0**
- ✅ AuthContext.test.tsx logout 시그니처 변경에 따른 await + fetch mock 회귀 fix 2건

### Step 6 — 문서 정정 ✅ DONE (2026-05-05)

archive 가 아닌 **정정 노트(in-place)** 방식 채택 — PR #9 코드 자산(Vercel rewrites, admin shell, Next 15) 은 살아있어 archive 부적절.

- `docs/01-plan/features/insights-deploy.plan.md` 상단에 ⚠️ 정정 노트 박스 추가 — "AuthContext: Supabase JWT 사용" 사실관계 오류 명시 + supersede 링크
- `docs/02-design/features/insights-deploy.design.md` 상단에 ⚠️ 정정 노트 박스 추가 + Status `Draft` → `Superseded (인증 부분만)`
- `CLAUDE.md` (메인 프로젝트) External APIs 표 — "Supabase: Authentication" 행 삭제, Rails Backend 행에 "**JWT 인증** (httpOnly `bl_session` cookie)" 명시 + dead config 노트 (cleanup 후보)

### Step 7 — 인프라 셋업 (사용자 작업) ⏸️ PENDING

**상세 절차:** [`insights-admin-rails-auth-runbook.md`](./insights-admin-rails-auth-runbook.md) §1 참조

- 1.1 Render — Rails Custom Domain `api.bridgelogis.com` (Codex B3 인프라 결정)
- 1.2 Render — `SESSION_COOKIE_DOMAIN` env (선택)
- 1.3 Vercel `smart-quote-main` — `VITE_API_URL` 변경
- 1.4 Vercel `smart-quote-insights` — `RAILS_API_URL` 신규
- 1.5 Rails `users.role = 'admin'` 사용자 준비

### Step 8 — E2E 검증 (배포 후) ⏸️ PENDING

**상세 시나리오:** [`insights-admin-rails-auth-runbook.md`](./insights-admin-rails-auth-runbook.md) §2 참조

- A. 비로그인 → `/login?redirect=...` redirect
- B. admin 로그인 → `/insights/admin` 200
- C. member 로그인 → `/dashboard` redirect
- D. logout 동작 (cookie 삭제 + 재접근 차단)
- E. preview 환경 admin 차단 (선택)

§3 단축 체크리스트 + §4 Rollback 절차 + §6 디버그 명령 runbook 에 포함.

---

## 7. Risks / Open Items

| # | 위험 | 완화 |
|---|------|------|
| 1 | Vercel cross-project rewrite 에서 cookie 가 실제로 전달되는지 첫 배포 전까지 100% 보장 어려움 | 별도 Step 7.5 로 "smoke test PR" — 빈 페이지에 cookie dump 만 출력해서 확인. fallback 으로 `Authorization: Bearer` 헤더도 시도하는 dual-path middleware |
| 2 | Render Singapore → Vercel global edge `/me` 왕복 200-400ms — admin 페이지 첫 로드 지연 | Vercel `region: 'icn1'` (Seoul) 강제 + Rails Render Singapore 는 ~50ms. 또는 D1=A (자체 JWT decode) 로 변경 |
| 3 | preview deploy URL `*.vercel.app` 에서 `.bridgelogis.com` cookie 못 받음 | D3=A 정책 — preview 는 admin 차단. QA 는 production cookie import 또는 임시 테스트 토큰 |
| 4 | Rails secret 변경 시 invalidation — 기존 cookie 가 다른 시점에 발급되었으면 verify 실패 | 정상 동작 (보안). 문서에 "secret rotate 시 모든 cookie 무효화됨" 명시 |
| 5 | Open redirect 취약점 — `?redirect=https://evil.com` 으로 피싱 | LoginPage 에서 path 화이트리스트 검증. URL 객체로 파싱 후 hostname 검사 |
| 6 | localStorage `smartQuoteRefresh` 와 cookie `bl_session` 만료 시점 비동기 — 한쪽만 살아있는 상태 | refresh 흐름에서 둘 다 갱신/삭제 동시 처리 (`auth_controller#refresh`, `#logout` 모두 cookie 조작) |
| 7 | `users.role` 변경 시 active session 즉시 반영 안됨 (JWT 만료까지 최대 15분) | D1=B (Rails me 호출) 채택 시 즉시 반영. D1=A 면 만료 대기 |
| 8 | apps/insights 가 SSR 페이지면 server component 에서도 `fetchSessionUser` 호출 필요 (admin layout) | `app/admin/layout.tsx` 에서 동일 함수 server-side 호출 + `notFound()` or `redirect()` |

### Open Items (사용자 결정 필요)

- ~~**OI-1.** D1, D2, D3, D4 결정 (§4)~~ ✅ 확정 (2026-05-05): D1=B, D2=A, D3=A, D4=C
- **OI-2.** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 가 메인 SPA 의 다른 기능에 쓰이고 있는가? (확인 결과 import 0건 — Supabase 자체가 dead config 가능성. 별도 cleanup 사이클로 분리)
- **OI-3.** `RAILS_API_URL` 의 정확한 production URL — 현재 메인 SPA 의 `VITE_API_URL` 과 동일한지 확인
- **OI-4.** Render 의 Rails 가 `/api/v1/auth/me` endpoint 를 만들 때 rate limit / cache 정책 — admin 페이지 매 navigation 마다 호출됨. Rails 측 `Rack::Attack` 또는 cache_store 활용 여부
- **OI-5 (pre-existing debt, 별도 사이클).** `auth_controller#me` 응답이 `{ user: ... }` 인데 spec 은 `body["email"]` 평면 접근 — 본 사이클 이전부터 fail. middleware 구현 시 양쪽 호환 (Step 3a). 원인 정리는 별도 `auth-spec-controller-alignment` 사이클
- **OI-6 (pre-existing debt).** `auth_spec.rb:175` magic_link enqueue mail 0건 — ActionMailer test 환경 큐 설정 추정. 본 사이클 무관
- **OI-7 (pre-existing debt).** `apps/insights` 로컬 `npm run build` 가 404/_error prerender 단계에서 fail — 515b6ac 커밋 메시지에 명시된 알려진 이슈. Vercel preview 가 결정적 테스트. 별도 `insights-build-prerender-fix` 사이클 후보
- **OI-8 (pre-existing debt).** `apps/insights/lib/components/Disclaimer.test.tsx` JSX `preserve` config 와 vite-plugin-react 충돌 — root vitest config 가 `apps/**` exclude 이라 root 에서는 안 돌고, apps/insights 에서는 fail. 본 사이클 이전부터 미작동. 별도 `insights-vitest-jsx-fix` 사이클
- **OI-9 (정리 후보).** `src/lib/urlSafety.test.ts` 가 이미 존재 — 본 사이클의 `safeRedirect.ts` 와 책임 중복 가능성. 별도 cleanup 사이클에서 통합 검토 (현재는 상호 독립적이므로 본 plan 진행에 차단 0)

---

## 8. Sequencing — 다른 사이클과의 관계

- **선행:** 없음. 본 plan 만으로 PR #9 대체 가능
- **취소:** `supabase-wiring` 사이클 (메모리 `project_smart_quote_insights_deploy_phase_a_done.md`) — Supabase 인증 미사용으로 불필요. 단, OI-2 결과에 따라 별도 `supabase-config-cleanup` 사이클로 변환 가능
- **후행:**
  - `insights-content-migration` (MDX 콘텐츠)
  - `insights-admin-features` (CRUD/draft)
  - `insights-i18n-routing` (ko/en)

---

## 9. 참고

- Codex consult session: `019df778-a958-7f73-a595-dbd381c35791` (16개 지적사항)
- 메인 SPA 인증 코드: `src/contexts/AuthContext.tsx`, `src/api/apiClient.ts`, `src/lib/authStorage.ts`
- Rails 인증 코드: `smart-quote-api/app/controllers/concerns/jwt_authenticatable.rb`, `smart-quote-api/app/controllers/api/v1/auth_controller.rb`
- 기존(잘못된 전제) plan/design: `docs/01-plan/features/insights-deploy.plan.md`, `docs/02-design/features/insights-deploy.design.md`
