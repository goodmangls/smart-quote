---
name: BridgeLogis Design System (smart-quote-main)
version: 1.12.0
description: >-
  BridgeLogis by KS Ways 웹 애플리케이션의 디자인 시스템 명세.
  외부 운영 중인 SaaS(bridgelogis.com)의 단일 진실 공급원(SSOT).
  Phase 2 완료 (2026-04-24) — 레거시 jways-*/accent-* 전면 제거, brand-blue-*/cyan-* 로 통합.
references:
  tailwind: tailwind.config.cjs
  globals: src/index.css
  chart-colors: src/lib/chartColors.ts
  brand-memory: memory/project_bridgelogis_brand.md

# ─────────────────────────────────────────────
# COLORS — 3 레이어 (Brand / Semantic / Neutral)
# ─────────────────────────────────────────────
colors:
  # ═══ Brand (BridgeLogis 정본) — 신규 UI는 반드시 이 레이어 ═══
  navy: '#0A1628'              # 배경 60% — dark mode primary surface
  deep-blue: '#152347'         # 보조 20% — elevated surfaces, cards on navy
  brand-blue: '#1D6FD1'        # CTA 15% — primary actions, links, focus
  cyan: '#00B4D8'              # 시그니처 — feature highlights, brand mark
  gold: '#E8A838'              # 강조 5% — premium, 수상, 프리미엄 배지

  # ═══ Semantic (UI 의도) — 범용 상태 ═══
  success: '#10b981'           # emerald-500 — 완료·승인·저장 성공
  warning: '#f59e0b'           # amber-500 — 주의·임박·저마진
  destructive: '#ef4444'       # red-500 — 삭제·실패·오류
  info: '#1D6FD1'              # brand-blue 와 정렬 — 안내·툴팁

  # ═══ Neutral ═══
  gray-50: '#fafafa'
  gray-950: '#0a0a0a'
  # 중간 스케일은 tailwind.config.cjs 참조

# ─────────────────────────────────────────────
# TYPOGRAPHY
# ─────────────────────────────────────────────
typography:
  family:
    sans: 'Geist, ui-sans-serif, system-ui, sans-serif'
  weights:
    regular: 400
    medium: 500
    semibold: 700         # Geist SemiBold 가 700 로 로드됨 (src/index.css:20)
  # Scale 은 Tailwind 기본 사용 (text-xs ~ text-9xl)
  scale-note: |
    Typography scale 확장 없음. Tailwind 기본 스케일 사용.
    헤딩 UI 컴포넌트는 text-sm font-bold uppercase tracking-wider 패턴 선호
    (FscRateWidget, 기타 widget 참조).

# ─────────────────────────────────────────────
# LAYOUT
# ─────────────────────────────────────────────
layout:
  container-note: '풀블리드 + 내부 max-w-7xl 패턴. 대시보드는 grid-cols-12 기반.'
  spacing: '기본 Tailwind 8px scale 사용. 확장 없음.'
  radius:
    sm: 'rounded-md (6px)'
    md: 'rounded-lg (8px)'    # 기본 카드
    lg: 'rounded-xl (12px)'   # 위젯·대화상자
    full: 'rounded-full'       # 아바타·칩

# ─────────────────────────────────────────────
# DARK MODE
# ─────────────────────────────────────────────
dark-mode:
  strategy: 'Tailwind darkMode: "class" — <html class="dark"> 토글'
  body-surfaces:
    light: 'bg-gray-50 text-gray-800'
    dark: 'bg-gray-950 text-gray-200'
  coverage: '프로젝트 전역 dark: 변형 1,051곳 (2026-04-24 측정)'
  brand-in-dark:
    navy: 'dark bg 로 자연스럽게 어우러짐. 추가 조정 불필요'
    deep-blue: 'dark 에서는 deep-blue 자체가 카드 서피스로 기능'
    brand-blue: '라이트·다크 모두 DEFAULT(#1D6FD1) 유지. hover 는 brand-blue-600'
    cyan: '다크 모드에서 cyan-400 권장 (선명도 유지, 대비 개선)'
    gold: '다크 모드에서 gold-400 권장 (눈부심 완화)'
    success/warning/destructive: '다크 모드는 *-400 한 단계 밝게 (예: dark:text-success-400)'

# ─────────────────────────────────────────────
# CHARTS — HEX 직접 사용 영역
# ─────────────────────────────────────────────
charts:
  source: 'src/lib/chartColors.ts — CHART_COLORS 상수'
  policy: 'SVG stroke/fill 등 Tailwind 클래스로 접근 불가한 곳만 HEX 허용. 반드시 CHART_COLORS 참조.'
---

# BridgeLogis Design System

> 외부 운영 중인 SaaS(bridgelogis.com)의 디자인 토큰 SSOT.
> **Phase 2 완료 (2026-04-24)** — 레거시 `jways-*`·`accent-*` 전면 제거.
> 모든 UI 는 Brand(`navy`/`deep-blue`/`brand-blue`/`cyan`/`gold`) 또는 Semantic 토큰만 사용한다.

## 1. Overview

