---
template: plan
version: 1.1
feature: backend-test-infra-debt
date: 2026-06-07
author: jhlim725
project: j-ways-smart-quote-system
status: draft
---

# backend-test-infra-debt Plan

> **Status**: Do 완료 (origin/main 재조정)
> **Project**: j-ways-smart-quote-system (Goodman GLS / J-Ways, bridgelogis.com)
> **Author**: jhlim725
> **Created**: 2026-06-07
> **PDCA Phase**: Do
> **Source**: `/check` 실행 결과(2026-06-07) — `smart-quote-api` rspec 235 examples / **7 failures** (로컬 stale main 기준)

> ⚠️ **origin/main 재조정 (2026-06-07)**: 분석은 9커밋 behind인 로컬 main에서 수행됐다. origin/main에는 #21/#24/#25/#29(magic_link·auth 하드닝)가 이미 머지돼 **G3(/auth/me 중첩)·G4(magic_link)를 동등하게 해결**한 상태였다(git show 확인). 따라서 이 사이클은 **G3/G4를 폐기**하고, origin에도 여전히 실패하는 **G1(FSC)·G2(margin) 5건만** origin/main 기반 브랜치(`fix/backend-test-infra-debt`)에 적용했다. 검증: origin 기반 전체 rspec **243 examples, 0 failures**. 교훈 → [[feedback_concurrent_push_pattern_2026_05_30]](측정 전 `git fetch`+behind 확인).

---

## 1. Overview

### 1.1 Purpose

백엔드(`smart-quote-api`, Rails) rspec 스위트가 **7건 만성 실패** 상태로 방치돼 있습니다. CI(`ci.yml`)가 **프론트엔드만** 게이트하기 때문에(백엔드 rspec/rubocop 미실행) 이 실패들이 머지를 차단하지 못한 채 누적됐습니다. 본 사이클은 **7건 전부를 GREEN으로 복구**하고, 재발 방지를 위해 백엔드 rspec의 CI 게이트 편입을 평가합니다.

> 핵심 원칙(전역 규칙): **"구현을 고치고 테스트는 고치지 않는다 — 단, 테스트가 틀린 경우는 예외."** 따라서 각 실패를 *stale 테스트* vs *실제 코드 버그* 로 먼저 분류했습니다.

### 1.2 Background — 검증된 근거 (2026-06-07 코드 직접 확인)

7개 실패는 4개 근본 원인 그룹으로 수렴합니다. 모든 분류는 모델/컨트롤러 소스를 직접 읽고 확정했습니다.

| 그룹 | 실패 위치 | 근본 원인 (검증) | 분류 |
|------|-----------|------------------|------|
| **G1 FSC seed drift** | `spec/models/fsc_rate_spec.rb:5`, `:22` | 모델 `DEFAULT_SEED_RATES`는 `Constants::Rates::DEFAULT_FSC_PERCENT = 50.25`(UPS, 2026-06-01 발효, 커밋 `aabcc7d`)를 사용 → **모델 정상**. 스펙이 옛 값 `48.5`를 하드코딩 → **테스트 stale** | 🔧 테스트 수정 |
| **G2 margin_percent 하한** | `spec/models/margin_rule_spec.rb:35`, `:63`, `spec/requests/api/v1/margin_rules_spec.rb:83` | 모델 `validates :margin_percent, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 50 }` → 4%가 **valid**. 스펙은 `>= 5`(4% reject) 기대 → 모델·스펙 하한 불일치 | ⚠️ **비즈니스 결정** + 테스트 subject 보강 |
| **G3 /auth/me 응답 형태** | `spec/requests/api/v1/auth_spec.rb:85` | 컨트롤러 `me`: `render json: { user: user_json(current_user) }` (중첩 envelope, login `:16`도 동일). 스펙은 top-level `body["email"]` 조회 → nil. **컨트롤러 계약 일관**(FE도 `data.user` 중첩 소비, 2026-06-07 확인). 테스트가 옛 평면 형태 가정 | 🔧 테스트 수정 (FE 중첩 확인 완료) |
| **G4 magic_link 발송 방식** | `spec/requests/api/v1/auth_spec.rb:175` | 컨트롤러 `:99` `AuthMailer.magic_link(...).deliver_now`. 스펙은 `have_enqueued_mail`(=`deliver_later`) 기대 → enqueued 0. **로그인 링크는 `deliver_now`가 더 안전**(인-리퀘스트 raise vs 백그라운드 silent 실패) → 코드 유지가 옳음 | 🔧 테스트 수정 (코드 무변경, 동기 검증) |

