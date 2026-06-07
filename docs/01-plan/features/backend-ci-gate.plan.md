---
template: plan
version: 1.1
feature: backend-ci-gate
date: 2026-06-07
author: jhlim725
project: j-ways-smart-quote-system
status: draft
---

# backend-ci-gate Plan

> **Status**: Draft
> **Project**: j-ways-smart-quote-system (Goodman GLS / J-Ways, bridgelogis.com)
> **Author**: jhlim725
> **Created**: 2026-06-07
> **PDCA Phase**: Plan
> **Parent**: `backend-test-infra-debt` (archived 2026-06-07) 후속 R-3
> **Source**: `docs/archive/2026-06/backend-test-infra-debt/` Report §5, [[project_smart_quote_backend_test_infra_debt_completed]]

---

## 1. Overview

### 1.1 Purpose

`ci.yml`의 `backend-rspec` job은 **이미 존재**(Postgres 16 service + `db:prepare`)하나 **`auth_spec.rb`+`auth_mailer_spec.rb` 2개만** 실행한다. 그 결과 FSC·margin 등 나머지 spec은 **green CI 속에서 미게이트**로 드리프트가 누적됐다(= 직전 `backend-test-infra-debt` 사이클의 부채 원인). 본 사이클은 **`backend-rspec` job을 전체 스위트로 확장**해 재발을 구조적으로 차단한다.

### 1.2 Background — 검증된 근거 (2026-06-07)

| 사실 | 근거 |
|------|------|
| `backend-rspec` job 존재, line 59가 auth 2개만 실행 | `.github/workflows/ci.yml` (main `5c72cf9`) |
| 전체 스위트는 현재 main에서 green | 로컬 `bundle exec rspec` → **243 examples, 0 failures** (재검증) |
| chat_spec는 외부 API 미호출 | `spec/requests/api/v1/chat_spec.rb:13` `allow(ENV)…with("ANTHROPIC_API_KEY").and_return(nil)` |
| secret 직접 의존 spec 0건 | `grep ENV[.(ANTHROPIC\|SLACK\|EIA\|RESEND\|SMTP)] spec/` → 없음 |
| spec 파일 18개 / examples 243 | 측정 |

### 1.3 Related

| Type | Link |
|------|------|
| Parent Report | `docs/archive/2026-06/backend-test-infra-debt/backend-test-infra-debt.report.md` |
| Memory | [[project_smart_quote_backend_test_infra_debt_completed]] |

---

## 2. Scope

### 2.1 In Scope

1. **CI 확장**: `ci.yml` `backend-rspec` step의 `bundle exec rspec spec/requests/api/v1/auth_spec.rb spec/mailers/auth_mailer_spec.rb` → `bundle exec rspec` (전체 스위트).
2. **CI-환경 정합 보장**: 전체 스위트가 청정 CI 환경(Postgres 신규·seed 없음·외부 키 없음)에서 green인지 PR CI로 **실증**. 청정 환경 전용 실패가 나오면 그 원인만 최소 수정(누락 env var 추가 / 외부 의존 spec mock 보강 / 필요 시 seed step). 기능 코드 변경 없음.

### 2.2 Out of Scope

- 신규 테스트 추가·커버리지 확대 (별도)
- rubocop 1054 offenses 정리 (별도 PR)
- 프론트 CI / e2e / lighthouse 변경
- rspec 기능 코드 리팩터

---

## 3. Goals & Success Criteria

| # | 목표 | 측정 |
|---|------|------|
| SC-1 | `backend-rspec` job이 **전체 스위트** 실행 | `ci.yml` step = `bundle exec rspec` (파일 인자 없음) |
| SC-2 | PR CI에서 `backend-rspec` **green** | GitHub Actions `backend-rspec` pass, 전체 examples 0 failures |
| SC-3 | 재발 차단 실증 | FSC/margin spec이 이제 CI에서 실행됨(로그에 해당 example 카운트 반영) |
| SC-4 | 기능 코드 무변경 | diff = `ci.yml` (+ 필요 시 CI-env 보강분만) |

---

## 4. Risks & Mitigations

| 리스크 | 영향 | 완화 |
|--------|------|------|
| 청정 CI 환경 전용 실패(seed/시간/locale 의존 spec) | backend-rspec red | PR CI로 실증 후 원인별 최소 수정. 로컬 243/0 + 외부 의존 mock 확인됨 → 저위험 |
| 전체 스위트로 CI 시간 증가 | PR 피드백 지연 | 현재 전체 ~3–5초(로컬) 수준, 영향 미미. 필요 시 `--fail-fast` 미사용 유지 |
| 누락 env var(예: 일부 request spec) | 일부 spec red | job env에 이미 auth/CORS/cookie 세트 존재. 부족분만 추가 |
| seed 의존 spec | red | 현재 factory 기반이라 미예상. 발생 시 `db/seeds/addon_rates.rb` step 추가 검토 |

> 핵심: 본 사이클의 **검증은 PR의 CI 실행 그 자체**. 로컬 green ≠ CI green 일 수 있으므로(직전 사이클 교훈: 환경 차이) 머지 전 `backend-rspec` job의 실제 green을 확인.

---

## 5. Implementation Order

```
1. ci.yml backend-rspec step → 전체 rspec 로 확장 (1줄)
2. 브랜치 push → PR 생성 → backend-rspec CI 관측
3. (청정 환경 실패 시) 원인별 최소 수정 (env/mock/seed) → 재실행
4. backend-rspec green 확인 → admin merge
```

TDD 변형: "CI 게이트가 실제로 실패를 잡는가"를 fail-injection으로 1회 증명 권장 — 임시로 한 spec 기대값을 깨 PR에 올려 `backend-rspec` red 확인 → 복구(green). (`feedback_fail_injection_pattern`)

---

## 6. Next Step

1. `/pdca do backend-ci-gate` — ci.yml 1줄 확장 → PR → CI 실증
2. (선택) `/pdca design` 생략 — 변경이 CI 설정 1줄이라 Plan→Do 직행
