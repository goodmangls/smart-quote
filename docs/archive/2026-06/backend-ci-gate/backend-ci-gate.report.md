---
template: report
version: 1.1
feature: backend-ci-gate
date: 2026-06-07
author: jhlim725
project: j-ways-smart-quote-system
status: complete
---

# backend-ci-gate Completion Report

> **Status**: Complete (PR #32 merged `c6ffe4e` + backend-rspec CI 243/0 실측 + fail-injection 게이트 증명)
>
> **Project**: j-ways-smart-quote-system (Goodman GLS / J-Ways, bridgelogis.com)
> **Author**: jhlim725
> **Completion Date**: 2026-06-07
> **PDCA Cycle**: Plan → Do → Report (Check = CI 실측 + fail-injection; Design 생략 — CI 1줄)
> **Parent**: `backend-test-infra-debt` R-3

---

## 1. Summary

| Item | Content |
|------|---------|
| Feature | backend-ci-gate (백엔드 rspec CI 게이트 전체 확장) |
| Source | `backend-test-infra-debt` Report §5 R-3 |
| PR | #32 `c6ffe4e` (admin squash merge, base main) |
| 결과 | `backend-rspec` job이 전체 `bundle exec rspec` 실행 → **243 examples, 0 failures** |
| 기능 코드 | 무변경 (diff = `ci.yml` + PDCA 문서/메타) |

### 1.1 What shipped

`.github/workflows/ci.yml` `backend-rspec` step:
- **이전**: `bundle exec rspec spec/requests/api/v1/auth_spec.rb spec/mailers/auth_mailer_spec.rb` (auth 2개만)
- **이후**: `bundle exec rspec` (전체 18 파일 / 243 examples)
- DB 셋업: `db:prepare` → **`db:test:prepare`** (시드 없는 스키마 로드)

## 2. ⚠️ Key Finding — 로컬 green ≠ CI green (시드 오염)

이 사이클의 핵심 가치이자 학습.

| 단계 | 내용 |
|------|------|
| 증상 | 확장 후 첫 CI: `backend-rspec` **7 failures** (로컬은 243/0) |
| 실패 | `margin_rules_spec`(rules.length 2→**16**, resolve KR Heavy→"한국 국적 ≥20kg", fallback 24→32) + `margin_rule_resolver_spec` 4건 — 전부 **시드된 한국어 룰** 흔적 |
| 진단 | CI의 `bundle exec rails db:prepare`가 **청정 test DB에 시드 실행**(`db/seeds.rb` → `db/seeds/margin_rules.rb` 14 룰). `use_transactional_fixtures`(rails_helper:46)는 각 test 트랜잭션만 롤백 → **시드는 트랜잭션 밖 커밋**이라 영구 잔존, factory 기반 margin spec 오염 |
| 왜 로컬은 통과? | 로컬 test DB는 이미 존재(prepared) → `db:prepare`가 migrate만 하고 시드 스킵 → 시드 없는 상태로 통과 |
| 수정 | `db:prepare` → `db:test:prepare`(스키마만, 시드 없음). suite 설계(factory + `maintain_test_schema!`)와 정합. Postgres service가 DB 생성하므로 `db:create` 불필요 |
| 결과 | 재push → `backend-rspec` **243/0 GREEN** |

## 3. Verification (Check)

| 게이트 | 결과 |
|--------|------|
| ① 확장 push CI | `backend-rspec` 7 fail → 시드 오염 노출(=확장이 새 spec 실행 증명) |
| ② `db:test:prepare` 수정 후 CI | **243 examples, 0 failures** GREEN |
| ③ **fail-injection** (`fsc_rate_spec` `47.25`→`99.99`) | `backend-rspec` **RED** — 정확히 `fsc_rate_spec:48` 포착. 게이트가 **새로 커버된 spec** 실패를 잡음 실증 |
| ④ revert 후 CI | **GREEN** → merge |
| 머지 net diff | `ci.yml`+plan+meta (injection/revert 상쇄, fsc 누수 0) |
| 전 CI job | green — `backend-rspec`·`check`·`e2e`·`lighthouse` |

## 4. Lessons Learned

1. **CI `db:prepare`는 청정 DB에 시드한다** — 트랜잭션 fixtures 밖 커밋이라 factory 기반 spec을 오염. 테스트 DB 셋업은 **`db:test:prepare`**(스키마만)를 쓴다. → [[feedback_ci_seed_pollution_db_test_prepare]]
2. **로컬 green ≠ CI green** — 로컬은 기존 prepared DB(시드 없음), CI는 매번 fresh DB(시드 실행). 환경 차이로 로컬 통과 spec이 CI에서 실패. CI 게이트 확장의 검증은 **반드시 CI 실측**.
3. **부분 CI 게이트는 함정을 숨긴다** — `backend-rspec`가 auth 2개만 돌 땐 이 시드 오염이 드러나지 않았다. 전체로 확장하자 즉시 노출. 게이트는 커버리지로 평가.
4. **fail-injection으로 게이트 실동작 증명** — green만으로는 "게이트가 실패를 잡는다"가 미증명. 새 커버 spec을 일시 파손→RED→revert→GREEN. → [[feedback_fail_injection_pattern]]

## 5. Follow-up

| 항목 | 상태 |
|------|------|
| backend-test-infra-debt R-3 (CI 게이트) | ✅ **완료** (본 사이클) |
| rubocop 1054 offenses 정리 | ⏳ 범위 밖, 별도 PR 후보 |
| `db/seeds/*` 멱등성/test-guard 점검 | 참고 — 현재 `db:test:prepare`로 회피, seeds.rb 자체는 무변경 |

## 6. Artifacts

| Type | Path |
|------|------|
| Plan | `docs/01-plan/features/backend-ci-gate.plan.md` |
| Report | `docs/04-report/features/backend-ci-gate.report.md` (this) |
| PR | #32 `c6ffe4e` |
