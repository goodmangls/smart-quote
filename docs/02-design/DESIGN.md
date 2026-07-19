---
name: BridgeLogis Design System (smart-quote-main)
version: 1.1.0
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
  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
      Widget Title
    </h4>
  </div>
  <div className="p-4">{/* content */}</div>
</div>
```

### 8.2 Primary Button
```tsx
<button className="bg-brand-blue hover:bg-brand-blue-600 dark:bg-brand-blue dark:hover:bg-brand-blue-400
  text-white px-4 py-2 rounded-lg font-medium transition-colors">
  Action
</button>
```

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

### 8.4 미구현 컴포넌트 작성 시

1. 기존 Brand/Semantic 토큰만으로 구현
2. 토큰이 부족하면 이 문서를 먼저 수정 후 구현
3. Legacy 토큰(jways/accent/blue/sky)은 **기존 컴포넌트 수정 시에만** 유지, 신규 금지

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