BridgeLogis는 **KS Ways 의 국제 특송(Express) SaaS 플랫폼**이다.
- 정식명: BridgeLogis by KS Ways
- 태그라인: *"Bridging Your Cargo to the World."*
- Values: Trust · Speed · Connection · Intelligence
- 도메인: bridgelogis.com (글로벌), app.bridgelogis.com (SaaS 본체)

디자인은 **신뢰감 있는 물류 인프라** 톤을 목표로 한다. Navy 를 중심에 두고, Brand Blue
를 행동 유발, Cyan 을 신호, Gold 를 프리미엄 강조로 쓴다.

## 2. Colors — 레이어 우선순위

다음 순서로 토큰을 선택한다:

```
신규/기존 컴포넌트 → Brand (§2.1) 또는 Semantic (§2.2)
상태 표현          → Semantic (§2.2)
회색조             → Neutral
```

### 2.1 Brand — BridgeLogis 정본

| 토큰 | HEX | Tailwind 클래스 | 용도 | 비율 |
|---|---|---|---|---|
| `{colors.navy}` | `#0A1628` | `bg-navy` | 다크 배경·풋터 | 60% |
| `{colors.deep-blue}` | `#152347` | `bg-deep-blue` | 카드·서피스 | 20% |
| `{colors.brand-blue}` | `#1D6FD1` | `bg-brand-blue` `text-brand-blue` | 주요 CTA·링크·포커스 | 15% |
| `{colors.cyan}` | `#00B4D8` | `bg-cyan` `text-cyan` | 시그니처·로고·피처 강조 | 시그니처 |
| `{colors.gold}` | `#E8A838` | `bg-gold` `text-gold` | 프리미엄·기념 배지 | 5% |

각 토큰은 50-900(또는 950) 스케일을 함께 제공한다 (`brand-blue-50` 등).
로고·브랜드 마크는 **cyan** 을 사용한다 (BridgeLogis 브랜드 가이드 정본).

### 2.2 Semantic — UI 상태

| 토큰 | HEX | Tailwind 클래스 | 언제 |
|---|---|---|---|
| `{colors.success}` | `#10b981` | `bg-success` `text-success` | 저장 완료, 승인, 활성 상태 |
| `{colors.warning}` | `#f59e0b` | `bg-warning` `text-warning` | 저마진, 임박, 검토 필요 |
| `{colors.destructive}` | `#ef4444` | `bg-destructive` `text-destructive` | 삭제, 실패, 심각 |
| `{colors.info}` | `#1D6FD1` | `bg-info` `text-info` | 안내 툴팁 (brand-blue 와 정렬) |

각 토큰은 Tailwind 내장 스케일(emerald/amber/red/blue) 전체를 포함한다.
`text-success-600` 같은 보조 톤 사용 가능.

### 2.3 Neutral

`gray-50 ~ gray-950` 11단계. Tailwind 기본 gray 를 커스텀 스케일(`#fafafa` ~ `#0a0a0a`)로
덮어썼다. 이는 **라이트/다크 모드 간 콘트라스트를 보다 선명하게** 하기 위함이며
(`gray-950 #0a0a0a` 는 Tailwind 기본 `#030712` 보다 더 중립적 검정), body 배경을
`bg-gray-50 dark:bg-gray-950` 로 극단 양끝에 배치한다.

### 2.4 WCAG 검증 쌍

라이트 모드 흰 배경(`#ffffff`) 기준 ([WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) 로 측정):

- `{colors.navy}` (`#0A1628`) — 18.5:1 ✅
- `{colors.brand-blue}` (`#1D6FD1`) — 5.9:1 ✅ (AA 통과)
- `{colors.cyan}` (`#00B4D8`) — 2.4:1 ⚠️ **텍스트 금지**, 배경·아이콘에만
- `{colors.gold}` (`#E8A838`) — 2.0:1 ⚠️ **텍스트 금지**, 배경·아이콘에만
- `{colors.success}` (`#10b981`) — 2.9:1 ⚠️ 본문 금지, 성공 배지·아이콘만
- `{colors.destructive}` (`#ef4444`) — 3.8:1 ⚠️ AA Large(3:1) 만족. 18px+ 굵은 글씨만

→ 세부 텍스트는 더 어두운 쉐이드(`brand-blue-700`, `gold-700`, `success-600`) 사용.

## 3. Typography

`Geist` 단일 패밀리 (`src/index.css:4-21` 에서 CDN 로드 — woff2).

- **본문**: `text-sm` (14px) 또는 `text-base` (16px)
- **위젯 헤더**: `text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200`
  (패턴 — FscRateWidget:122 참조)
- **대시보드 타이틀**: `text-xl` ~ `text-2xl` `font-semibold`

## 4. Layout

