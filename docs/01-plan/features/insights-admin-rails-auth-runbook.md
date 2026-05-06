---
title: insights-admin-rails-auth — 사용자 작업 Runbook (인프라 + E2E 검증)
status: RUNBOOK
author: jhlim725
created: 2026-05-05
related_plan: docs/01-plan/features/insights-admin-rails-auth.plan.md
related_pr: feature/insights-admin-rails-auth (PR #9 close 후 신규)
---

> 본 runbook 은 코드 변경(Step 1~6.5) 완료 후 **사용자 직접 수행** 단계 — Step 7 인프라 + Step 8 E2E 검증.
> Codex 재검증 blocker 5건 fix 가 옵션 A(`api.bridgelogis.com`) 가정 위에 작성됐으므로 본 runbook 의 §1 인프라 셋업이 선결 조건.

---

## §1. Step 7 — 인프라 셋업 (사용자 직접 수행)

머지 전 또는 머지 직후 반드시 완료. 셋업 안 하면 admin gate 가 production 에서 동작하지 않음.

### 1.1 Render — Rails API Custom Domain `api.bridgelogis.com`

**목적:** 메인 SPA(`bridgelogis.com`) 와 Rails API 가 same first-party domain 이어야 `.bridgelogis.com` httpOnly cookie 흐름이 동작 (Codex B3).

**절차:**

1. **Render dashboard** → 프로젝트 `smart-quote-api` (또는 동일 Rails 서비스)
2. **Settings** → **Custom Domain** → **Add Custom Domain** → `api.bridgelogis.com`
3. **DNS** (도메인 등록업체에 추가):
   ```
   Type:  CNAME
   Name:  api
   Value: <Render 가 안내하는 *.onrender.com 호스트>
   TTL:   300
   ```
4. Render 가 자동으로 Let's Encrypt TLS 발급 — **5~15분 대기**
5. 검증: `curl -I https://api.bridgelogis.com/up` → `200 OK`, `Strict-Transport-Security` 헤더 확인

**Rollback:** Custom Domain 제거 → 메인 SPA 의 `VITE_API_URL` 을 기존 `*.onrender.com` URL 로 되돌림.

### 1.2 Render — Rails 환경 변수 추가/확인

| 변수 | 값 | 설명 |
|------|-----|------|
| `SESSION_COOKIE_DOMAIN` | `.bridgelogis.com` | (선택) 명시. 미설정 시 production 에서 default 같음 |
| `CORS_ORIGINS` | (기존 값 유지) | 이미 `https://bridgelogis.com` 포함 — 추가 변경 0 |

> Rails 코드는 `Rails.env.production?` 일 때 cookie domain 을 `.bridgelogis.com` 으로 자동 설정. `SESSION_COOKIE_DOMAIN` 명시는 옵션.

### 1.3 Vercel — `smart-quote-main` (메인 SPA) 환경 변수

| 변수 | 변경 | 설명 |
|------|------|------|
| `VITE_API_URL` | **`https://api.bridgelogis.com`** 로 변경 | production + preview 둘 다 |
| `VITE_SUPABASE_URL` | **삭제** (또는 유지 — dead config 이지만 다른 cleanup 사이클에서 처리 가능) | OI-2 |
| `VITE_SUPABASE_ANON_KEY` | **삭제** (동일) | OI-2 |
| `VITE_EIA_API_KEY` | (기존 값 유지) | |

### 1.4 Vercel — `smart-quote-insights` (apps/insights) 환경 변수 신규

| 변수 | 값 | 환경 |
|------|-----|------|
| `RAILS_API_URL` | `https://api.bridgelogis.com` | production + preview |
| `NEXT_PUBLIC_SUPABASE_URL` | **추가하지 말 것** | 삭제 대상 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **추가하지 말 것** | 삭제 대상 |

**Settings 확인:**
- Root Directory: `apps/insights`
- Framework: Next.js
- Build/Install/Output: default(empty) 유지 (Vercel 자동)

### 1.5 admin 사용자 준비 (Rails users 테이블)

Rails 의 `users.role = 'admin'` 사용자가 1명 이상 있어야 검증 가능.

**현재 admin 만드는 방법 — `auth_controller#promote` 사용:**
```bash
# ADMIN_PROMOTE_SECRET 은 Render env 에 설정되어 있어야 함
curl -X POST https://api.bridgelogis.com/api/v1/auth/promote \
  -H 'Content-Type: application/json' \
  -d '{"email":"YOUR_EMAIL","secret":"$ADMIN_PROMOTE_SECRET"}'
```

또는 Render Shell:
```bash
bin/rails runner "User.find_by(email: 'YOUR_EMAIL').update!(role: 'admin')"
```

---

## §2. Step 8 — E2E 검증 시나리오 (배포 후)

머지 + Vercel/Render 배포 완료 후 production 에서 4종 시나리오 실행.

### 시나리오 A — 비로그인 사용자가 admin 영역 접근 (gate 동작)

**Steps:**
1. Chrome incognito (cookie 0 상태)
2. `https://bridgelogis.com/insights/admin` 직접 입력
3. **기대:** `https://bridgelogis.com/login?redirect=%2Finsights%2Fadmin` 으로 redirect

**Pass 기준:**
- URL 이 `bridgelogis.com/login` 이고 query `redirect` 에 `/insights/admin` 포함
- LoginPage 가 정상 렌더 (한국어 UI, 로그인 form 노출)

**Fail 시 점검:**
- 쿠키가 다른 도메인에 있는지 — `document.cookie` 점검 (incognito 라 비어있어야)
- middleware 가 동작하는지 — Vercel `smart-quote-insights` Functions 로그 (`fetchSessionUser` 결과)
- `RAILS_API_URL` env 가 Vercel 에 설정되어 있는지

### 시나리오 B — admin 사용자 로그인 후 admin 영역 진입

**Steps:**
1. 시나리오 A 의 LoginPage 에서 admin 계정으로 로그인
2. **기대:** 자동으로 `/insights/admin` 으로 redirect (full document load)
3. `/insights/admin` 페이지 렌더 — "BridgeLogis Insights — Admin" 헤더 + dashboard placeholder

**Pass 기준:**
- 로그인 후 URL 이 `bridgelogis.com/insights/admin` (no `/login`)
- Admin shell UI 정상 렌더
- DevTools → Application → Cookies — `bl_session` httpOnly cookie 가 `.bridgelogis.com` 도메인에 보임

**Fail 시 점검:**
- Network 탭 → `/api/v1/auth/login` 요청 — `Set-Cookie: bl_session=...` 응답 헤더 있는지
- Network 탭 → `/api/v1/auth/me` 요청 (middleware fetch) — `200` + role=admin 응답
- Cookie domain 이 `.bridgelogis.com` 인지 (`api.bridgelogis.com` 만이면 cross-domain 흐름 깨짐)

### 시나리오 C — member 사용자가 admin 영역 시도

**Steps:**
1. member 계정(role=user 또는 role=member)으로 로그인
2. `https://bridgelogis.com/insights/admin` 직접 입력
3. **기대:** `https://bridgelogis.com/dashboard` 로 redirect

**Pass 기준:**
- URL 이 `bridgelogis.com/dashboard` (no `/insights/admin`)
- Member dashboard 정상 렌더

**Fail 시 점검:**
- middleware 가 role 을 정확히 읽는지 — Vercel Functions 로그
- `/api/v1/auth/me` 응답에 `role: 'user'` 또는 `'member'` 가 있는지

### 시나리오 D — logout 동작 확인

**Steps:**
1. 시나리오 B 직후 (admin 로그인 상태)
2. 메인 SPA 의 logout 버튼 클릭 (Header 또는 사용자 메뉴)
3. **기대:**
   - DevTools Cookies — `bl_session` 사라짐 (또는 `expires=Thu, 01 Jan 1970`)
   - localStorage `smartQuoteRefresh` 삭제
4. `https://bridgelogis.com/insights/admin` 재접근
5. **기대:** 시나리오 A 와 동일 — `/login?redirect=...` 로 redirect

**Pass 기준:**
- logout 후 cookie 자동 삭제
- 재접근 시 gate 가 다시 차단

**Fail 시 점검:**
- Network 탭 → `/api/v1/auth/logout` 요청 — 200 응답 + `Set-Cookie: bl_session=; expires=...` 헤더
- AuthContext 의 logout 이 fetch 호출하는지 (DevTools)

### 시나리오 E (선택) — preview 환경 admin 차단

**Steps:**
1. PR preview URL 직접 접근 — `https://smart-quote-insights-XXX.vercel.app/insights/admin`
2. **기대:** preview 의 `bridgelogis.com` cookie 없으므로 gate 차단 → preview origin 의 `/login` 로 redirect (cookie 없는 incognito 와 동일 흐름)

**Pass 기준:** D3=A 정책 — preview 도 동일 게이트 적용

---

## §3. 점검 체크리스트 (단축)

```text
인프라:
[ ] api.bridgelogis.com → Render Rails 응답 (curl /up = 200)
[ ] Vercel smart-quote-main: VITE_API_URL = https://api.bridgelogis.com
[ ] Vercel smart-quote-insights: RAILS_API_URL = https://api.bridgelogis.com
[ ] Rails users 테이블에 role=admin 사용자 1명 이상

배포:
[ ] origin/feature/insights-admin-rails-auth push 완료 → Vercel preview 빌드 통과
[ ] PR 머지 → main 자동 재배포
[ ] Render Rails 자동 재배포 (smart-quote-api/ 변경 감지)

E2E (production):
[ ] 시나리오 A — 비로그인 → /login redirect (gate 동작)
[ ] 시나리오 B — admin 로그인 → /insights/admin 200
[ ] 시나리오 C — member → /dashboard redirect
[ ] 시나리오 D — logout 후 재접근 차단
[ ] 시나리오 E (선택) — preview admin 차단

DevTools 검증:
[ ] bl_session cookie 가 .bridgelogis.com 도메인에 set 됨 (httponly + secure + samesite=lax)
[ ] /api/v1/auth/me 호출이 cookie + Bearer 모두 부착되어 200 응답
[ ] /api/v1/auth/logout 응답에 Set-Cookie: bl_session=; expires=... 포함
[ ] Network 탭 fetch 에 credentials="include" 표시
```

---

## §4. Rollback 절차

문제 발생 시 빠른 복구:

### 4.1 단순 revert
```bash
git revert <머지 커밋 SHA>
git push origin main
```
- Vercel + Render 자동 재배포
- supabase 인증 (이전 상태) 으로 롤백 — 단, 메인 SPA 인증은 이미 Rails 였으므로 메인 사용자 영향 0
- `/insights/admin` 은 다시 동작 안 함 (Supabase env 미설정 상태)

### 4.2 Custom Domain 롤백
- Render Custom Domain 제거 → DNS CNAME 제거
- Vercel `VITE_API_URL` 을 기존 `*.onrender.com` 으로 변경
- bl_session cookie 흐름 종료 (메인 SPA 는 Authorization 헤더로 계속 동작)

### 4.3 부분 hotfix
- 메인 SPA logout 만 문제면 — `AuthContext.logout` 의 fetch 호출 제거 → `clearAllTokens()` 만
- middleware 만 문제면 — `apps/insights/middleware.ts` 의 matcher 비활성화 (`config.matcher = []`) → admin 페이지가 모두 통과 (위험, 단기 우회)

---

## §5. 후속 사이클 후보 (본 runbook 외)

- `auth-cookie-credentials-fix` 가 본 사이클에 통합됨 → 별도 사이클 불필요
- `rails-api-subdomain-migration` (인프라) — 본 §1.1 작업 자체가 이 사이클의 핵심 결과물. 별도 사이클로 분리 가능
- `insights-vitest-jsx-fix` (OI-8) — Disclaimer.test.tsx pre-existing
- `insights-build-prerender-fix` (OI-7) — 404 prerender pre-existing
- `auth-spec-controller-alignment` (OI-5) — `/me` 응답 평면/wrapped 통일
- `monorepo-build-scripts` (OI-4/OI-5) — root `insights:build` + workspaces
- `supabase-config-cleanup` (OI-2) — `VITE_SUPABASE_*` env 정리
- `auth-jti-denylist` — logout 시 JWT 즉시 무효화 (현재는 만료까지 valid)

---

## §6. 빠른 디버그 명령

```bash
# Rails API 헬스
curl -i https://api.bridgelogis.com/up

# 로그인 + cookie 검증
curl -i -X POST https://api.bridgelogis.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASS"}'
# → Set-Cookie: bl_session=...; domain=.bridgelogis.com; httponly; secure; samesite=lax

# CORS preflight 확인
curl -i -X OPTIONS https://api.bridgelogis.com/api/v1/auth/login \
  -H 'Origin: https://bridgelogis.com' \
  -H 'Access-Control-Request-Method: POST'
# → Access-Control-Allow-Credentials: true

# /me 호출 (cookie + Bearer 양쪽)
curl -i https://api.bridgelogis.com/api/v1/auth/me \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -b 'bl_session=<ACCESS_TOKEN>'
# → 200 + { id, email, role }

# logout
curl -i -X POST https://api.bridgelogis.com/api/v1/auth/logout \
  -b 'bl_session=<ACCESS_TOKEN>'
# → Set-Cookie: bl_session=; expires=Thu, 01 Jan 1970 ...
```