**보조 사실:**
- working tree clean — 7건 모두 내 변경과 무관한 **pre-existing**. `.bkit-memory.json`에 "7 실패는 전부 pre-existing"으로 기 기록.
- rubocop 1054 offenses(975 = `Style/StringLiterals`)는 **본 사이클 범위 밖**(별도 스타일 부채, §2.2).
- 최근 머지 `chat-security-hardening`(`ca82f69`)는 rubocop-clean·신규 12 test GREEN — 본 7건과 무관.

### 1.3 Related Documents

| Type | Link |
|------|------|
| Analysis (parent) | `docs/03-analysis/codebase-health-2026-06-06.analysis.md` |
| Memory | `project_smart_quote_emax_backend_test_infra_debt`(emax 유사 패턴), `feedback_schema_enum_drift`(상수 바인딩 교훈) |

---

## 2. Scope

### 2.1 In Scope

1. **G1 (FSC, 2건)** — `fsc_rate_spec.rb` 기대값을 하드코딩 `48.5` → `Constants::Rates::DEFAULT_FSC_PERCENT` / `DEFAULT_FSC_PERCENT_DHL` **소스 상수 바인딩**. (향후 FSC 갱신 시 자동 추종 → drift 재발 차단. `feedback_schema_enum_drift` 교훈 적용)
2. **G2 (margin, 3건)** — ✅ **R-1 결정 = B (하한 0% 유지, 2026-06-07 사용자 확정)**. 모델(`>= 0`)이 정상, **스펙 3건을 0% 계약에 맞게 수정**:
   - `margin_rule_spec.rb:35` shoulda matcher → `.is_greater_than_or_equal_to(0).is_less_than_or_equal_to(50)` + subject에 유효 `name` 부여(`subject { build(:margin_rule) }`)로 `name can't be blank` 간섭 제거
   - `margin_rule_spec.rb:63` "rejects margin below 5%" → 전제 무효(4%는 valid). 경계를 0% 계약으로 재작성(예: `margin_percent: -1` reject, `0`/`50` accept, `51` reject)
   - `margin_rules_spec.rb:83` invalid margin POST→422 → invalid 값을 실제 무효(예: `-1` 또는 `51`)로 교체해 422 경로 유지
3. **G3 (/auth/me, 1건)** — ✅ **FE 소비처 확인 완료(2026-06-07)**: `AuthContext.tsx`가 login/register/refresh 전부 `data.user`(중첩 envelope)로 읽고, `/auth/me`를 평면으로 소비하는 곳 0건 → 컨트롤러 `{ user: user_json }` 계약이 정상. **스펙을 `body.dig("user","email")` / `body.dig("user","role")` 중첩 조회로 수정**(컨트롤러 무변경).
4. **G4 (magic_link, 1건)** — ✅ **방향 = 코드 무변경, 스펙 수정**. 로그인 링크 메일은 `deliver_now`(인-리퀘스트 raise, 백그라운드 silent 실패 회피)가 **더 안전·일관**(7건 중 6건이 prod 동작 보존 원칙). 스펙을 동기 검증으로 교체: `expect { post ... }.to change { ActionMailer::Base.deliveries.count }.by(1)`. → **R-2(큐 어댑터 의존) 완전 제거**.
5. **재발 방지 평가** — 백엔드 rspec을 `ci.yml`에 게이트로 추가할지 §4 R-3에서 결정(별도 job + Postgres 서비스 필요).

### 2.2 Out of Scope

- **rubocop 1054 offenses** — 스타일 부채, 별도 정리 PR(`bundle exec rubocop -a`). 본 사이클은 rspec 한정.
- **프론트엔드** — `/check` 전부 GREEN, 무변경.
- **신규 테스트 커버리지 확대** — 본 사이클은 *기존 실패 복구*만. 커버리지 증대는 후속.
- **계산 오케스트레이터/rescue 리팩터** — parent 분석 HIGH 잔여, 별도 사이클.

---

## 3. Goals & Success Criteria

| # | 목표 | 측정 |
|---|------|------|
| SC-1 | rspec 7 failures → **0** | `bundle exec rspec` exit 0, **0 failures** (G2 경계 케이스 추가로 examples 수는 235에서 증가) |
| SC-2 | 회귀 0 | 나머지 228 통과 examples 유지 |
| SC-3 | FSC 스펙 drift 재발 차단 | 스펙이 소스 상수 참조(하드코딩 제거), 모의 FSC 변경 시 동반 추종 확인 |
| SC-4 | margin 하한 계약 일치 | 모델 검증 ↔ 스펙 ↔ 컨트롤러 422 응답 3자 정합 |
| SC-5 | rubocop 회귀 0 | 변경 파일 한정 `rubocop` 신규 offense 0 |
| SC-6 (stretch) | 백엔드 CI 게이트 | R-3 채택 시 `ci.yml`에 rspec job GREEN |

---

## 4. Open Decisions (Plan 차단 항목)

