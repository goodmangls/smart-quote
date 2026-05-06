---
template: design
version: 1.0
description: apps/insights 를 bridgelogis.com/insights/ 로 노출 + /insights/admin/** Admin 게이트
feature: insights-deploy
date: 2026-05-02
author: jhlim725
project: j-ways-smart-quote-system (smart-quote-main)
version_value: 0.1.0
---

# insights-deploy Design Document

> **Summary**: 사용자 결정 5/5 default 채택. 안 1A(rewrite) + app_metadata.role + 신규 Vercel 프로젝트 + 빈 골격 + 메인 SPA `/login` redirect. 본 사이클은 인프라(배포)와 인증 게이트만 다루고 콘텐츠/MDX/OG 등은 별 사이클.
>
> ⚠️ **정정 노트 (2026-05-05)** — 본 design 의 §27 "role 저장소 = `app_metadata.role` (Supabase server-set only)" 와 §67 "Supabase 클라이언트가 `bridgelogis.com` 에 cookie set → 동일 origin 자동 공유" 는 잘못된 전제. 메인 SPA 는 Rails JWT 사용, Supabase 클라이언트 import 0건. 인증 architecture 부분은 [`insights-admin-rails-auth`](../../01-plan/features/insights-admin-rails-auth.plan.md) 가 supersede — Rails JWT + httpOnly `bl_session` cookie + middleware fetch `/api/v1/auth/me`. 인프라(rewrite/배포/admin shell/Next 15) 부분은 그대로 유효.
>
> **Project**: j-ways-smart-quote-system (smart-quote-main)
> **Status**: Superseded (인증 부분만, by `insights-admin-rails-auth`)
> **Planning Doc**: [insights-deploy.plan.md](../../01-plan/features/insights-deploy.plan.md)

---

## 1. Decisions (Open Questions 답변)

| # | 질문 | 결정 | 영향 |
|---|------|------|------|
| 1 | 도메인 | **안 1A — `bridgelogis.com/insights/` rewrite** | 메인 vercel.json rewrites 변경 1개 |
| 2 | role 저장소 | **`app_metadata.role`** (Supabase server-set only) | 미들웨어 검증 단순, 변조 불가 |
| 3 | Vercel 프로젝트 | **신규 `smart-quote-insights` 등록** | Vercel CLI 또는 UI 1회 작업 |
| 4 | Admin 1차 범위 | **빈 골격** (layout + 빈 dashboard + login redirect 페이지) | 본 사이클 size 작게 유지 |
| 5 | 미인증 redirect | **메인 SPA `/login`** | UX 일관, 인증 흐름 단일화 |

---

## 2. Architecture

### 2.1 트래픽 흐름 (목표)

```
사용자 → bridgelogis.com/insights/                      → smart-quote-insights (Next.js)
사용자 → bridgelogis.com/insights/admin/                → smart-quote-insights middleware
                                                          ├─ 미인증 → 302 → bridgelogis.com/login?redirect=/insights/admin
                                                          └─ admin → 통과
사용자 → bridgelogis.com/                               → smart-quote-main (Vite SPA, 변경 없음)
사용자 → bridgelogis.com/login, /dashboard, /admin 등   → smart-quote-main (변경 없음)
```

### 2.2 Vercel 프로젝트 토폴로지

```
Vercel Org: jlinsights-projects
├── smart-quote-main      (기존)
│   ├── Domain: bridgelogis.com (production), smart-quote-main.vercel.app (preview)
│   ├── Framework: Vite
│   └── vercel.json rewrites: /insights/(.*) → smart-quote-insights, /(.*) → /index.html
└── smart-quote-insights  (신규)
    ├── Domain: smart-quote-insights.vercel.app (rewrite 대상)
    ├── Framework: Next.js
    ├── Root Directory: apps/insights
    ├── Install Command: cd ../.. && npm install
    ├── Build Command: cd ../.. && npm run insights:build (또는 next build)
    └── Output Directory: .next
```

### 2.3 도메인/Cookie 공유 모델

- 사용자가 보는 URL 은 항상 `bridgelogis.com/insights/...` (rewrite 결과 가시 URL 변경 없음)
- Supabase 클라이언트는 `bridgelogis.com` 도메인에 cookie set → 동일 origin 이라 apps/insights middleware 가 자동 읽음
- subdomain 분리(`insights.bridgelogis.com`) 시 필요한 `cookieOptions.domain` 설정 **불필요** (안 1A 채택의 핵심 이점)

---

## 3. File Structure (목표)

```
apps/insights/
├── app/
│   ├── layout.tsx                      # 기존 (수정 없음)
│   ├── page.tsx                        # 기존 (수정 없음)
│   └── admin/
│       ├── layout.tsx                  # NEW — Admin shell (네비, 로그아웃)
│       ├── page.tsx                    # NEW — 빈 dashboard ("Insights Admin" + placeholder)
│       └── login/
│           └── page.tsx                # NEW — redirect-only 페이지 (즉시 메인 SPA /login 으로 이동)
├── lib/
│   └── auth/
│       ├── supabase-server.ts          # NEW — @supabase/ssr cookie 어댑터 (서버 컴포넌트용)
│       └── require-admin.ts            # NEW — role 검증 helper
├── middleware.ts                       # NEW — /admin/** 게이트
├── next.config.mjs                     # 기존 (수정 없음)
├── package.json                        # 수정 — @supabase/ssr 추가
└── README.md                           # 수정 — 배포·admin 운영 섹션 추가

vercel.json                             # 수정 — rewrites 에 /insights/(.*) 추가 (순서 중요)
```

---

## 4. Implementation Specs

### 4.1 `vercel.json` 변경

**현재**:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**변경**:
```json
{
  "rewrites": [
    { "source": "/insights",        "destination": "https://smart-quote-insights.vercel.app/insights" },
    { "source": "/insights/(.*)",   "destination": "https://smart-quote-insights.vercel.app/insights/$1" },
    { "source": "/(.*)",            "destination": "/index.html" }
  ]
}
```

**룰**:
- `/insights` 정확 매치 + `/insights/(.*)` 두 줄 모두 필요 (Vercel rewrites 패턴 한계)
- `/(.*)` 는 **마지막** (catch-all 이라 위에 있으면 모든 트래픽 흡수)
- destination 은 production URL 사용. preview 빌드는 Vercel 의 Preview Comments 가 자동으로 같은 PR 의 insights preview 와 매칭 (검증 필요).

### 4.2 신규 Vercel 프로젝트 등록 (smart-quote-insights)

CLI 또는 UI:
```bash
cd apps/insights
vercel link            # 신규 프로젝트로 연결
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
vercel --prod          # 첫 배포
```

**필수 env**:
- `NEXT_PUBLIC_SUPABASE_URL` (메인 SPA 의 `VITE_SUPABASE_URL` 과 동일 값)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (메인 SPA 의 `VITE_SUPABASE_ANON_KEY` 와 동일 값)

**Vercel UI 설정** (Project Settings):
- Root Directory: `apps/insights`
- Framework Preset: Next.js
- Build & Development:
  - Build Command: `cd ../.. && npm run insights:build`
  - Install Command: `cd ../.. && npm install`
  - Output Directory: `.next`
- Node.js Version: 20

### 4.3 `apps/insights/package.json` 수정

```json
{
  "dependencies": {
    "@supabase/ssr": "^0.5.0",
    "@supabase/supabase-js": "^2.45.0"
    /* 기존 deps 유지 */
  }
}
```

루트 `package.json` 의 `insights:build` 등 스크립트는 PR #7 에서 이미 추가됨 → 변경 불필요.

### 4.4 `apps/insights/lib/auth/supabase-server.ts`

```ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export function createMiddlewareClient(req: NextRequest, res: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          res.cookies.set({ name, value, ...options });
        },
        remove: (name: string, options: CookieOptions) => {
          res.cookies.set({ name, value: '', ...options });
        },
      },
    },
  );
}
```

### 4.5 `apps/insights/middleware.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from './lib/auth/supabase-server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient(req, res);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // 메인 SPA 의 로그인 페이지로 redirect (재돌아올 path 보존)
    const loginUrl = new URL('https://bridgelogis.com/login');
    loginUrl.searchParams.set('redirect', `/insights${req.nextUrl.pathname}`);
    return NextResponse.redirect(loginUrl);
  }

  const role = user.app_metadata?.role ?? user.user_metadata?.role;
  if (role !== 'admin') {
    return NextResponse.redirect(new URL('https://bridgelogis.com/'));
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*'],
};
```

**주의**:
- `matcher` 는 basePath(`/insights`) 가 *제거된* 경로 — Next.js 미들웨어가 basePath 를 자동 처리
- production redirect URL 은 `bridgelogis.com` 절대 경로. preview 환경에서는 별도 처리(Open Item 1)
- `app_metadata` 우선, `user_metadata` fallback. 운영에서는 admin role 을 server-set 으로 통일 권장.

### 4.6 `apps/insights/app/admin/layout.tsx`

```tsx
import type { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{ padding: '1rem 2rem', background: '#0b1e3f', color: '#fff' }}>
        <h1 style={{ margin: 0, fontSize: '1.125rem' }}>BridgeLogis Insights — Admin</h1>
      </header>
      <main style={{ padding: '2rem' }}>{children}</main>
    </div>
  );
}
```

### 4.7 `apps/insights/app/admin/page.tsx`

```tsx
export default function AdminDashboard() {
  return (
    <section>
      <h2>Dashboard</h2>
      <p>Admin shell placeholder. 콘텐츠 관리·draft 미리보기 등은 별 사이클(insights-admin-features) 에서 추가됩니다.</p>
    </section>
  );
}
```

### 4.8 `apps/insights/app/admin/login/page.tsx`

```tsx
import { redirect } from 'next/navigation';