- 컨테이너: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` 표준
- 그리드: 대시보드는 12-column (`grid-cols-12 gap-4`), 위젯은 `col-span-*` 로 배치
- 반응형: mobile-first, 주요 브레이크 `sm/md/lg` 중심

## 5. Shapes

반경은 4단계로 제한:

| 용도 | 클래스 |
|---|---|
| 인풋·뱃지 | `rounded-md` |
| 버튼·기본 카드 | `rounded-lg` |
| 위젯·다이얼로그 | `rounded-xl` |
| 아바타·칩·스위치 | `rounded-full` |

`rounded-[Npx]` 임의값 금지.

## 6. Elevation & Depth

Tailwind 기본 shadow scale 사용 (`shadow-sm` · `shadow-md` · `shadow-lg` · `shadow-xl`).

- 기본 카드: `shadow-sm`
- 호버 상승: `hover:shadow-md` + `hover:-translate-y-0.5`
- 다이얼로그: `shadow-xl`
- 다크 모드는 shadow 대신 `border-gray-700` 으로 경계 표현

## 7. Dark Mode

```html
<html class="dark">  <!-- 또는 class 없음 = light -->
```

- 전략: `darkMode: 'class'` (Tailwind)
- 기본 body: `bg-gray-50 dark:bg-gray-950` / `text-gray-800 dark:text-gray-200`
- **brand-* 토큰은 라이트·다크 동일 값**. 필요하면 `dark:bg-brand-blue-600` 로 소폭 조정.
- `dark:` 변형 커버리지 1,051곳 — **새 컴포넌트도 반드시 `dark:` 함께 작성**.

## 8. Components — 패턴 가이드

### 8.1 Widget 카드 (대시보드 표준)
```tsx
<div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center">
      <Icon className="w-4 h-4 mr-2" /> Widget Title
    </h3>
  </div>
  <div className="p-4">{/* content */}</div>
</div>
```

- **다크 서피스는 중립 회색**(`dark:bg-gray-800` · `dark:border-gray-700` · 내부 면 `dark:bg-gray-900`).
  `dark:bg-brand-blue-800/900` 같은 **파란 서피스 금지** — 페이지 배경(`gray-950`)과 색상이 갈려 한 화면에서
  카드마다 온도가 달라진다. brand-blue 는 강조(아이콘·링크·수치)에만.
- 대시보드 위젯 헤더는 위처럼 **아이콘 + `text-sm font-bold` 제목**(대시보드 전 위젯 공통). 관리자 위젯의
  `text-xs uppercase` 헤더는 5단계에서 정리한다.
- 상태값 색은 `src/features/history/constants.ts` 의 `STATUS_COLORS` 단일 출처 — 대시보드 최근 견적도 이것을 쓴다.
- 클릭할 수 없는 행에 화살표(›, →) 아이콘을 두지 않는다 — 열리지 않는 걸 약속하는 셈이다.

### 8.2 Primary Button
```tsx
<button className="bg-brand-blue hover:bg-brand-blue-600 dark:bg-brand-blue dark:hover:bg-brand-blue-600
  text-white px-4 py-2 rounded-lg font-medium transition-colors">
  Action
</button>
```

- ⚠️ **다크 hover 는 `brand-blue-600`** (흰 글자 대비 6.95:1). 1.3.0 까지 이 예제는
  `dark:hover:bg-brand-blue-400` 였는데 흰 글자 대비가 **2.80:1 로 AA 미달**이었다 —
  hover 는 "더 밝게"가 아니라 "더 진하게" 간다. 라이트·다크 같은 값이라 `dark:hover:` 는 생략해도 된다.

### 8.3 Status Badge
```tsx
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
  bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400">
  Saved
</span>
```

### 8.4 Highlight (Premium) Badge
```tsx
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold
  bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-400">
  Premium
</span>
```

### 8.5 Carrier 구분 색 (CarrierComparisonCard)

3사 비교 UI 에서 캐리어별 카드 배경/보더는 다음 매핑을 고정 사용한다
(`src/features/quote/components/CarrierComparisonCard.tsx` `carrierColors`):

| Carrier | Light | Dark |
|---|---|---|
| UPS | `bg-amber-50 border-amber-200` | `dark:bg-amber-900/20 dark:border-amber-800` |
| DHL | `bg-yellow-50 border-yellow-200` | `dark:bg-yellow-900/20 dark:border-yellow-800` |
| FEDEX | `bg-cyan-50 border-cyan-200` | `dark:bg-cyan-900/20 dark:border-cyan-800` |

- FedEx 는 브랜드 `cyan-*` 커스텀 스케일을 사용한다 (Tailwind 기본 `blue-*`/`sky-*` 금지 원칙 준수).
- **같은 매핑을 비교 카드 밖에서도 쓴다** — Add-on 패널 테마(`addon/addOnPanelTheme.ts`)와 비용 내역의 캐리어 Add-on 행
  (`CostBreakdownCard` 의 `CARRIER_ADDON_*`). 한 화면에서 같은 캐리어의 색이 바뀌면 안 된다.
  ⚠️ 2026-10-04 이전: Add-on 패널이 UPS 파랑·FedEx 보라였고, 비용 내역은 `UPS ? 파랑 : 노랑` 삼항이라 FedEx 가 DHL 노랑으로 칠해졌다.
  캐리어 분기는 삼항 대신 **3사 전부를 적은 맵**으로 — 새 캐리어가 조용히 남의 색을 물려받지 않게.
- 배지 행은 배지가 없는 캐리어도 `min-h-[20px]` 로 높이를 맞춰 3장 카드의 수직 정렬을 유지한다.
- Zone / Transit / CO₂ 정보는 2-col grid 가 아닌 **세로 스택** (`space-y-1` + `flex justify-between`) 으로 배치한다 (가독성 이슈로 2026-07-22 변경).

### 8.6 Zone 미지정 상태 (ZoneUnavailableNotice / NoZoneColumn)

존 테이블에 없는 목적지는 임의 존으로 견적하지 않고 **경고가 아닌 "상태"로 표시**한다.
Semantic `warning`(amber) 계열을 쓰되, 오류(destructive)와 구분한다 — 사용자 잘못이
아니라 데이터 커버리지의 한계이기 때문.

```tsx
// 결과 영역 대체 카드 (ZoneUnavailableNotice.tsx)
<div className="rounded-xl border border-amber-300 dark:border-amber-700
  bg-amber-50 dark:bg-amber-900/20 px-4 py-4">
  <AlertTriangle className="h-5 w-5 text-amber-500" />
  <h3 className="text-sm font-bold text-amber-800 dark:text-amber-200">…</h3>
  <p className="text-sm text-amber-700 dark:text-amber-300">…</p>
