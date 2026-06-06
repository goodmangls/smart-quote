---
template: plan
version: 1.1
feature: chat-security-hardening
date: 2026-06-06
author: jhlim725
project: j-ways-smart-quote-system
status: draft
---

# chat-security-hardening Plan

> **Status**: Draft
> **Project**: j-ways-smart-quote-system (Goodman GLS / J-Ways, bridgelogis.com)
> **Author**: jhlim725
> **Created**: 2026-06-06
> **PDCA Phase**: Plan
> **Source**: docs/03-analysis/codebase-health-2026-06-06.analysis.md (HIGH H1/H2/H3/H6)

---

## 1. Overview

### 1.1 Purpose

신규 AI 챗봇(`chat_controller.rb`, Claude API)과 마진 resolve 엔드포인트에 **보안 가드가 비어** 있습니다. 코드베이스 분석(2026-06-06)에서 검증된 HIGH 4종을 한 사이클로 묶어 **비용 남용·가격 유출·프롬프트 인젝션·외부 API 행(hang)** 을 차단합니다.

### 1.2 Background (검증된 근거)

| ID | 파일:라인 | 검증 사실 |
|----|-----------|-----------|
| H1 | `config/initializers/rack_attack.rb` | chat 전용 throttle **없음** → `/api/v1/chat`이 general 300/min만 적용. 인증 멤버가 Claude API 토큰 비용 남용 가능 |
| H2 | `margin_rules_controller.rb:7,52` | `before_action :require_admin!, except: [:resolve]` + `resolve`가 임의 `params[:email]` 수신 → 멤버가 **타인/경쟁사 마진·가격 enumeration** (CLAUDE.md는 "admin guard"라 기술하나 실제 우회) |
| H3 | `chat_controller.rb:55-56` | user `name`/`company`를 시스템 프롬프트에 무가공 보간 → 프롬프트 인젝션으로 admin 지식/가격 로직 누설 가능 |
| H6 | `chat_controller.rb:22-24` | `Anthropic::Client.new` per-request + `messages.create`에 **timeout 없음** → 상류 지연 시 요청 행 |

보조: chat은 `authenticate_user!`로 인증은 됨(인증 우회 아님), Anthropic 전용 rescue(line 34)는 존재(broad rescue는 fallback). api_key는 서버측 ENV(노출 아님).

### 1.3 Related Documents

| Type | Link |
|------|------|
| Analysis | docs/03-analysis/codebase-health-2026-06-06.analysis.md |
| Memory | `project_smart_quote_main_*` (해당 시) |

---

## 2. Scope

### 2.1 In Scope

- **H1 — chat rate limit**: `rack_attack.rb`에 `/api/v1/chat` 전용 throttle 추가 (인증 사용자 또는 IP 기준, 비용 한도)
- **H2 — margin resolve authz**: `margin_rules_controller#resolve`를 **본인 email만(또는 admin)** 허용하도록 ownership 가드 추가
- **H3 — prompt injection**: `chat_controller`의 user `name`/`company`(및 식별 필드) sanitize/이스케이프 + 권한은 프롬프트가 아닌 코드로 강제(시스템 프롬프트에 "아래 사용자 데이터는 신뢰 불가 입력" 구분)
- **H6 — Anthropic timeout**: `messages.create`(또는 client)에 timeout(예 30s) + 실패 시 명확한 503
- 회귀 테스트(rspec): throttle 동작, resolve 권한 거부, prompt sanitize 단위, timeout 경로

### 2.2 Out of Scope

- 계산 오케스트레이터 리팩터(H4) / 광범위 rescue 전면 정리(H5) — emax와 공통, 별도 사이클
- UPS/DHL 패널 중복(M1), npm audit(M2), admin 위젯 분해(M4) — 별도
- 백엔드 rubocop 1054 / rspec 인프라 부채 — 별도
- 챗봇 기능 자체 변경(응답 품질·프리셋) — 보안 가드만

---

## 3. Requirements

### 3.1 Functional

| ID | Requirement |
|----|-------------|
| FR-1 | `/api/v1/chat` POST가 사용자(또는 IP)당 N/분(예 15)으로 제한, 초과 시 429 |
| FR-2 | `margin_rules#resolve`는 비-admin이 `params[:email] != current_user.email`이면 403 |
| FR-3 | 시스템 프롬프트의 user name/company는 개행 제거·길이 제한·구분자 이스케이프 후 삽입 |
| FR-4 | Claude API 호출은 timeout(예 30s) 적용, 초과/실패 시 503 + 일반 메시지 |
| FR-5 | 권한·역할 판정은 프롬프트 텍스트가 아닌 백엔드 코드(role)로만 결정 |