export default function AdminLoginRedirect({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  // 미들웨어가 직접 메인 SPA /login 으로 보내므로 이 페이지는 fallback.
  const target = searchParams.redirect ?? '/insights/admin';
  redirect(`https://bridgelogis.com/login?redirect=${encodeURIComponent(target)}`);
}
```

---

## 5. Implementation Order (Step-by-step)

| Step | 작업 | 파일/명령 | 의존 |
|------|------|----------|------|
| 1 | `@supabase/ssr` + `@supabase/supabase-js` 추가 | apps/insights/package.json + `npm install` | — |
| 2 | `supabase-server.ts` 작성 | apps/insights/lib/auth/supabase-server.ts | 1 |
| 3 | `middleware.ts` 작성 | apps/insights/middleware.ts | 2 |
| 4 | Admin 영역 골격 3 파일 | apps/insights/app/admin/{layout,page}.tsx + login/page.tsx | — |
| 5 | apps/insights 로컬 dev 검증 | `cd apps/insights && npm run dev --port 3001` | 1-4 |
| 6 | Vercel 신규 프로젝트 `smart-quote-insights` 등록 | `vercel link` + UI 설정 + env | — (병렬 가능) |
| 7 | apps/insights 첫 production 배포 | `vercel --prod` | 6 |
| 8 | 메인 `vercel.json` rewrites 수정 | vercel.json | 7 (insights URL 확정 후) |
| 9 | smart-quote-main 배포 (메인 push 자동) | git push | 8 |
| 10 | bridgelogis.com/insights 동작 확인 | curl/browser | 9 |
| 11 | bridgelogis.com/insights/admin 게이트 확인 | non-admin / admin 두 케이스 | 9 |
| 12 | PR 생성 → merge → main | gh pr create | 11 |
| 13 | Gap 분석 | `/pdca analyze insights-deploy` | 12 |

---

## 6. Verification

### 6.1 자동 검증

- [ ] `apps/insights/npm run insights:type-check` PASS
- [ ] `apps/insights/npm run insights:build` PASS (Next.js production build)
- [ ] 로컬 `npm run dev` 에서 `/insights/` 200, `/insights/admin/` non-auth 시 redirect 동작
- [ ] PR CI 의 `check`(메인 SPA) 잡 PASS — 메인 SPA 회귀 0
- [ ] PR CI 의 `e2e` 잡 PASS — 라우팅 변경이 e2e 에 영향 없음

### 6.2 수동 검증 (Vercel preview / production)

- [ ] `bridgelogis.com/insights/` → apps/insights index 200
- [ ] `bridgelogis.com/insights/admin/` 미인증 시 `bridgelogis.com/login?redirect=/insights/admin` 으로 302
- [ ] 메인 SPA 에서 admin 로그인 후 `/insights/admin/` 접근 → 통과
- [ ] non-admin role 로그인 후 `/insights/admin/` 접근 → `/` 로 redirect
- [ ] 메인 SPA 라우트 모두 정상 (`/`, `/login`, `/dashboard`, `/quote`, `/admin`)
- [ ] 정적 자산 cache 헤더 정상 (`/assets/*` 31536000)

### 6.3 보안 검증

- [ ] middleware 가 모든 `/admin/**` 매치 (sub-route 포함)
- [ ] cookie 도메인 정상 — Supabase auth-token 이 apps/insights 미들웨어에서 읽힘
- [ ] role=admin 이 아닌 사용자가 직접 GET 으로 / admin 자산 시도 시 차단
- [ ] CSP/X-Frame-Options 헤더 유지 (next.config.mjs 의 SAMEORIGIN)

---

## 7. Rollback

본 사이클의 변경은 4개 영역으로 독립 revert 가능:

| 변경 | Rollback 방법 |
|------|--------------|
| `vercel.json` rewrites | git revert → 메인 SPA 가 다시 `/insights` 흡수 (랜딩 redirect 복귀) |
| Vercel 프로젝트 `smart-quote-insights` | Vercel UI 에서 프로젝트 삭제 또는 도메인 detach |
| apps/insights middleware/admin | git revert — apps/insights 자체는 미배포로 돌릴 수 있음 |
| @supabase/ssr 의존성 | `npm uninstall` 또는 revert |

전체 revert: PR squash 머지 commit 1회 revert.

---

## 8. Risks / Open Items

| 위험 | 가능성 | 완화 |
|------|-------|------|
| Vercel rewrites destination 에 외부 URL 사용 시 응답 시간 증가(+30~50ms) | 중간 | 본 사이클 후 모니터링. 필요시 monorepo 빌드(안 1B 변형)로 전환 |
| Supabase auth-token cookie SameSite 설정이 cross-rewrite 에 미동작 | 낮음 | 동일 origin 이라 안전. preview URL 에서 검증 |
| Preview deployment 가 production redirect URL(`bridgelogis.com`) 사용 → preview 에서 admin gate 가 production 으로 점프 | 중간 | `process.env.VERCEL_URL` / `VERCEL_ENV` 분기 — Open Item 1 |
| `@supabase/ssr` 버전 호환성 (Next.js 14 + React 19) | 낮음 | next 14.2.18 + ssr 0.5.x 호환 확인 |
| basePath `/insights` 와 middleware matcher 의 경로 해석 | 낮음 | Next.js 자동 처리. 로컬 검증 단계에서 확인 |

### Open Items (Do/Check 단계 처리)

1. **Preview/Production redirect URL 분기**: `VERCEL_ENV === 'production'` 시 `bridgelogis.com`, 그 외 `request.nextUrl.origin` 사용. 미들웨어 코드에 분기 추가.
2. **role 채우기**: 기존 사용자에게 `app_metadata.role` 가 비어 있으면 admin 통과 못 함. Supabase admin SDK 또는 SQL 로 admin 사용자에게 역할 부여 필요. 본 사이클은 게이트만 만들고 데이터 채우기는 운영 작업으로 분리.

---

## 8.5. Known Issue — Local Build Failure (Do 단계 발견)

**증상**: `cd apps/insights && npm run build` 가 일관되게 같은 chunk 좌표에서 실패:

```
Error: <Html> should not be imported outside of pages/_document.
    at x (.next/server/chunks/611.js:6:1351)
Error occurred prerendering page "/404" (또는 /500)
```

**시도한 8가지 변경 모두 동일 좌표 fail** (config 변경이 효과 없음 = root cause 가 config 가 아님):
1. webpack alias react/react-dom → apps/insights/node_modules
2. `app/not-found.tsx` 추가
3. `app/error.tsx` 추가
4. `app/global-error.tsx` 추가
5. layout.tsx 의 `<head>` + JSON-LD 제거
6. `output: 'standalone'`
7. `@next/mdx` wrapper 제거 + MDX 의존성 비활성화
8. `pageExtensions` 에 `js`, `jsx` 포함

**진단 결과**:
- root `node_modules/next` 없음 — duplicate next instance 아님
- root `react` 없음 — react resolve 깨끗 (apps/insights 내부)
- `pages/` 디렉토리 없음 — stray pages router 아님

**가설**: macOS 로컬 npm 의 monorepo `outputFileTracingRoot` 가 root `package-lock.json` 을 root 로 잡아서 trace 가 광범위하게 일어나고, 그 과정에서 어떤 의존성이 internal `_error.js` (Pages Router fallback) 을 user route 로 잘못 분류 → prerender 시점에 layout.tsx 의 `<html>` 과 충돌.

**결정**: 로컬 build 디버깅 중단. Vercel 환경에서 신규 프로젝트의 Root Directory = `apps/insights` 로 격리되어 빌드되면 root pollution 영향 없음 → Vercel preview 가 결정적 테스트.

**fallback**:
- Vercel preview build 도 실패 → 별 사이클 `insights-build-debt` 로 분리 (`outputFileTracingRoot` 명시, `transpilePackages` 점검, lockfile 재생성).
- Vercel preview build 성공 → 로컬 build 실패는 환경 specific 으로 archive 메모리에 기록(`reference_insights_local_build_quirk.md`).

**검증 통과 항목** (코드 자체는 정상):
- ✅ `apps/insights/npm run type-check` PASS
- ✅ Next.js compile 단계 PASS ("Compiled successfully in 8.0s")
- ✅ middleware/supabase-server/admin 3 파일 type 정상
- ❌ static page generation 단계만 실패

---

## 9. Out of Scope (재확인)

- 콘텐츠 이전(`output/phase3/pillars/*.mdx` → `apps/insights/content/`) — 별 사이클
- MDX 동적 라우팅 (`app/pillars/[slug]/page.tsx`) — 별 사이클
- OG 이미지 (`app/api/og/route.tsx`) — 별 사이클
- Admin 세부 기능(편집/draft/통계) — 별 사이클 `insights-admin-features`
- i18n 라우팅, sitemap, RSS endpoint — 별 사이클

---

## 10. Memory References

- `feedback_split_cycle_principle.md` — 4 Phase 를 1 사이클에 묶되 비범위 명확
- `reference_smart_quote_i18n_key.md` — 추후 Admin i18n 추가 시 'smartQuoteLanguage' 키 사용
- `reference_smart_quote_header_pattern.md` — Admin shell 의 `<header>` 마크업 stable selector 적용 (e2e 추가 시)
