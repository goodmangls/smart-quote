# @bridgelogis/insights

> BridgeLogis Insights — 항공 화물·물류 인사이트 블로그
>
> Next.js 14 App Router subapp, basePath `/insights`, 한·영 콘텐츠 (Pillar 20 + Cluster 60)

## 개요

BridgeLogis 메인 SPA(`bridgelogis.com`)의 `/insights` 경로 하위에서 동작하는 별도 워크스페이스입니다. 메인 SPA는 견적 계산기/대시보드 중심이고, Insights 는 SEO·콘텐츠 중심으로 분리하여 다음을 달성합니다:

- 메인 번들 크기 영향 최소화 (Insights JS는 별도 청크)
- 콘텐츠 발행 사이클을 메인 코드 릴리즈와 분리
- Lighthouse SEO ≥ 0.90 게이트를 콘텐츠 페이지별로 검증
- MDX + JSON-LD(NewsArticle) + 동적 OG 이미지

## 디렉터리 구조

```
apps/insights/
├── app/
│   ├── layout.tsx              # 루트 레이아웃 (한국어 기본)
│   ├── page.tsx                # /insights 인덱스 페이지
│   ├── pillars/[slug]/
│   │   └── page.tsx            # Pillar 상세 페이지 (MDX 동적 로딩)
│   └── api/og/route.tsx        # 동적 OG 이미지 (@vercel/og)
├── lib/
│   ├── components/
│   │   ├── Disclaimer.tsx      # 면책 컴포넌트
│   │   ├── RelatedPillars.tsx  # 연관 Pillar 리스트
│   │   └── *.test.tsx          # Vitest 단위 테스트
│   ├── mdx.ts                  # MDX 파서/메타 추출
│   └── pillars.ts              # Pillar 인덱스 (slug → 메타)
├── content/
│   ├── ko/                     # 한국어 MDX (output/phase3/pillars/*.ko.mdx 복사본)
│   └── en/                     # 영어 MDX
├── public/
│   └── og/                     # 정적 OG 이미지 폴백
├── next.config.mjs             # basePath /insights, MDX, 보안 헤더
├── tsconfig.json
├── package.json
└── README.md
```

## 개발

```bash
# 워크스페이스 루트에서
npm install                            # 모든 워크스페이스 의존성 설치 (apps/insights 포함)
npm run insights:dev                   # http://localhost:3001/insights
npm run insights:build                 # 프로덕션 빌드 → .next/
npm run insights:type-check            # TS 타입 체크
```

## 라우팅

| 경로 | 콘텐츠 | 비고 |
|---|---|---|
| `/insights` | 인덱스 (한·영 토글) | 발행 Pillar 리스트 |
| `/insights/pillars/[slug]` | Pillar 상세 | MDX → HTML, JSON-LD, OG |
| `/insights/cluster/[slug]` | Cluster 상세 | Pillar에서 분기된 세부 주제 |
| `/insights/api/og` | 동적 OG 이미지 | `?title=...&category=...&lang=ko` |
| `/insights/api/sitemap` | 콘텐츠 sitemap.xml 부분 | 메인 sitemap에 포함 |

## 콘텐츠 발행 워크플로

1. Phase 3 산출물(`output/phase3/pillars/*.{ko,en}.mdx`)에서 시작
2. `npm run pillar:validate` 로 12-point 검증 통과 확인
3. `apps/insights/content/{ko,en}/pillars/` 로 이동
4. PR 생성 → CI 의 `pillar:validate` + `seo:audit` 통과 확인
5. main 머지 → Vercel 자동 배포

## SEO 체크리스트

- [ ] frontmatter `title`, `description`, `slug`, `pubDate`, `category`, `lang` 필수
- [ ] H2 ≥ 7 개 (스크롤 가독성)
- [ ] 내부 링크 ≥ 6 개 (메인 견적 계산기·다른 Pillar)
- [ ] AI 생성 표기 + 면책 disclaimer 포함
- [ ] JSON-LD `NewsArticle` 자동 주입
- [ ] OG 이미지 1200x630 (정적 또는 동적)
- [ ] `lang` 속성 정확 (한국어 ko, 영어 en)

## 의존성 정책

- React 19 (메인 SPA와 동일 버전 고정)
- TypeScript 5.8 (메인 SPA와 동일)
- 브라우저 storage API 사용 금지 (SSR 안정성)
- 외부 라이브러리는 `@next/mdx`, `gray-matter`, `remark-gfm`, `rehype-slug`, `@vercel/og` 만 허용

## 라이선스

내부 사용 (KS Ways / BridgeLogis)
