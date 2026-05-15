---
feature: smart-quote-input-validation
date: 2026-05-15
phase: plan
parent_cycle: smart-quote-code-analysis-2026-05-15 (Health 7.8/10 P0 후보)
revision: α
status: draft
---

# Plan — smart-quote-input-validation (rev α)

## §0. 컨텍스트

- bkit:code-analyzer 종합 분석 (2026-05-15) Overall Health 7.8/10 의 **P0 후보 #1** `input-validation-debt`.
- P0 후보 #2 `bundle-optimization-auth` 는 PR #15 `08cf7ff` 머지로 완료.
- 본 사이클 목표: **런타임 입력 검증 강화** — 프론트 Zod 도입 + 백엔드 검증 강화.

## §1. 목표 (success criteria)

- ✅ Frontend: `QuoteInput`, `QuoteListParams`, 인증 입력 등 **공개 입력 경로** 에 Zod 런타임 검증
- ✅ Backend: `validate_quote_input!` 메서드 확장 (40+ 필드 type/range 검증) — 또는 dry-validation 도입
- ✅ 검증 실패 시 사용자 친화적 에러 메시지 + 적절한 HTTP status (400 Bad Request)
- ✅ XSS/injection 회피: 문자열 입력 길이 제한, 숫자 입력 범위 제한
- ✅ Tests: Zod schema 단위 테스트 + Rails RSpec 검증 케이스 추가
- ✅ 회귀 0: 기존 정상 입력은 모두 통과 (1366 vitest + RSpec PASS 유지)

## §2. 현재 상태 (분석 결과)

### Frontend

- `src/types.ts` line 26-85: `QuoteInput` interface 40+ 필드 (타입만)
- `package.json`: **Zod 미설치**
- API 호출 시 (`src/api/quoteApi.ts`) 입력 검증 없음 — 백엔드에만 의존
- 폼 컴포넌트 (`InputSection`, `QuoteCalculator`) 도 시각적 검증만, 런타임 schema 없음

### Backend (`quotes_controller.rb`)

- line 178-189 `validate_quote_input!`: **얕은 검증**
  - destinationCountry 존재 여부만
  - items[*].weight > 0 만
  - 그 외 30+ 필드 (incoterm enum, exchangeRate 범위, fscPercent 0-100, items.length/width/height, marginPercent 범위 등) 미검증
- line 192-210 `clean_params` (strong_params): 필드 허용리스트만, 타입/범위 검증 없음

## §3. 옵션 매트릭스

### Frontend 검증 라이브러리

| 옵션           | 크기 (gzip) | 장점                                  | 단점                     |
| -------------- | ----------- | ------------------------------------- | ------------------------ |
| **Zod** (권장) | ~13 kB      | TS 표준, infer type 강력, 생태계 풍부 | 크기 중간                |
| valibot        | ~3 kB       | 가벼움, modular                       | 생태계 작음, infer 제한  |
| yup            | ~17 kB      | 성숙                                  | TS 통합 약함             |
| 자체 (no lib)  | 0 kB        | 의존성 0                              | 유지보수 부담, 보안 위험 |

→ **Zod 채택** (`zod` ^3.x — 13 kB gzip 허용, 코드베이스 무관 TS-first)

### Backend 검증 전략

| 옵션                                        | 장점                      | 단점                                 |
| ------------------------------------------- | ------------------------- | ------------------------------------ |
| **`validate_quote_input!` 확장** (권장 1차) | 기존 코드 호환, 점진 도입 | 코드 길어짐                          |
| dry-validation gem                          | 표준화, 풍부한 DSL        | 신규 의존성, 학습 곡선               |
| ActiveModel::Validations                    | Rails 표준                | 모델 클래스 필요 (현재 service 기반) |

→ **확장 우선** (1차) + dry-validation 도입은 **별 사이클 후보** (큰 변경)

## §4. 작업 분해 (do 후보)

### Phase A — Frontend Zod 도입

- **A1**: `npm install zod` (devDependencies 또는 dependencies — UI 검증 시 prod 필요)
- **A2**: `src/lib/schemas/quoteInput.schema.ts` 생성
  - `cargoItemSchema` (CargoItem)
  - `quoteInputSchema` (QuoteInput) — `z.infer<>` 로 type 도출
  - `quoteListParamsSchema` (QuoteListParams)
