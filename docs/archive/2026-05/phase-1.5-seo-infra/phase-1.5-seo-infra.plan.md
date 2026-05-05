# Plan: phase-1.5-seo-infra

> Phase 1.5 — BridgeLogis Insights(Phase 2) 선결 조건 해소 (SEO 인프라 + Deep-link prefill)

> **사후 작성**: 본 문서는 PR #3 머지 후 작성됨. 구현이 먼저 완료되어 PDCA 정합성 회복 목적의 사후 Plan 문서.

## 1. 개요

| 항목 | 내용 |
|------|------|
| Feature | phase-1.5-seo-infra |
| 우선순위 | High (Insights 도입 차단 요소) |
| 영향 범위 | Frontend 신규 7 + 수정 5, Vercel 라우팅 |
| PR | [#3](https://github.com/jlinsights/smart-quote/pull/3) |
| 브랜치 | `feature/phase15-seo-infra` |

### 배경

BridgeLogis Insights(Phase 2 — daily-brief / news article 페이지) 도입 전 검색 노출 인프라가 부재했다. 두 가지 선결 조건이 있었다.

1. **검색 인덱싱 가능성** — robots.txt, sitemap.xml, structured data가 없으면 Insights 페이지가 검색 결과에 노출되지 않는다.
2. **CTA → 견적 진입 경로** — daily-brief CTA(`/quote?origin=KR&dest=US&weight=10&...`)에서 견적 입력이 자동으로 채워져야 전환율이 의미 있게 측정 가능하다.

## 2. 구현 현황 (완료)

### SEO 인프라 (commit `8b7d460`)

| 구성요소 | 상태 | 파일 |
|----------|:----:|------|
| `robots.txt` (sitemap 위치 + admin/api 차단) | ✅ | `public/robots.txt` |
| 동적 `sitemap.xml` (Vercel Edge Function) | ✅ | `api/sitemap.ts` |
| JSON-LD NewsArticle schema 컴포넌트 | ✅ | `src/components/seo/JsonLdNewsArticle.tsx` |
| SEO 회귀 검출 스크립트 (baseline/compare) | ✅ | `scripts/seo-audit.mjs` |
| Vercel rewrites + cache headers | ✅ | `vercel.json` |
| Lighthouse multi-page + SEO 0.90 error gate | ✅ | `lighthouserc.json` |
| `seo:audit/baseline/compare` npm scripts | ✅ | `package.json` |

### Deep-link Prefill (commit `0be694a`)

| 구성요소 | 상태 | 파일 |
|----------|:----:|------|
| URL → `Partial<QuoteInput>` 파서 hook | ✅ | `src/features/quote/hooks/useQuoteDeepLink.ts` |
| 단위 테스트 | ✅ | `src/features/quote/hooks/useQuoteDeepLink.test.ts` |
| QuoteCalculator 1회 prefill 적용 | ✅ | `src/pages/QuoteCalculator.tsx` |

## 3. 구현 범위

### 지원 URL 파라미터

```
/quote?origin=KR&dest=US&zip=90001&weight=10&L=50&W=40&H=30&carrier=UPS&qty=1
       &utm_source=insights&utm_medium=inline-cta
```

| 파라미터 | 타입 | 비고 |
|----------|------|------|
| `origin` / `dest` | ISO2 / 공항코드 | ICN→KR, LAX→US 등 별칭 매핑 |
| `zip` | string | 미국/캐나다 EAS/RAS 자동 감지 트리거 |
| `weight` / `L`/`W`/`H` | number | 잘못된 값은 silent drop |
| `carrier` | UPS \| DHL | 이외 무시 |
| `qty` | number | 기본 1 |
| `utm_*` | — | 본 hook에서 무시 (GA4/GTM 자동 처리) |

### 동작 원칙

- **1회 적용**: 초기 마운트 시에만 prefill, 이후 사용자 입력이 우선
- **Fail-safe**: 잘못된 값이 throw 없이 무시 (UX 유지)
- **별칭 매핑**: 공항코드(IATA 3-letter) → ISO2 country (ICN/GMP/PUS→KR, LAX/JFK/ORD→US, NRT/HND/KIX→JP 등)

## 4. 검증 (PR Test plan)

- [ ] `npm run build` 통과
- [ ] `npx vitest run src/features/quote/hooks/useQuoteDeepLink.test.ts` 통과
- [ ] `/quote?origin=KR&dest=US&...` 접속 시 입력 자동 채움
- [ ] 잘못된 파라미터(`weight=abc`) 무시
- [ ] Vercel preview에서 `/sitemap.xml` 200 OK
- [ ] `/robots.txt` 200 OK
- [ ] Lighthouse SEO ≥ 0.90

## 5. 후속 작업

| 작업 | 트리거 |
|------|--------|
| Design 문서 (`docs/02-design/features/phase-1.5-seo-infra.design.md`) | 본 plan 후 `/pdca design` |
| Gap 분석 | Design 작성 후 `/pdca analyze` |
| Insights(Phase 2) 도입 | 본 PR 머지 후 별도 사이클 |
