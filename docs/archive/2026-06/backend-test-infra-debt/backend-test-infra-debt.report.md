---
template: report
version: 1.1
feature: backend-test-infra-debt
date: 2026-06-07
author: jhlim725
project: j-ways-smart-quote-system
status: complete
---

# backend-test-infra-debt Completion Report

> **Status**: Complete (PR #30 merged 38d28bc + CI 전 job green + origin 기반 rspec 243/0 검증)
>
> **Project**: j-ways-smart-quote-system (Goodman GLS / J-Ways, bridgelogis.com)
> **Author**: jhlim725
> **Completion Date**: 2026-06-07
> **PDCA Cycle**: Plan → Do → Report (Check = origin 기반 전체 rspec + CI; Design 생략 — 스펙 한정)

---

## 1. Summary

### 1.1 Overview

| Item | Content |
|------|---------|
| Feature | backend-test-infra-debt (smart-quote-api rspec pre-existing 실패 복구) |
| Source | `/check`(2026-06-07) — 백엔드 rspec 만성 실패(CI 부분 게이트) |
| Method | 스펙 한정 정렬, 프로덕션 코드 무변경 |
| PR | #30 `38d28bc` (admin squash merge, base main) |
| 결과 | origin 기반 전체 rspec **243 examples, 0 failures**, 회귀 0 |

### 1.2 What shipped (G1·G2)

| 그룹 | 파일 | 수정 | 근거 |
|------|------|------|------|
| **G1 FSC** | `spec/models/fsc_rate_spec.rb` | UPS/DHL 기대값 하드코딩(48.5/46.0) → `Constants::Rates::DEFAULT_FSC_PERCENT`/`_DHL`(50.25/48.75) 바인딩 | 모델은 상수 시드(정상), 스펙만 옛 값 stale. `have_attributes` 첫 불일치로 가려졌던 DHL stale도 동반 해소 |
| **G2 margin** | `spec/models/margin_rule_spec.rb`, `spec/requests/api/v1/margin_rules_spec.rb` | 하한 `5`→`0`, `subject { build(:margin_rule) }`(shoulda matcher `name` 간섭 제거), request invalid `3`→`-1` | 모델 `margin_percent >= 0`(정상), 스펙만 `>= 5` 기대. R-1 결정 = **0% 허용 유지**(사용자) |

## 2. ⚠️ Key Event — origin/main 재조정

이 사이클의 가장 중요한 사건이자 학습.

| 단계 | 내용 |
|------|------|
| 문제 | 분석·구현을 **9커밋 behind인 로컬 main**(f240b10)에서 수행. `/check`의 "7 failures"는 stale 트리 기준 |
| 발견 | 커밋 직전 `git fetch` 후 origin/main의 9커밋(#21·#24·#25·#29 magic_link·auth 하드닝)이 **`auth_spec.rb`를 이미 변경**함을 확인 |
| 진단 | `git show origin/main:…auth_spec.rb` → origin은 **G3(`/auth/me` 중첩 `body["user"]["email"]`)·G4(magic_link `deliveries.count`)를 동등하게 이미 해결**. 내 G3/G4는 중복·충돌 |
| 조치 | G3/G4 **폐기**, origin에도 여전히 실패하는 **G1/G2만** origin/main 기반 신규 브랜치에 재적용. 모델/상수(margin>=0, FSC 50.25/48.75) origin 동일 확인 → G1/G2 유효 |
| 결과 | origin 기반 전체 rspec **243/0** (origin이 8 example 추가로 235→243) |

## 3. Verification (Check)

| 게이트 | 결과 |
|--------|------|
| origin 기반 전체 `bundle exec rspec` | ✅ **243 examples, 0 failures** |
| 회귀 | ✅ 0 |
| `rubocop` 변경 파일(3 spec) | ✅ 0 offenses |
| 프로덕션 코드 | ✅ 무변경 (diff = 3 spec + PDCA 문서/메타) |
| CI (PR #30) | ✅ 전 job green — `check`(FE) / `backend-rspec` / `e2e` / `lighthouse` |

> 주의: CI `backend-rspec` job은 **`auth_spec.rb`+`auth_mailer_spec.rb` 2개만** 실행 → 내 G1/G2 스펙은 CI에서 직접 검증되지 않음. 전체 검증은 **로컬 origin 기반 rspec 243/0**으로 수행.

## 4. Lessons Learned

1. **측정 전 동기화 필수** — 로컬이 9커밋 behind인 채 분석하면 이미 해결된 문제를 재작업하게 된다. 분석/측정 전 `git fetch` + behind 카운트 확인을 선행. → [[feedback_concurrent_push_pattern_2026_05_30]]
2. **`have_attributes`는 첫 불일치에서 멈춘다** — UPS만 실패로 보였으나 수정 후 DHL stale이 드러남. 다중 기대 매처는 가려진 후속 실패를 가정하고 전수 점검.
3. **테스트를 source에 바인딩** — FSC 값을 하드코딩 대신 `Constants::Rates` 상수로 바인딩 → 다음 FSC 갱신 시 drift 재발 0. → [[feedback_schema_enum_drift]]
4. **CI 부분 게이트의 함정** — `backend-rspec` job이 존재해도 auth 2개만 실행하면 FSC/margin 실패가 green CI 속에서 누적된다. 게이트는 "있다/없다"가 아니라 "무엇을 커버하나"로 평가.

## 5. Follow-up

| ID | 항목 | 상태 |
|----|------|------|
| **R-3** | `backend-ci-gate` 분리 사이클 — `ci.yml` `backend-rspec` job line 59를 `bundle exec rspec`(전체)로 확장. 본 머지로 전체 243/0이라 안전. 재발 차단의 핵심 | ⏳ 미시작 |
| 참고 | rubocop 1054 offenses(975 StringLiterals)는 본 사이클 범위 밖 — 별도 정리 PR | ⏳ |

## 6. Artifacts

| Type | Path |
|------|------|
| Plan | `docs/01-plan/features/backend-test-infra-debt.plan.md` |
| Report | `docs/04-report/features/backend-test-infra-debt.report.md` (this) |
| PR | #30 `38d28bc` |