| ID | 결정 | 옵션 | 권고 | 영향 |
|----|------|------|------|------|
| **R-1** ✅ | margin_percent **하한 0% vs 5%** | A) 5% 하한 강제(모델 수정) / B) 0% 허용 유지(스펙 수정) | **확정 = B (2026-06-07 사용자)** — 0% 허용이 의도된 계약. G2 3건 전부 **테스트 수정** | 차단 해소 |
| ~~R-2~~ ✅ | magic_link 발송 방식 | ~~deliver_later 큐 어댑터~~ | **제거** — `deliver_now` 유지(코드 무변경)·스펙을 동기 검증으로 수정(advisor 권고) | 큐 의존 없음 |
| R-3 | 백엔드 rspec CI **전체** 편입 | 채택 / 보류 | **정밀화(2026-06-07)**: origin `ci.yml`에 `backend-rspec` job이 **이미 존재**(Postgres 16 service + `db:prepare`)하나 **line 59가 `auth_spec.rb`+`auth_mailer_spec.rb` 2개만 실행** → FSC/margin 등 나머지는 미게이트라 본 부채가 green CI 속에서 누적됨. 채택 = line 59를 `bundle exec rspec`(전체)로 확장. 본 브랜치 기준 전체 243/0이라 **안전**. 분리 사이클 `backend-ci-gate` | 작은 변경(1줄) but full suite 시간↑ |

> R-1 ✅ 해소(B). 남은 R-2(큐 어댑터)/R-3(CI 편입)은 Design~Do에서 해소 가능 — 차단 아님.

---

## 5. Implementation Order (예정 — Design에서 구체화)

```
1. G1 FSC 스펙 상수 바인딩        (가장 명확, 위험 0)        → RED 2건 GREEN
2. G3 /auth/me 스펙 중첩 조회     (FE 확인 완료, 컨트롤러 무변경) → RED 1건 GREEN
3. G4 magic_link 스펙 동기 검증   (코드 무변경, deliveries.count) → RED 1건 GREEN
4. G2 margin 스펙 0% 계약 정렬    (R-1=B, 스펙만 수정)        → RED 3건 GREEN
5. 전체 rspec 회귀 + rubocop(변경분) 확인
6. (R-3 채택 시) ci.yml rspec job 추가
```

TDD: 각 그룹은 이미 RED(실패) 상태 → 수정 후 GREEN 확인이 곧 red→green 사이클. **모든 수정은 스펙(테스트) 한정 — 프로덕션 코드 무변경**(7건 전부 stale 테스트/응답 형태 가정 오류). G2는 0% 계약 경계 케이스(−1/0/50/51) 회귀 테스트 보강.

---

## 6. Risks & Mitigations

| 리스크 | 영향 | 완화 | 상태 |
|--------|------|------|------|
| ~~R-1 미확정 시 G2 방향 오판~~ | 가격 정책 역행 | 사용자 확정 = B(0% 유지) | ✅ 해소 |
| ~~G4 `deliver_later` 큐 미가동~~ | 매직링크 미발송 | `deliver_now` 유지(코드 무변경)·스펙만 수정 | ✅ 해소 |
| G3 FE가 평면 `/auth/me` 기대 | `/auth/me` 소비 FE 깨짐 | FE grep 확인 완료 — 전부 `data.user` 중첩, 컨트롤러 무변경 | ✅ 확정 |
| 백엔드 미게이트 → 수정 후에도 재드리프트 | 동일 부채 반복 | R-3(CI 편입) 채택 검토 — silently drop 금지 | ⏳ Design |
| rubocop autocorrect 범위 누출 | 무관 파일 대량 diff | 변경 파일만 `rubocop`, 전역 `-a` 금지 | ⏳ Do |

---

## 7. Test Plan

- **단위(model)**: `fsc_rate_spec`(상수 바인딩), `margin_rule_spec`(하한 경계 4/5/50/51 + subject name)
- **요청(request)**: `auth_spec`(/me 중첩, magic_link enqueue), `margin_rules_spec`(invalid → 422)
- **회귀**: `bundle exec rspec` 전체 235 examples 0 failures
- **정적**: 변경 파일 `bundle exec rubocop <files>` offense 0
- **검증 게이트(필수)**: 임의로 한 스펙 기대값을 깨뜨려 RED 확인 → 복구(GREEN) 로 테스트가 실제 동작함을 증명(`feedback_fail_injection_pattern`)

---

## 8. Next Step

1. ~~R-1(margin 하한) 사용자 확정~~ ✅ 완료 = B(0% 유지, 스펙 수정)
2. `/pdca design backend-test-infra-debt` — 그룹별 수정 상세 + R-2(큐 어댑터)/R-3(CI 편입) 해소
3. `/pdca do backend-test-infra-debt` — TDD red→green 순서 구현 (G1→G3→G4→G2)
