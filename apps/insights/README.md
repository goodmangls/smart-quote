# BridgeLogis Insights — Next.js 14 Subapp

> **Phase 2 scaffold** (2026-05-01 stub) — Phase 3 W2 (2026-05-11~)에 본격 구축

## 빠른 시작

```bash
cd apps/insights
npm install
npm run dev          # http://localhost:3001/insights
```

## 구조

```
apps/insights/
├── package.json           Next.js 14 + MDX + @vercel/og
├── tsconfig.json          basePath /insights, paths @/*
├── next.config.mjs        MDX + redirects + basePath
├── app/
│   ├── layout.tsx         Root layout (metadata + OG)
│   └── page.tsx           Hub (/insights) — stub
├── content/
│   └── briefs/            Daily Briefs MDX (Phase 3 W2~)
├── lib/                   Helper modules (content loader, OG, etc.)
└── public/
    └── fonts/             Noto Sans KR / Inter (Phase 2 W3)
```

## 프로덕션 배포

Vercel 동일 프로젝트에서 multi-build로 동작.
`vercel.json` rewrites로 `/insights/*` → 본 서브앱이 응답.
그 외 경로는 root Vite SPA가 응답.

## 의존성 설치 후 검증

```bash
cd apps/insights && npm install
npm run type-check   # tsc --noEmit
npm run lint
npm run build        # Next.js 14 build
```

## 다음 단계 (Phase 3 W2)

- [ ] BriefCard / QuickQuoteWidget / BottomCTA 컴포넌트 추가
- [ ] daily-brief/[date]/page.tsx 라우트
- [ ] topics/[slug]/page.tsx 토픽 허브
- [ ] api/og/route.tsx 동적 OG 이미지 (Phase 2 PoC 적용)
- [ ] 시범 brief 5건 MDX 작성
- [ ] 첫 LIVE 발행 (2026-05-04 D-Day)

## 가정

- [Assumption: root Vite 앱은 React 19, 본 서브앱은 React 18로 격리]
- [Assumption: Vercel multi-build 또는 Turborepo로 빌드 분리]
- [Assumption: 동일 Vercel 프로젝트 안에 호스팅하여 도메인 단일화]