</div>

// 비교 카드 내 캐리어 컬럼 (CarrierComparisonCard.tsx NoZoneColumn)
<div className="rounded-lg border border-dashed border-amber-300 dark:border-amber-700
  bg-amber-50/60 dark:bg-amber-900/10 px-3 py-4 text-center">
  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">…</p>
</div>
```

- 비교 카드에서는 컬럼을 **숨기지 않고** dashed 보더로 자리 유지 — 3사 정렬 보존 + 이유 전달
- 캐리어명은 `text-gray-400`으로 강등해 가격 있는 컬럼과 시각적 위계 차등
- 문구는 i18n 키 사용: `zone.unavailable.title/message`, `comparison.noZone`, `calc.option.noZone`

### 8.7 미구현 컴포넌트 작성 시

1. 기존 Brand/Semantic 토큰만으로 구현
2. 토큰이 부족하면 이 문서를 먼저 수정 후 구현
3. Legacy 토큰(jways/accent/blue/sky)은 **기존 컴포넌트 수정 시에만** 유지, 신규 금지

### 8.8 인증 화면 (Login · SignUp · Magic-link verify)

세 화면은 **`src/components/auth/AuthLayout.tsx`** 셸을 공유한다 — 헤더 + 왼쪽 폼 열(흰/`gray-950` 면) +
오른쪽 navy 브랜드 패널(`lg` 미만 숨김). Mobbin 의 B2B 분할 레이아웃(Airtable·Remote·Airwallex) 패턴.

- 클래스는 **`src/components/auth/authStyles.ts`** 상수만 쓴다: `authInputClass`(인풋 `rounded-md`, `py-3` = 44px)
  · `authLabelClass` · `authPrimaryButtonClass` · `authSecondaryButtonClass`(테두리 버튼) · `authTextLinkClass`
  · `authFieldIconClass`. 화면마다 문자열을 복사하지 말 것.
- 오류는 `ErrorAlert`(`role="alert"`, destructive 토큰), 성공 안내는 success 토큰 + `role="status"`.
- 페이지 제목은 **`h1`** 하나. 섹션당 primary 버튼 1개 — 대체 경로(매직 링크 등)는 secondary.
- 링크 색은 `text-brand-blue-600 dark:text-brand-blue-300` (cyan 은 본문 텍스트 금지 §11).
- `select` 는 `appearance-none` + lucide `ChevronDown`(`pointer-events-none`). 인라인 data-URI 화살표(HEX 하드코딩) 금지.
- 헤더의 계정 메뉴(`AccountMenu.tsx`)는 로그아웃을 **마지막 항목**으로 두고 destructive 색을 쓴다.
- 브랜드 패널 상단은 사진 슬라이드쇼 띠(`PhotoCarousel`, 높이 40%, §8.10)이고 아래 navy 로 그라디언트가 이어진다.
  **문구는 사진 위에 올리지 않는다** — 대비 측정 없이도 AA 를 유지하는 방법이다. 점 격자는 문구 영역에만 깐다.

### 8.9 문서형 카드 (공유 견적 `/q/:token`)

외부 파트너가 링크로 받는 견적은 **종이 문서처럼** 보이게 한다(Mobbin: Midday·Xero·Bonsai).

```tsx
<div className="min-h-screen bg-gray-100 dark:bg-gray-950">          {/* 중립 배경 */}
  <article className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200
    dark:border-gray-800 shadow-sm overflow-hidden">                   {/* 문서 */}
    {/* 머리: eyebrow + 참조번호(h1) + 발행일/유효기간 <dl> */}
    {/* 본문: 구간 → 상세 <dl> 그리드 */}
    {/* 합계: 라벨 왼쪽 · 금액 오른쪽 text-3xl tabular-nums */}
    {/* 꼬리: 면책 문구 bg-gray-50 dark:bg-gray-800/50 */}
  </article>