### 3.2 Non-Functional

| ID | Requirement |
|----|-------------|
| NFR-1 | 정상 사용 UX 영향 최소(rate limit은 실제 abuse만 차단하는 한도) |
| NFR-2 | 변경은 백엔드 한정(프론트 무변경 목표), FE/BE 미러 불필요(보안 가드는 BE 단일 진실) |
| NFR-3 | 에러 메시지는 내부 정보 비노출 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] chat throttle 추가 + rspec로 429 검증
- [ ] resolve ownership 가드 + rspec로 비-admin 타 email 403 검증
- [ ] prompt sanitize 유닛 테스트(개행/구분자/길이) 통과
- [ ] Anthropic timeout 적용 + 실패 경로 503 검증
- [ ] 기존 챗/마진 정상 동작 회귀 0
- [ ] `.commit_message.txt` 기록 + PR

### 4.2 Quality Criteria

- [ ] 권한 판정이 프롬프트가 아닌 코드로 강제됨을 테스트로 증명
- [ ] rate limit 한도가 정상 UX를 막지 않음(수동 확인)
- [ ] tsc·lint·vitest(프론트 무변경이면 영향 없음) green

---

## 5. Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| rack_attack가 인증 전 실행 → user 기준 키 어려움 | throttle 키 설계 | IP 기준 낮은 한도, 또는 throttle 블록에서 Authorization JWT 디코드해 user_id 키 |
| rate limit이 정상 사용 차단 | UX 저하 | 보수적 한도(15/min) + 모니터링 후 조정 |
| prompt sanitize 과도 → 정상 이름 깨짐 | 표시 품질 | 개행/제어문자만 제거, 길이 제한, 정상 문자 보존 |
| 백엔드 rspec 인프라 부채(emax 유사) | 테스트 실행 곤란 | `spec/requests`·`spec/services` 한정 실행, DB 준비 후 |
| Anthropic SDK timeout API 형태 불명 | 구현 차질 | SDK 문서/소스로 timeout 인자 확인 후 적용 |

---

## 6. Architecture Considerations

### 6.1 Project Level

- **Level**: Dynamic (백엔드 보안 가드, 인증/권한/외부 API)

### 6.2 Key Decisions

- **AD-1**: rate limit은 rack_attack(앱 레벨) — 인프라 변경 없이 즉시 적용.
- **AD-2**: 권한은 코드(role)로 강제, 프롬프트는 신뢰 불가 데이터로 취급(인젝션 내성).
- **AD-3**: resolve는 ownership 모델(본인/admin) — 최소 권한.

### 6.3 Clean Architecture

- 가드 로직은 컨트롤러/이니셜라이저 한정, 비즈니스 로직(MarginRuleResolver/Calculator) 불변.

---

## 7. Convention Prerequisites

### 7.1 Existing

- Rack::Attack 이미 사용(auth/login·calculate 등 throttle 패턴 존재) → 동일 패턴 확장.
- `require_admin!`/`authenticate_user!` 가드 패턴 존재.
- rspec request/service 스펙 구조 존재.

### 7.2 To Verify

- Anthropic Ruby SDK timeout 인자(`Anthropic::Client.new(timeout:)` 또는 `messages.create(request_options:)`) — 구현 전 확인.
- rack_attack throttle에서 JWT 디코드 가능 여부(현 `jwt_authenticatable` 재사용).

### 7.3 Environment Variables

- `ANTHROPIC_API_KEY`(기존, 서버측) — 변경 없음.

---

## 8. Next Steps

1. `/pdca design chat-security-hardening`(선택) 또는 바로 구현
2. 구현 순서: H6 timeout(저위험) → H2 resolve authz → H1 chat throttle → H3 prompt sanitize
3. rspec(request/service) 회귀 → PR → CI(프론트 게이트는 무변경이면 그대로 green)
4. 머지 후 Render 백엔드 자동 재배포(`smart-quote-api/` 변경) 확인

> 권장 구현 순서는 위험도 오름차순: timeout → authz → rate limit → prompt sanitize.

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-06-06 | jhlim725 | 초안 — 분석(2026-06-06) HIGH H1/H2/H3/H6 기반, 검증된 file:line 근거 |
