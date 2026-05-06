# Plan: insights-deploy

> apps/insights 를 production 에 노출 — 콘텐츠 페이지는 public, `/insights/admin/**` 만 Admin 게이트

> ⚠️ **정정 노트 (2026-05-05)** — 본 plan §52-54 "AuthContext: Supabase JWT 사용"은 사실관계 오류. 메인 SPA 는 실제로 Rails JWT (`/api/v1/auth/login`) 를 사용하며, `src/` 전체에 Supabase 클라이언트 import 0건. 이 잘못된 전제 위에서 design.md §27, §67 이 "Supabase 동일 origin cookie 자동 공유" architecture 를 세웠음. 인증 게이트 부분은 [`insights-admin-rails-auth.plan.md`](./insights-admin-rails-auth.plan.md) 가 supersede (PR #9 close + 신규 PR 로 대체). Vercel rewrites, admin shell, Next 15 업그레이드 등 인프라 자산은 그대로 유효.

## 1. 개요

| 항목 | 내용 |
|------|------|
| Feature | insights-deploy |
| 우선순위 | High (PR #7 머지 후 사용자가 페이지 미가시 보고) |
| 영향 범위 | `apps/insights/`, `vercel.json`, 신규 Vercel 프로젝트 또는 monorepo 설정 |
| 시작일 | 2026-05-02 |
| 차단 | 없음 (PR #7 인프라 활용) |
| 사용자 결정 | 옵션 C — 공개 콘텐츠 + Admin 영역 분리 |

### 배경

PR #7(`feat(insights)`) 머지로 `apps/insights/` 스캐폴드는 main 에 있으나:

1. `apps/insights/.vercel/` 미존재 → **Vercel 별도 프로젝트 등록 안 됨**.
2. 메인 SPA `vercel.json` 의 rewrites:
   ```json
   { "source": "/(.*)", "destination": "/index.html" }
   ```
   가 `/insights` 까지 흡수 → React Router 의 catch-all `<Route path='*' element={<Navigate to='/' replace />} />` 가 **랜딩 페이지로 redirect**.
3. 결과: bridgelogis.com/insights 접속 시 메인 랜딩만 보임.

PR #7 본문에도 명시: "Vercel 배포: apps/insights를 메인 도메인 /insights/ 하위에 rewrite — **다음 PR**". 본 사이클이 그 다음 PR.

### 목표 (사용자 결정 옵션 C)

- **`/insights/` 및 `/insights/{콘텐츠}`** → **public** (SEO·OG·RSS 모두 활성)
- **`/insights/admin/**`** → **Admin only** (Supabase JWT + role=admin 게이트)
- 메인 SPA(`bridgelogis.com/`)는 그대로

## 2. 현황 진단

```
vercel.json (메인 SPA, smart-quote-main 프로젝트):
  rewrites: { "/(.*)": "/index.html" }
  → /insights 까지 SPA 가 흡수, App.tsx 의 * route 가 / 로 redirect

apps/insights:
  ✓ basePath: '/insights' (next.config.mjs)
  ✓ Next.js 14.2.18 + MDX + eslint-config-next
  ✗ @supabase/ssr 미설치 (admin 게이트에 필요)
  ✗ middleware.ts 없음
  ✗ app/admin/ 디렉토리 없음
  ✗ Vercel 프로젝트 미등록
```

AuthContext(`src/contexts/AuthContext.tsx`):
- `UserRole = 'admin' | 'user' | 'member'`
- Supabase JWT 사용 (env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)

## 3. 구현 범위

### Phase 1 — Vercel 배포 (Deploy)

#### 안 1A — 별도 Vercel 프로젝트 + 메인 프로젝트 rewrite

```
Vercel 프로젝트 1: smart-quote-main (기존, Vite SPA)
  vercel.json rewrites 추가:
    { "source": "/insights/(.*)", "destination": "https://smart-quote-insights.vercel.app/insights/$1" }
    { "source": "/(.*)", "destination": "/index.html" }   // 기존, 순서 뒤로
Vercel 프로젝트 2: smart-quote-insights (신규)
  Root Directory: apps/insights
  Framework: Next.js
  Install: cd ../.. && npm install
  Build: npm run build (apps/insights 워크스페이스)
```

**장점**: bridgelogis.com 단일 도메인 유지. Cookie 자동 공유.
**단점**: Vercel rewrites destination 으로 외부 URL 사용은 동작하지만 응답 시간 +30ms 추정. CSP 검증 필요.
**리스크**: rewrites 순서가 중요 — `/insights/(.*)` 가 `/(.*)` 보다 위에 와야 함.

#### 안 1B — Subdomain (insights.bridgelogis.com)

```
Vercel 프로젝트 1: smart-quote-main (변경 없음)
Vercel 프로젝트 2: smart-quote-insights
  Domains: insights.bridgelogis.com
  basePath 제거 (subdomain root)
```

**장점**: 단순. rewrite 불필요.
**단점**: Cookie 도메인 `.bridgelogis.com` 명시 필요. Supabase 클라이언트 cookie 옵션 수정 필요. SEO 분리 (`hreflang` / canonical 검토).

**기본 선택**: 안 1A. 사용자 결정 항목(Open Question 1).

### Phase 2 — Admin 영역 골격

```
apps/insights/
├── app/
│   ├── (public)/                # public 콘텐츠 그룹 (route group)
│   │   └── (기존 page.tsx 유지)
│   └── admin/
│       ├── layout.tsx           # Admin shell (네비, 로그아웃)
│       ├── page.tsx             # Admin 대시보드
│       ├── pillars/
│       │   └── page.tsx         # Pillar 목록 + draft 미리보기
│       └── login/page.tsx       # 미인증 시 redirect 대상
├── lib/
│   ├── auth/
│   │   ├── supabase-server.ts   # @supabase/ssr cookie 어댑터
│   │   └── require-admin.ts     # role 검증 helper
└── middleware.ts                # /insights/admin/** 게이트
```

### Phase 3 — Middleware 인증 게이트

`apps/insights/middleware.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  // /insights/admin/** 만 게이트 (basePath 제거된 path 기준)
  if (!req.nextUrl.pathname.startsWith('/admin')) return NextResponse.next();

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n) => req.cookies.get(n)?.value,
        set: (n, v, o) => res.cookies.set({ name: n, value: v, ...o }),
        remove: (n, o) => res.cookies.set({ name: n, value: '', ...o }),
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/insights/admin/login', req.url));

  // role 확인 — users 테이블 또는 user_metadata
  const role = user.user_metadata?.role ?? user.app_metadata?.role;
  if (role !== 'admin') return NextResponse.redirect(new URL('/', req.url));

  return res;
}

export const config = {
  matcher: ['/admin/:path*'],
};
```

### Phase 4 — Cookie 공유 검증

- 메인 SPA (`bridgelogis.com/`) 가 Supabase 로그인 시 set 한 cookie (`sb-{ref}-auth-token`) 가
- apps/insights (`bridgelogis.com/insights/...`) 미들웨어에서 동일 도메인이라 자동 읽힘 (안 1A 채택 시).
- 안 1B(subdomain)면 Supabase 클라이언트 `cookieOptions: { domain: '.bridgelogis.com' }` 필요.

## 4. 구현 순서

1. **Plan 문서 작성** ← 현재 단계
2. **Design**: Open Questions 5건 답변, 단계 분리(B/C 별 사이클 여부) 결정
3. **Phase 1 (Deploy)**:
   - apps/insights/vercel.json (또는 Vercel UI 설정)
   - smart-quote-main vercel.json rewrites 추가
   - 신규 Vercel 프로젝트 등록 + env (`NEXT_PUBLIC_SUPABASE_URL`, `..._ANON_KEY`)
   - bridgelogis.com/insights 동작 확인
4. **Phase 2~3 (Admin)**:
   - `@supabase/ssr` 의존성 추가
   - `apps/insights/middleware.ts` + `app/admin/login/page.tsx` 골격
   - role 검증 (user_metadata vs DB users 테이블 — design 결정)
5. **로컬 검증**: `apps/insights` 의 `npm run dev --port 3001` 로 admin 게이트 동작
6. **PR 생성** → Vercel preview 배포에서 시나리오별 동작 확인
7. **Gap 분석**

## 5. 검증

- [ ] `bridgelogis.com/insights/` → apps/insights index 정상 노출 (200)
- [ ] `bridgelogis.com/insights/admin/` 미인증 → `/insights/admin/login` 또는 `/login` 리다이렉트
- [ ] 메인 SPA 에서 admin 로그인 → `/insights/admin/` 접근 시 통과
- [ ] non-admin role 로그인 → `/` 또는 forbidden 페이지
- [ ] 메인 SPA 모든 라우트 (`/`, `/login`, `/dashboard`, `/quote`, `/admin`) 정상 동작 (rewrite 회귀 0)
- [ ] Vercel preview deployment 에서 동일 시나리오 PASS
- [ ] CSP/CORS 헤더 검증 — 메인 도메인 자산 공유 정상

## 6. 비범위 (이번 사이클에서 하지 않는 것)

- **콘텐츠 이전** (output/phase3/pillars/*.mdx → apps/insights/content/) — 별 사이클 `insights-content-migration`
- **MDX 동적 라우팅** (`app/pillars/[slug]/page.tsx`) — 별 사이클
- **OG 이미지 라우트** (`app/api/og/route.tsx`) — 별 사이클
- **Admin 세부 기능** (CRUD, draft preview, 통계) — 별 사이클 `insights-admin-features`. 본 사이클은 골격(layout + 빈 페이지) + 게이트만.
- **i18n 라우팅** (ko/en 분기) — 별 사이클
- **Sitemap / RSS endpoint** — 별 사이클

## 7. Open Questions (Design 단계 답변 필요)

1. **도메인 전략**: 안 1A(`bridgelogis.com/insights/` rewrite) vs 안 1B(`insights.bridgelogis.com`)?
2. **role 저장소**: Supabase `user_metadata.role` vs `app_metadata.role` vs 별도 `users` 테이블?
3. **Vercel 프로젝트 분리**: 본 사이클에서 신규 프로젝트 등록(권장) vs 메인 프로젝트 monorepo 빌드?
4. **Admin 영역 1차 노출 범위**: 빈 대시보드 골격만 vs 최소 1개 기능(예: pillar 목록)?
5. **Admin 게이트 미인증 redirect**: 메인 SPA `/login` (기존 인증 흐름 활용) vs apps/insights 자체 `/insights/admin/login`?

## 8. 후속 작업 후보

| 작업 | 트리거 |
|------|--------|
| Design 문서 | 본 plan 후 (Open Questions 답변) |
| 구현 | Design 후 `/pdca do` |
| Gap 분석 | 구현 후 `/pdca analyze` |
| `insights-content-migration` 별 사이클 | 본 사이클 머지 후 |
| `insights-admin-features` 별 사이클 | Admin 골격 안정화 후 |
| `insights-i18n-routing` 별 사이클 | 콘텐츠 이전 후 |

## 9. 메모리 참조

- `feedback_split_cycle_principle.md` — 큰 작업은 작은 사이클로 분리
- `feedback_recommendation_echo.md` — 사용자 옵션 C 선택은 본 사이클 승인 신호
- `reference_smart_quote_i18n_key.md` — i18n key 'smartQuoteLanguage' (Admin 영역 i18n 처리 시 참고)
- `reference_smart_quote_header_pattern.md` — Header role=banner 패턴 (Admin shell 설계 시 참고)
