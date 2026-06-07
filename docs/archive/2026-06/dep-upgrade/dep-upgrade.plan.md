---
template: plan
version: 1.1
feature: dep-upgrade
date: 2026-06-07
author: jhlim725
project: j-ways-smart-quote-system
status: draft
---

# dep-upgrade Plan

> **Status**: Draft
> **Project**: j-ways-smart-quote-system (Goodman GLS / J-Ways, bridgelogis.com)
> **Author**: jhlim725
> **Created**: 2026-06-07
> **PDCA Phase**: Plan
> **Source**: `docs/03-analysis/codebase-health-2026-06-07.analysis.md` HIGH H1

---

## 1. Overview

### 1.1 Purpose

코드 분석(2026-06-07)에서 유일한 HIGH로 수렴한 **prod 런타임 의존성 취약점**을 해소한다. npm audit prod 4건(jspdf critical·react-router high·dompurify moderate)이며, **앱 로직상 현재 미악용**(unsafe redirect·user-HTML 미사용)이나 프레임워크 취약이라 업그레이드가 정공법이다.

### 1.2 Background — 검증된 사실 (2026-06-07 직접 확인)

| 패키지 | 현재 | 목표 | 취약점 | breaking? |
|--------|------|------|--------|-----------|
| `react-router-dom` (+`react-router`) | 7.13.1 | **7.17.0** | high — turbo-stream RCE(7.0.0–7.14.2) | **No** (v7 내 minor, `npm outdated` wanted=7.17.0) |
| `jspdf` | 2.5.1 | **4.2.1** | **critical** ReDoS(<=4.2.0) | **Yes** (`npm audit` `isSemVerMajor=True`, 2→4) |
| `dompurify` (transitive via jspdf) | 2.5.8 | 3.4.0+ | moderate XSS | jspdf 업그레이드로 동반 해소 |

**핵심 리스크 사실:**
- `jspdf-autotable@5.0.7`이 `jspdf@2.5.1`에 의존(deduped) → jspdf 4.x 호환성 확인 필요(M-PDF 표/레이아웃은 autoTable 사용: `pdfTables.ts:24,31`).
- PDF는 `doc.setFont(FONTS.FAMILY, ...)` 사용(`pdfLayout.ts`, `pdfTables.ts`). `addFont/addFileToVFS/.ttf` 등록은 grep 미검출 → **표준 폰트 가능성(한글 임베딩 위험 낮음)**, Do에서 확정.
- **안전망**: `src/lib/pdf/pdfLayout.test.ts`가 **실제 `new jsPDF()`** 사용 + `pdfService.test.ts` → jspdf major API 변경을 회귀로 포착.

### 1.3 Related

| Type | Link |
|------|------|
| Analysis | `docs/03-analysis/codebase-health-2026-06-07.analysis.md` (H1) |

---

## 2. Scope

### 2.1 In Scope (위험도별 2 파트)

**Part A — react-router-dom 7.13.1 → 7.17.0 (저위험, 우선)**
- `npm install react-router-dom@^7.17.0` → high RCE 해소.
- 검증: `npx tsc --noEmit` + `npm run lint` + `npx vitest run` + `npm run build`. 라우팅 스모크(/, /login, /dashboard, /quote, /admin).

**Part B — jspdf 2.5.1 → 4.2.1 (+ jspdf-autotable 호환, breaking 주의)**
- 선행 확인(R-1): jspdf-autotable 5.0.7이 jspdf 4.x 지원하는지 / 필요 시 jspdf-autotable 버전 bump.
- `npm install jspdf@^4.2.1 jspdf-autotable@<compatible>` → critical ReDoS + moderate dompurify 동반 해소.
- 검증: `npx vitest run`(특히 `pdfLayout.test.ts` 실제 jsPDF·`pdfService.test.ts`) + `npm run build` + **수동 PDF 생성 회귀**(견적 PDF: 폰트·autoTable 표·통화·면책문구 레이아웃 육안 확인).

### 2.2 Out of Scope