</div>
```

- 라벨/값은 **`<dl>` 시맨틱**. 라벨 `text-xs uppercase tracking-wider text-gray-500`, 값 `text-sm font-semibold`.
- 금액은 `tabular-nums`. 강조색 그라디언트 배경 금지 — 합계는 크기와 위계로 강조한다.
- 데이터는 `QuoteSerializer.shared` 화이트리스트에 있는 필드만. 디자인이 필드를 늘리지 않는다.

### 8.10 랜딩 히어로 (`/`)

히어로는 라이트 `bg-gray-50` / 다크 `bg-navy` + 점 격자를 쓴다. navy 제품 카드와 브랜드 토큰으로
인증 화면 브랜드 패널(§8.8)과 연결한다. Mobbin: Railway·Dovetail(왼쪽 정렬 헤드라인 + 정직한 제품 카드 하나)·Notion(버튼 쌍).

- 헤드라인 강조 줄은 `text-brand-blue-600 dark:text-cyan-300` 단색. **그라디언트 텍스트·블러 광원·글래스(`backdrop-blur`) 층 금지.**
  cyan 은 navy 위의 큰 제목에서만 허용(본문 금지 §11 은 흰 배경 기준 대비 문제).
- CTA 는 primary(`bg-brand-blue`) 1개 + 테두리 secondary 1개, `rounded-lg`. cyan 배경 버튼 금지.
- 제품 미리보기는 `<figure>` + `figcaption` 으로 **"견적 예시"임을 밝힌다**(`bg-deep-blue rounded-xl`).
  예시 금액도 **항목 합 = 합계**가 맞아야 한다 — 정확성을 파는 페이지에서 틀린 덧셈은 역효과.
- 오른쪽 열은 사진 슬라이드쇼(`PhotoCarousel`, `aspect-video rounded-xl` + ring) 위에 예시 견적 카드가
  아래 가장자리를 겹쳐 얹힌다. 카드가 주인공이고 사진은 맥락이다 — 사진을 카드 뒤 배경으로 흐리게 깔지 않는다(글래스 금지와 같은 이유).
- **사진 슬라이드쇼** (`src/components/ui/PhotoCarousel.tsx` · 목록 `deliveryPhotos.ts`): 6초마다 1초 crossfade(`opacity`만).
  - 출처는 Getty Images via **Unsplash+**(구독 라이선스). 원본은 Dropbox `KS WAYS/WCA LOGO/Unsp/`. **빨간 유니폼 사진은 제외** — DHL 로 읽힌다.
  - 사진마다 WebP 880w·1440w(`srcset` + `sizes`) + 880w JPEG 폴백. **원본보다 크게 늘리지 않는다.** 장식이므로 `alt=""`(이것으로 보조기기에서 숨겨진다 — `<picture>` 에 `aria-hidden` 은 lint 오류).
  - **처음엔 한 장만 받는다.** 다음 사진은 현재 사진이 로드된 뒤에 1장만 미리 받고, 다음 사진이 로드돼야 전환한다(빈 프레임으로 페이드 금지).
    히어로 첫 장만 `priority`(eager·high).
  - 멈춤: `prefers-reduced-motion`(첫 장 고정·미리받기 없음·버튼 숨김) · 화면 밖 · 숨긴 탭 · 일시정지 버튼(WCAG 2.2.2, `photos.pause/play`).
  - 인증 패널은 `startIndex` 를 달리 줘 랜딩과 다른 사진으로 시작한다.
- 통계 띠는 `<dl>` + `md:divide-x`, 기능 소개는 카드 대신 굵은 상단 선(`border-t-2`)의 3열 목록.
  아이콘 칩은 `bg-brand-blue-50 text-brand-blue-600 dark:bg-brand-blue-900/40 dark:text-brand-blue-300` 한 가지.
- ⚠️ 배지 문구 `landing.badge.networks` 는 **prerender 게이트**(`scripts/prerender.tsx` 의 `expect`)가 찾는
  문자열이다. 바꾸면 빌드가 실패하므로 두 곳을 함께 고칠 것.
- 점 격자는 `InteractiveDotGrid` 로 렌더한다. BlindChoice의 커서 반응 패턴을 참고해 자체 구현:
  기본 점(24px 간격)이 커서 주변 120px 안에서 최대 28px 밀려나며 강조되고, 커서가 떠나면 제자리로 복귀한다.
  라이트 점은 `brand-blue-600`, 다크는 흰 점 + `cyan-300` 강조. 기존 Tailwind 토큰에서 색을 읽고 테마 전환 시 즉시 갱신한다.
  장식은 `aria-hidden` · `pointer-events-none`; 모바일/터치 및 `prefers-reduced-motion` 은 정적 CSS 격자.
  SSR/Canvas 미지원도 정적 격자를 유지한다. 움직임이 멎으면 RAF를 종료하고 화면 밖·숨긴 탭에서는 중지한다.

#### 공통 반응형 점 배경

- 구현은 `src/components/ui/InteractiveDotGrid.tsx` 하나를 재사용한다. 부모는 `relative`/`sticky` 등 위치 기준을 제공하고,
  내용은 `relative` 로 점 위에 배치한다. 배경은 `pointer-events-none`, `aria-hidden`, `print:hidden`.
- `tone="navy"`: 인증 브랜드 패널과 대시보드 환영 배너처럼 항상 navy인 면에서는 테마와 무관하게 흰 점·cyan 강조.
- `subtle`: 인증 폼, 계산기·이력 상단 바, 가이드 제목, 공유 견적 바깥면에서는 기본 불투명도 0.07로 낮춘다.
  필드·문서·데이터 카드의 불투명 면과 기존 포커스/클릭 동작을 유지한다.
- 긴 공유 견적은 `maxHeight={720}` 으로 배경 캔버스 높이를 제한한다. 실제 배경 영역을 기준으로 좌표와 가시성을 계산하고,
  그 영역 밖 포인터 이동은 복귀 후 애니메이션을 종료한다. 모바일·동작 줄이기·SSR 정적 대체 규칙은 모든 화면에 동일하다.

### 8.11 범주 배지 · 범례 (관리자 위젯 · 가이드)

역할·우선순위·네트워크·감사 액션처럼 **값이 "종류"를 뜻하는 배지**는 아래 토큰 안에서 서로 다른 색을 고른다.
`purple`·`indigo`·`violet`·`pink`·`blue`·`sky` 는 쓰지 않는다 — 브랜드 팔레트 밖이라 화면마다 제각각이 된다.

| 순서 | 토큰 | 라이트 | 다크 |
|---|---|---|---|
| 1 | `brand-blue` | `bg-brand-blue-100 text-brand-blue-700/800` | `bg-brand-blue-900/30 text-brand-blue-300` |
| 2 | `cyan` | `bg-cyan-50/100 text-cyan-700` | `bg-cyan-900/20~30 text-cyan-300` |
| 3 | `emerald` | `bg-emerald-50/100 text-emerald-700` | `bg-emerald-900/20 text-emerald-300` |
| 4 | `amber` | `bg-amber-50/100 text-amber-700` | `bg-amber-900/20 text-amber-300` |
| 5 | `red` | `bg-red-50/100 text-red-700` | `bg-red-900/20 text-red-300` |
| 기타 | `gray` | `bg-gray-100 text-gray-700` | `bg-gray-700 text-gray-300` |

- 정보성 상태(예: "수정됨", "요율")는 `info`. 범주가 6개를 넘으면 색을 늘리지 말고 텍스트로 구분한다.
- 배지 텍스트는 **-700 이상**(라이트). cyan 도 배지 텍스트는 `cyan-700` 이라 §11 본문 금지와 충돌하지 않는다.
- **차트 범례 점은 선 색을 그대로 읽는다**(`style={{ backgroundColor: line.color }}`). 범례만 Tailwind 클래스로
  따로 칠하면 `CHART_COLORS` 가 바뀔 때 범례와 선이 조용히 어긋난다 — FSC 이력 차트가 실제로 그랬다.

## 9. Charts — HEX 직접 사용 영역

SVG `stroke`/`fill` 등 Tailwind 클래스로 접근 불가한 곳은 `src/lib/chartColors.ts` 의
`CHART_COLORS` 상수만 사용한다.

```tsx
import { CHART_COLORS } from '@/lib/chartColors';

