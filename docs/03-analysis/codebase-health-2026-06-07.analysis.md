---
type: analysis
title: Codebase Health Analysis
project: j-ways-smart-quote-system (smart-quote-main)
date: 2026-06-07
author: jhlim725
method: 3 parallel subagents (FE quality, BE quality, security) + direct verification (3 security/quality claims corrected)
scope: monorepo — React 19/TS frontend (~26k LOC) + Rails 8 backend (~4k LOC app/lib)
supersedes: codebase-health-2026-06-06.analysis.md (delta below)
---

# Codebase Health Analysis — smart-quote-main (2026-06-07)

> **Overall Health: 7.5 / 10** 🟢 (↑ from 6.7 on 2026-06-06)
> Date: 2026-06-07 · Method: 3 parallel subagents + direct verification (severity-inflation 정정 3건)

상승 요인: 직전 분석의 주 약점이던 **AI 챗봇 보안 4종(H1/H2/H3/H6)이 전부 해결**되고(chat-security-hardening, PR #20), **백엔드 rspec 부채 + CI 게이트가 완결**(backend-test-infra-debt #30/#31, backend-ci-gate #32/#33)됐다. 잔여 약점은 **의존성 업그레이드(react-router/jspdf)** 와 **유지보수성 부채(rubocop 미게이트·FE 중복·대형 위젯)** 로 이동했다 — 모두 명확하고 비차단.

| Area | Score (Δ) | One-liner |
|------|:---------:|-----------|
| Frontend quality | 7.5 (↑0.7) | calc orchestrator 명료, but UPS/DHL 패널 ~99% 중복 + 대형 admin 위젯 3개 + prop drilling |
| Backend quality | 7.5 (↑0.7) | 서비스 분리 양호·rescue는 대부분 구체적, but rubocop 1052 **CI 미게이트** + 일부 bare rescue |
| Security | 7.5 (↑1.0) | 앱 로직 보안 견고(챗 4종 해결·IDOR 없음·magic_link digest), 잔여는 **의존성 업그레이드 + 하드닝(jti/admin pw)** |

---

## What changed since 2026-06-06 (resolved)

| 직전 발견 | 상태 |
|-----------|------|
| H1 chat rate limit / H2 margin resolve authz / H3 prompt injection / H6 Anthropic timeout | ✅ **해결** (chat-security-hardening PR #20 `ca82f69`, rack_attack chat 20/min·resolve 403·sanitize·timeout 30s 직접 확인) |
| 백엔드 rspec 7 pre-existing 실패 | ✅ **해결** (backend-test-infra-debt PR #30, 243/0) |
| 백엔드 rspec CI 미게이트 | ✅ **해결** (backend-ci-gate PR #32, 전체 rspec + db:test:prepare) |
| 백엔드 rubocop 1054 CI 미게이트 | ⏳ **잔여** (1052, rspec만 게이트됨 — rubocop은 여전히 미게이트) |
| calc orchestrator 복잡도 / UPS·DHL 중복 / 대형 admin 위젯 | ⏳ **잔여** (아래 MEDIUM) |

---

## Metrics

| Metric | Value |
|--------|-------|
| Frontend TS/TSX (src, incl. tests) | 221 files / ~26,280 LOC |
| Backend Ruby (app/lib) | 44 files / ~3,273 LOC |
| `any` types | 0 |
| `console.log/debug` | 0 |
| 최대 FE 파일 | GuideVisuals.tsx (482), UserGuidePage.tsx (439), UserManagementWidget.tsx (378) |
| 최대 BE 파일 | chat_controller.rb (258), quotes_controller.rb (249), auth_controller.rb (199) |
| FE 테스트 | 52 files, 1447 passing |
| 백엔드 rspec | 243 examples, 0 failures (**CI 게이트됨** ✅) |
| 백엔드 rubocop | 1052 offenses (~975 Style/StringLiterals) — **CI 미게이트** |
| npm audit (prod runtime) | 4 vulns: jspdf(critical ReDoS)·react-router(high RCE)·dompurify(moderate XSS, jspdf 경유) — fix=2 업그레이드 |
| npm audit (dev-only) | 다수(vite/vitest/rollup/tar/undici/esbuild 등) — build-time 한정 |

---

## Verification corrections (subagent severity-inflation 정정)

직전 분석과 동일하게, 보안 서브에이전트가 **심각도를 과장**했다. 직접 검증 후 정정:

| 에이전트 주장 | 검증 | 정정 |
|---------------|------|------|
| magic_link **plaintext 컬럼 노출 "HIGH"** | `user.rb:21-26` `generate_magic_link_token!`이 `magic_link_token_digest=SHA256(raw)` 저장 + `magic_link_token=nil`(line 26). plaintext **절대 미저장**, verify는 `secure_compare`(line 38) | **LOW** — 데드 컬럼/인덱스(`magic_link_token`) 정리 대상, 보안 위험 아님 |
| jspdf→dompurify **"HIGH, EOL"** + "2.5.8 safe" | npm audit는 dompurify를 **moderate XSS**로 플래그(에이전트 "safe" 오판). 단 `pdfService.ts`는 user HTML 미투입(JSON 데이터만) → 실벡터 없음 | **MEDIUM(의존성)** — jspdf 업그레이드로 동반 해결, 미악용 |
| quotes_controller **"generic catch-all HIDES errors" MEDIUM** | `quotes_controller.rb`는 `InvalidInputError`(16,45)·`RecordNotFound`(76,102,123,133)·`InvalidRangeError`(162)·`TooLargeError`(164) **구체 rescue** 후 StandardError는 최후 폴백 | **LOW** — 합리적 계층화, `quote_serializer.rb:81` bare rescue만 소폭 개선 여지 |

> react-router-dom 7.13.1 HIGH는 **검증됨**(npm audit `react-router 7.0.0-7.14.2`, turbo-stream RCE 실재) — 유지. 단 앱은 user-controlled redirect 미사용이라 **잠재적·미악용**.

---

## HIGH

| # | Category | Location | Issue (검증) | Recommendation |
|---|----------|----------|--------------|----------------|
| H1 | 의존성(prod) | `package.json` react-router-dom `^7.13.1`, jspdf | npm audit prod 4건: **jspdf** critical ReDoS(client-side PDF, self-DoS 한정), **react-router** high turbo-stream RCE(앱은 unsafe redirect 미사용→잠재적), **dompurify** moderate XSS(jspdf 경유, user HTML 미투입). 앱 로직상 **현재 미악용**이나 프레임워크 취약 | `npm update react-router-dom@^7.14.3 jspdf@^4.2.1` (2건 업그레이드로 critical+high+moderate 동시 해소). 분리 사이클 `dep-upgrade` 후보 |

> HIGH는 사실상 1건(의존성 업그레이드)으로 수렴 — 모두 trivial fix, 앱 로직 취약점은 **없음**.

---

## MEDIUM

| # | Category | Location | Issue | Recommendation |
|---|----------|----------|-------|----------------|
| M1 | 유지보수(BE) | `.github/workflows/ci.yml` | rubocop 1052 offenses **CI 미게이트** (rspec는 이제 게이트됨). 신규 PR이 스타일 부채 무제한 추가 가능 | `rubocop -a`(autocorrect 1038건) 정리 PR + CI에 `rubocop --fail-level` 추가. 분리 사이클 `backend-rubocop-gate` |
| M2 | 중복(FE) | `UpsAddOnPanel.tsx:283` ↔ `DhlAddOnPanel.tsx:246` | ~99% 구조 중복(getDisplayAmount/totalSelected/toggle/layout). addon 룰 수정 시 2곳 분기 위험 | 파라메트릭 `<AddOnPanel carrier={}>` + carrier config 추출. 529 LOC → ~350+config |
| M3 | 복잡도(FE) | `UserManagementWidget.tsx:378`, `TargetMarginRulesWidget.tsx:376`, `FscRateWidget.tsx:372` | 대형 admin 위젯 3개(상태+API+검증+테이블+인라인편집 혼재) | headless 데이터 훅 + presentational 분리, <250 LOC 목표 |
| M4 | 하드닝(보안) | `db/seeds.rb:1` | `ENV.fetch("ADMIN_DEFAULT_PASSWORD","changeme123!")` — fresh 환경서 예측 가능 admin pw. (직접 확인) | pre-seed guard: `raise if ENV["ADMIN_DEFAULT_PASSWORD"].blank?` (test/CI는 db:test:prepare로 시드 미실행이라 영향 없음) |
| M5 | 하드닝(보안) | `jwt_authenticatable`(concern) | 로그아웃이 쿠키만 제거, **jti denylist 없음** → access(15m)/refresh(7d) 즉시 폐기 불가. 코드 주석상 "future work". TTL 짧아 실위험 낮음 | 프로덕션 하드닝 시 jti denylist(Rails.cache). 비차단 |
| M6 | 복잡도(BE) | `chat_controller.rb:68-153` | 시스템 프롬프트 86줄 인라인(logistics 지식+admin/member 가이드+규칙 혼재). 다국어/가이드 변경 시 마찰 | `logistics_knowledge`/`*_guide_template` 헬퍼 추출 |
| M7 | 테스트 신뢰성 | `useExchangeRates.ts:53,64,82` ↔ `CustomerDashboard.test.tsx` | **flaky** — 폴링 `setInterval`/`window.addEventListener('online')` async가 jsdom teardown 후 발현 → vitest "Unhandled Error: window is not defined". 로컬 5/5 pass·CI 동일커밋 재실행 green = 타이밍 의존. **main `check` job 랜덤 차단 가능** (dep-upgrade PR #34서 발견, 변경 무관) | 훅 async에 unmount 가드(AbortController) 또는 테스트 fake timers + 명시 cleanup. 분리 사이클 `dashboard-test-flakiness` |

---

## LOW

| # | Location | Issue | Note |
|---|----------|-------|------|
| L1 | `user.rb` / schema `magic_link_token` | plaintext 미사용 데드 컬럼 + unique index 잔존 | drop 마이그레이션(보안 아닌 정리) |
| L2 | `quote_serializer.rb:81`, `fsc_fetcher.rb:14`, `exchange_rate_fetcher.rb:65` | bare `rescue => e` 원인 클래스 미구분·로깅 약함 | `rescue StandardError => e` + `e.class`/backtrace 로깅 |
| L3 | `calculationService.ts:20-207` | 188 LOC 오케스트레이터(4 phase 밀집), DHL+system surcharge+margin **조합** 테스트 부재 | 조합 통합 테스트 3-5개 추가 + 단계 주석 |
| L4 | `FscChart.tsx:197` 등 차트 | 인라인 HEX(`#8884d8`) — DESIGN.md `CHART_COLORS` 미사용 | `src/lib/chartColors.ts` 상수로 교체 |
| L5 | `customers_controller#index/show` | 고객 접근 audit 로깅 없음(quote/margin은 있음) | 컴플라이언스용 audit 추가 |
| L6 | dev 의존성 다수 | vite/vitest/rollup/tar/undici 등 build-time 취약 | `npm audit fix`(non-breaking) 주기적, prod 런타임 영향 없음 |

---

## Already verified SAFE (재확인, 미보고)

SQLi 없음(parameterized) · 하드코딩 시크릿 없음(ENV only, .env 미커밋) · CORS 화이트리스트(cors.rb) · `dangerouslySetInnerHTML` 1건=JSON-LD `JSON.stringify`(user input 없음) · IDOR 없음(margin resolve own-email/quotes·customers scoped) · 토큰 메모리 저장(localStorage XSS 면) · rate limit 포괄(chat 20/min·login 5/min·magic_link) · Anthropic timeout 30s.

---

## Recommendations (분리 사이클 후보, 우선순위)

| 우선 | 사이클 | 범위 | 규모 |
|------|--------|------|------|
| **P0** | `dep-upgrade` | react-router-dom 7.14.3+ / jspdf 4.2.1 (H1) — npm critical+high+moderate 해소 | ~1h |
| **P1** | `backend-rubocop-gate` | rubocop -a 1038 정리 + CI fail-level 게이트 (M1) | ~2h |
| **P1** | `addon-panel-consolidation` | UPS/DHL 패널 파라메트릭 통합 (M2) | ~3-4h |
| **P2** | `admin-widget-split` | 대형 admin 위젯 3개 훅/뷰 분리 (M3) | ~3h |
| **P2** | `auth-hardening` | jti denylist + admin pw guard + magic_link 데드 컬럼 drop (M4/M5/L1) | ~2-3h |
| P3 | `supabase-config-cleanup` | dead `VITE_SUPABASE_*` 제거 | ✅ 완료 (2026-07-19) |

---

## Per-area scoring rationale

- **FE 7.5**: 강점(calc 분리·1447 테스트·`any` 0·메모이제이션 규율) − 약점(UPS/DHL 중복·대형 위젯 3개·prop drilling)
- **BE 7.5**: 강점(서비스 분리·구체 rescue 계층·audit 로깅·graceful degradation·rspec CI 게이트) − 약점(rubocop 미게이트·bare rescue 3건·프롬프트 인라인)
- **Security 7.5**: 강점(챗 4종 해결·IDOR 없음·magic_link digest+secure_compare·rate limit·CORS) − 약점(의존성 업그레이드·jti 부재·admin pw 기본값). 앱 로직 취약점 **0**, 잔여는 위생/하드닝