- **dev 전용 취약**(vite/vitest/rollup/tar/undici/esbuild 등) — build-time 한정, 별도 `npm audit fix` 주기 처리.
- 백엔드 gem 업그레이드(bundle-audit 미설치, 별도).
- 기능 변경 — 순수 의존성 업그레이드.

---

## 3. Goals & Success Criteria

| # | 목표 | 측정 |
|---|------|------|
| SC-1 | prod npm audit HIGH/CRITICAL 0 | `npm audit --omit=dev` → react-router/jspdf/dompurify 해소 |
| SC-2 | FE 전 검증 green | tsc 0 / lint 0 / vitest 1447 pass / build 성공 |
| SC-3 | PDF 회귀 0 | `pdfLayout.test.ts`(real jsPDF)·`pdfService.test.ts` pass + 수동 PDF 육안 정상(폰트·표·레이아웃) |
| SC-4 | 라우팅 회귀 0 | 주요 라우트 스모크 정상 |
| SC-5 | 기능 코드 무변경 | diff = package.json/lock + (jspdf API 변경 시 최소 호환 패치만) |

---

## 4. Open Decisions

| ID | 결정 | 옵션 | 권고 |
|----|------|------|------|
| **R-1** | jspdf-autotable ↔ jspdf 4.x 호환 | (a) autotable 5.0.7 그대로 호환 / (b) autotable 버전 bump 필요 / (c) jspdf 4 API가 setFont·autoTable 시그니처 변경 | Do 선행 단계에서 `npm install jspdf@4 jspdf-autotable@latest` 후 vitest로 확정. breaking 시 최소 호환 패치(`pdfTables.ts`/`pdfLayout.ts`) |
| **R-2** | Part A/B 분리 출하 vs 합본 | A를 먼저 단독 PR(즉시 HIGH RCE 해소) / B는 검증 후 동일 or 후속 PR | **A 우선 단독 권고** — trivial·HIGH 해소 즉효. B는 PDF 회귀 확인 후. jspdf breaking 크면 B를 별 사이클로 강등 |

---

## 5. Implementation Order

```
1. Part A: react-router-dom@^7.17.0 → tsc/lint/vitest/build/라우트 스모크 → (가능시 단독 PR)
2. Part B 선행: jspdf@4 + autotable 설치 → vitest(pdf 테스트) 로 R-1 호환 확정
3. Part B: breaking 시 pdfTables/pdfLayout 최소 호환 패치 → vitest/build → 수동 PDF 육안
4. npm audit --omit=dev 재확인(HIGH/CRITICAL 0) → 커밋/PR
```

TDD/회귀: 기존 PDF 테스트(real jsPDF)가 RED→수정→GREEN 사이클을 제공. 신규 테스트보다 **기존 안전망 + 수동 육안**이 핵심(시각적 레이아웃은 단위테스트로 완전 포착 불가).

---

## 6. Risks & Mitigations

| 리스크 | 영향 | 완화 |
|--------|------|------|
| jspdf 2→4 major API 변경(setFont/autoTable/폰트) | PDF 깨짐 | 실제-jsPDF 테스트 + 수동 육안. breaking 크면 Part B 별 사이클 강등(R-2) |
| jspdf-autotable 비호환 | 표 렌더 실패 | R-1 선행 확정, autotable bump |
| 한글 폰트 임베딩 회귀 | 한글 PDF 깨짐 | 폰트 등록 방식 Do에서 확인(현재 표준폰트 추정). 한글 견적 PDF 수동 확인 |
| react-router 7.17 minor 회귀 | 라우팅 이상 | 저위험(minor), 스모크로 충분 |
| 시각 회귀를 단위테스트가 못 잡음 | 미묘한 레이아웃 깨짐 | 수동 PDF 다운로드 육안(SC-3) |

---

## 7. Next Step

1. `/pdca do dep-upgrade` — Part A 먼저(저위험) → Part B(R-1 확정 후)
2. Design 생략 권고 — 의존성 업그레이드라 Plan→Do 직행