<polyline stroke={CHART_COLORS.warning} ... />
```

새 차트 컬러 추가 시 `chartColors.ts` 를 먼저 확장. 직접 HEX 인라인 금지.

## 10. Motion

- 기본 transition: `transition-colors` 또는 `transition-all duration-200`
- 호버 상승: `hover:-translate-y-0.5` (카드), `hover:scale-105` 금지 (1.02 이하 유지)
- `prefers-reduced-motion` 대응 필요 시 `motion-safe:` 접두사 활용

### 10.1 스크롤 진입 모션 (카운트업 · 등장)

Mobbin: Fluz·Base·Givingli 통계 띠(큰 숫자 + 작은 라벨, 셀이 일부만 숫자). 21st.dev "Count Up"(unlumen)을 의존성 없이 이식.

- 단일 출처: `src/hooks/useEnterOnScroll.ts` · `src/components/ui/CountUp.tsx`. 새 의존성(`motion` 등)을 들이지 않는다.
- **첫 렌더는 항상 최종 상태다.** `/`·`/guide` 는 prerender 되므로 숫자는 실제 값, 등장 요소는 보이는 상태로 HTML 에 실린다.
  애니메이션은 마운트 후 effect 에서만 시작한다.
- **로드 시점에 이미 화면 안이면 움직이지 않는다.** 최종값 → 0 → 최종값 깜박임을 막기 위해, 처음 화면 밖에 있던 요소만
  숨김(`opacity-0`·0)에서 출발한다. IntersectionObserver 미지원·동작 줄이기도 정적 유지.
- **건너뛰어도 진입으로 친다.** 관찰 루트를 위쪽으로 크게 넓혀(`rootMargin` 상단 100000%) "도달했거나 이미 지나침"을 교차로 본다.
  앵커 이동·End 키·빠른 스크롤로 요소를 건너뛰면 교차가 한 번도 일어나지 않아 0·숨김에 영원히 멈추기 때문이다.
- **실제 수량만 센다.** `3`·`220+` 는 카운트업, `~1s`·`24/7` 는 0 에서 자라는 양이 아니므로 그대로 둔다.
- 스크린리더는 `sr-only` 최종값만 읽고, 움직이는 숫자는 `aria-hidden`. 블러·글로우 전환 금지(§11) — 투명도·이동만.
- 등장: `opacity` + `translate-y-3`, `duration-500 ease-out`, 항목당 80ms 지연, `motion-reduce:transition-none`. 전환은 들어올 때만 건다(화면 밖에서 숨길 때는 즉시).

### 10.2 문서 목차 스크롤 스파이 (`/guide`)

Mobbin: Mintlify·fal 의 "On this page" — 읽는 위치의 섹션을 목차에서 강조. 21st.dev "Table of Contents"(inference-sh)의
IntersectionObserver 훅을 `src/hooks/useScrollSpy.ts` 로 이식하면서 고친 점:

- 관찰 기준선은 고정 헤더(64px) 아래 96px 부터. 섹션은 `scroll-mt-20` 으로 도착한다.
- 목차 클릭 후 smooth 스크롤이 지나가는 섹션이 강조를 가로채지 않도록 `scrollend`(최대 1초)까지 클릭 대상을 고정한다.
- 짧은 마지막 섹션은 기준선에 닿지 못하므로 페이지 바닥에서는 마지막 섹션을 활성화한다.
- 활성 항목에 `aria-current="location"`. 미지원 환경에서는 클릭으로만 바뀐다.

## 11. Do's and Don'ts

### ✅ Do

- 신규 컴포넌트는 Brand/Semantic 토큰 먼저 시도
- 차트 HEX 는 `CHART_COLORS` 상수로 참조
- 다크 모드 변형 함께 작성 (`dark:` 변형 없는 컴포넌트 금지)
- WCAG AA 4.5:1 이상을 새 조합마다 측정
- 반경은 `rounded-md/lg/xl/full` 4단계 내에서 선택
- 섀도우는 `shadow-sm/md/lg/xl` 표준 사용

### ❌ Don't

- 레거시 `jways-*`/`accent-*` 재도입 금지 (Phase 2 에서 제거됨) · Tailwind 기본 `blue-*`/`sky-*` 사용 금지
- 색상을 HEX 로 인라인 하드코딩 금지 (`style={{color:'#1D6FD1'}}` 금지, 차트 제외)
- `cyan`·`gold`·`success`·`destructive` 를 **본문 텍스트 색**으로 쓰지 않음 (WCAG 미달)
- 프리미엄 강조에 `warning` 사용 금지 → `gold` 사용
- 2개 이상의 primary CTA를 같은 섹션에 배치하지 않음
- `rounded-[Npx]` 임의값 금지
- Obang 스타일 5방위색 등 ASCA 토큰을 참조하지 않음 (다른 프로젝트)

## 12. Agent Guidelines — AI 에이전트 작업 규칙

1. **조회 순서**: 이 문서 → `tailwind.config.cjs` → `src/index.css` → 기존 컴포넌트
2. **토큰 참조 문법**: `{colors.brand-blue}`, `{typography.family.sans}` — 규칙 인용 시
3. **토큰이 없을 때**: 임의 값 만들지 말고, 사용자에게 "DESIGN.md에 추가 필요" 보고 후 승인받아 먼저 본 문서 수정
4. **레거시 재도입 금지**: `jways-*`/`accent-*` 는 Phase 2 에서 제거됨. 신규 코드에 재도입 금지
5. **Feature 단위 design 문서**(`docs/02-design/features/*.design.md`): 본 문서의 토큰을
   참조해야 하며, 중복 정의 금지

## 13. Maintenance

- **오너**: @jhlim725
- **소유 브랜드**: BridgeLogis by KS Ways
- **변경 주기**: 토큰 변경 시 `.commit_message.txt` + Git 커밋 필수
- **검증**: 토큰 추가·변경 시 `npm run build` + `npx tsc --noEmit` + `npx vitest run` 통과 필수

### Changelog

- **1.12.0** (2026-10-05) — §10.1 스크롤 진입 모션(랜딩 통계 카운트업·기능 목록 등장) · §10.2 가이드 목차 스크롤 스파이 신설.
  Mobbin 참고 + 21st.dev 컴포넌트를 새 의존성 없이 이식. prerender·이미 보이는 요소·동작 줄이기는 정적 유지.
- **1.10.0** (2026-10-05) — 단일 사진을 5장 슬라이드쇼(`PhotoCarousel`)로 교체. 반응형 `srcset`(880w/1440w),
  1장씩 지연 로드, 감속 모션·화면 밖·숨긴 탭 정지, 일시정지 버튼. `DeliveryPhoto` 제거.
- **1.9.0** (2026-10-05) — 배송 사진 도입. 랜딩 히어로(사진 + 겹친 예시 견적 카드)와 인증 브랜드 패널(상단 사진 띠)에
  공용 `DeliveryPhoto` 적용. 사진 출처·해상도·로딩 규칙을 §8.10 에 명시.
- **1.8.1** (2026-10-04) — 반응형 점 배경을 공통 UI 컴포넌트로 이동하고 인증 3종·대시보드 환영 배너·
  계산기/이력 상단 바·가이드 제목·공유 견적 바깥면으로 확장. navy 고정 색과 낮은 밝기 옵션, 문서 캔버스 높이 제한 추가.
- **1.8.0** (2026-10-04) — §8.11 범주 배지·범례 규칙 신설. 관리자 위젯(마진 우선순위·사용자 역할·네트워크·감사 로그·
  할증 요율)과 사용자 가이드의 `blue`·`sky`·`purple` 을 brand-blue/cyan/info/gray 로 정리, FSC 이력 범례를 선 색에
  바인딩(범례 파랑 vs 선 brand-blue 불일치 수정), 남은 `rounded-2xl` → `xl`. 단계적 개선의 5단계(마지막).
- **1.7.1** (2026-10-04) — 랜딩 히어로에 커서 반응형 점 격자 추가. 모바일·동작 줄이기·SSR 정적 대체,
  화면 밖 애니메이션 중지. 라이트 배경·브랜드 블루 점 / 다크 navy·white·cyan 점 및 제목·버튼 대비 조정.
- **1.7.0** (2026-10-04) — §8.5 캐리어 색을 Add-on 패널·비용 내역까지 확장(UPS 파랑→amber, FedEx 보라→cyan,
  FedEx 가 DHL 노랑으로 보이던 버그 수정). 계산기·이력의 `blue-*` 51곳을 의미별로 정리 — 버튼·링크·편집 컨트롤은
  `brand-blue`, 안내 배지·알림·아이콘은 `info`(같은 blue 스케일이라 렌더 색 동일). 메인 견적 카드 그라디언트 →
  `bg-navy`, 상세 모달 `rounded-2xl` → `xl`. 단계적 개선의 4단계.
- **1.6.0** (2026-10-04) — §8.1 위젯 카드를 실제 대시보드 위젯 헤더(아이콘 + `text-sm font-bold`)에 맞추고
  다크 서피스 중립 회색 규칙·`STATUS_COLORS` 단일 출처·가짜 화살표 금지 추가. 대시보드 위젯 5종의
  `dark:bg-brand-blue-800` 서피스·`rounded-2xl`·`blue/sky` 를 정리하고 red/amber/green 을 Semantic 토큰
  (destructive/warning/success/info)으로 전환. 단계적 개선의 3단계.
- **1.5.0** (2026-10-04) — §8.10 랜딩 히어로 패턴 신설. 랜딩의 `rounded-2xl/3xl`·임의 반경·`blue-300`
  그라디언트 텍스트·블러 광원·글래스 층·cyan CTA 제거, 예시 견적 합계 오류($612 → 항목 합 $550.50) 수정.
  단계적 개선의 2단계.
- **1.4.0** (2026-10-04) — §8.2 Primary Button 다크 hover 를 `brand-blue-400` → `brand-blue-600` 으로 수정
  (흰 글자 대비 2.80:1 → 6.95:1, AA 미달 해소). §8.8 인증 화면(공용 `AuthLayout`·`authStyles`) ·
  §8.9 문서형 카드(공유 견적) 패턴 신설. Mobbin 레퍼런스 기반 전 화면 단계적 개선의 1단계.
- **1.3.0** (2026-08-19) — 존 폴백 제거 UI 반영. §8.6 Zone 미지정 상태 패턴 신설
  (ZoneUnavailableNotice amber 카드 · CarrierComparisonCard NoZoneColumn dashed
  보더 — 컬럼 숨김 대신 자리 유지). 기존 §8.6(미구현 컴포넌트)은 §8.7 로 이동.
- **1.2.0** (2026-07-22) — FedEx 3캐리어 통합 반영. §8.5 Carrier 구분 색 추가
  (UPS `amber-*` / DHL `yellow-*` / FEDEX `cyan-*`), CarrierComparisonCard 배지
  `min-h-[20px]` 정렬 및 Zone/Transit/CO₂ 세로 스택 패턴 문서화.
- **1.1.0** (2026-04-24) — Phase 2 완료. 레거시 `jways-*` (207건) / `accent-*` (55건) 전면
  제거, `brand-blue-*` / `cyan-*` 로 통합. `tailwind.config.cjs` Legacy 블록 삭제,
  §2.3 Legacy 섹션 제거 (3 레이어 구조: Brand / Semantic / Neutral). `accent-950`
  사용 1건은 `cyan-900` 으로 강등 (cyan 팔레트에 950 스텝 없음).
- **1.0.1-alpha** (2026-04-24) — design-validator 피드백 반영: WCAG 측정 도구 명시,
  다크 모드 브랜드 색상 스케일 가이드 구체화, Neutral 스케일 커스터마이징 근거
  추가, Component 예제 dark: 변형 보강 (§8.2), §8.4 Premium Badge 예제 추가.
- **1.0.0-alpha** (2026-04-24) — 초판. BridgeLogis 브랜드 가이드(memory:
  `project_bridgelogis_brand.md`, 2026-03-24) 와 Tailwind 코드 미정렬 문제 발견 →
  Phase 1 non-breaking 도입. Brand 5색(navy/deep-blue/brand-blue/cyan/gold) +
  Semantic 4종(success/warning/destructive/info) Tailwind config 추가. 차트 HEX
  3곳을 `src/lib/chartColors.ts` 로 중앙화.

---

_이 문서는 [google-labs-code/design.md](https://github.com/google-labs-code/design.md)
포맷을 따른다._