- **A3**: `src/api/quoteApi.ts` 의 `calculateQuote`, `saveQuote`, `listQuotes` 등 함수에서 호출 직전 schema.parse() 적용
- **A4**: 검증 실패 시 사용자 친화적 에러 메시지 변환 (`zodErrorToString`)
- **A5**: 단위 테스트: `src/lib/schemas/__tests__/quoteInput.schema.test.ts` — 정상/경계/실패 케이스
- **A6**: 기존 type `QuoteInput` → `z.infer<typeof quoteInputSchema>` 로 치환 (단일 진실)

### Phase B — Backend 검증 확장

- **B1**: `validate_quote_input!` 메서드 확장 (string length, number range, enum membership)
  - originCountry: ISO 2 letter
  - destinationCountry: ISO 2 letter
  - destinationZip: < 20 char
  - incoterm: enum membership (DAP/DDP/EXW/FOB)
  - packingType: enum membership
  - marginPercent: 0-100
  - exchangeRate: > 0, < 10000
  - fscPercent: 0-200
  - items[*]: length/width/height > 0, < 1000 (cm)
- **B2**: 새 RSpec 케이스 추가 `spec/requests/api/v1/quotes_spec.rb` — 각 검증 실패 → 400 + 적절한 메시지
- **B3**: clean_params 의 typecast 검토 (numeric 변환 등)

### Phase C — 통합 검증

- **C1**: 프론트 + 백엔드 schema 일치 검토 (수동 mapping, 자동화는 별 사이클)
- **C2**: 로컬 dev 서버 + Rails API 실제 호출 — 정상/실패 케이스 모두 검증
- **C3**: `npm run lint` / `npx tsc --noEmit` / `npx vitest run` 회귀 확인
- **C4**: Rails `bundle exec rspec` 회귀 확인

### Phase D — PR + 머지

- **D1**: Branch `feature/input-validation-frontend-zod` (A1-A6)
- **D2**: Branch `feature/input-validation-backend` (B1-B3) — 별 PR
- **D3**: 통합 검증은 양쪽 머지 후 main 에서

## §5. 리스크

- **R1**: Zod schema 가 기존 데이터와 불일치 시 production 회귀 — Phase A6 (단일 진실) 시 기존 사용처 broken 가능. 점진 도입 권장
- **R2**: 백엔드 검증 강화가 기존 production 데이터 (이미 저장된 quote) 와 충돌 — 신규 입력 경로만 적용, GET/PATCH 는 별도
- **R3**: Zod 13 kB gzip 추가 — 번들 크기 영향. PR #15 청크 최적화 후 측정
- **R4**: 프론트/백엔드 schema 불일치 가능성 — OpenAPI/JSON Schema 자동 생성은 별 사이클 (`schema-codegen`)

## §6. 진행 전략 (사용자 결정 필요)

### 전략 X — 단일 PR (Phase A+B 묶음)

- 장점: 통합 검증 일관, 한 번에 해소
- 단점: PR 큼, review 부담

### 전략 Y — 분리 PR (recommended)

- Phase A 프론트 Zod 1차 PR → Phase B 백엔드 확장 2차 PR → 별 사이클 OpenAPI 통합 자동화
- 장점: review 부담 적음, 부분 실패 격리
- 단점: 통합 검증 두 번

### 전략 Z — 프론트 Zod 만 즉시

- Phase A 만 1차 사이클, Phase B 별 사이클
- 장점: P0 의 즉시 가치 (런타임 검증) 달성, 백엔드는 기존 검증 유지
- 단점: 보안 가치는 백엔드 검증 강화가 더 큼

## §7. 다음 행동

본 plan 검토 후:

- 전략 결정 → `/pdca design smart-quote-input-validation` 또는 분리 사이클 plan

## §8. 관련 자료

- 분석 메모리: `project_smart_quote_code_analysis_2026_05_15_candidates.md`
- 머지된 P0: PR #15 `08cf7ff` (bundle-optimization-auth)
- 코드 위치:
  - Frontend: `src/types.ts` (QuoteInput line 26-85), `src/api/quoteApi.ts`
  - Backend: `smart-quote-api/app/controllers/api/v1/quotes_controller.rb` line 178-210
- Zod 공식: https://zod.dev/
