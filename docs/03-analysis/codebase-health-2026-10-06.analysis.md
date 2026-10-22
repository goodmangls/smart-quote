# 코드베이스 점검 — 2026-10-06

- 대상: smart-quote-main 전체(FE `src/`·`api/`, BE `smart-quote-api/`), HEAD `f089b9ba`
- 방법: 크기·의존성 감사·커버리지 기준선 + 읽기 전용 리뷰 3갈래(FE · BE · 보안/테스트). **HIGH 이상은 전부 코드·실행으로 재확인**했고, 확인 방법을 각 항목에 적었다.
- 직전 사이클: [codebase-health-2026-08-21](./codebase-health-2026-08-21.analysis.md) — 잔여는 `bundler-audit` CI 게이트 하나였고 **여전히 미도입**이다(이번 rubyzip CVE 가 그 게이트가 잡았을 사례).

## 총평: 6.5 / 10

계산 엔진·인증 기본기(매직링크·JWT 알고리즘 고정·쿠키 플래그·사용자별 스코프)는 견고하다. 문제는 **경계에서 새는 것**들이다 — 공개 저장소의 마스터 키, 멤버에게 나가는 원가·마진(export), 소유권 검사 없는 `customer_id`, 프로세스 메모리에만 있는 토큰 폐기 목록. 화면 쪽은 **비교 카드·리셋·복제가 메인 계산과 다른 입력으로 계산**하는 부류가 반복된다.

| 지표 | 값 |
|---|---|
| FE 커버리지(lines/branches) | 64.26% / 51.05% (08-21: 54.91%) — 게이트 51/40 |
| FE 테스트 | 91 파일 · 전부 통과(부하 시 5초 타임아웃 산발 — 코드 결함 아님) |
| BE rubocop | 0 offense / 79 파일 |
| 파일 크기 | FE 최대 482줄, BE 최대 428줄 — 800줄 초과 없음 |
| npm audit (런타임) | low 1 |
| npm audit (dev 포함) | critical 1(tar) · high 23(vite·postcss 직접) — **dev 서버/빌드 한정** |
| bundler-audit | **High 1: rubyzip 3.3.0** (CVE-2026-85396) |

## 🔴 CRITICAL

### C-1. 공개 저장소에 Rails `master.key` 가 커밋돼 있다
- `smart-quote-api/config/master.key` — 최초 커밋 `11258cd8` 부터 추적. `.gitignore:27` 은 나중에 추가돼 효과 없음. **저장소 `goodmangls/smart-quote` 는 PUBLIC**(gh 확인).
- `credentials.yml.enc` 의 키는 `secret_key_base` **하나**(값은 출력하지 않고 키 이름만 확인). `jwt_authenticatable.rb:108` 은 `credentials.secret_key_base` 를 **먼저** 쓴다.
- 따라서 **Render 의 `RAILS_MASTER_KEY` 가 커밋된 값과 같다면 JWT 서명 비밀이 공개된 것** → 누구나 admin 토큰을 위조할 수 있다. 다르면 복호화 실패 → `SECRET_KEY_BASE`(Render `generateValue`)로 폴백해 안전. **어느 쪽인지는 저장소로 판별 불가** — `render.yaml` 이 `sync: false`. 프로덕션에 위조 토큰을 쏘는 방식의 확인은 하지 않았다.
- 조치(판별과 무관하게 전부 수행): `git rm --cached config/master.key` → `bin/rails credentials:edit` 로 새 키·새 `secret_key_base` 재생성 → Render `RAILS_MASTER_KEY` 교체 → 재배포(기존 세션 전부 무효화됨). JWT 비밀은 credentials 가 아니라 `SECRET_KEY_BASE` 환경변수 하나만 보도록 단순화 권장. 히스토리 정리는 키 교체 후엔 선택.
- ✅ **해결(2026-10-06)**: JWT 는 `JwtAuthenticatable.signing_secret` 만 쓴다 — 프로덕션은 `ENV["SECRET_KEY_BASE"]`, 없으면 credentials 로 폴백하지 않고 `KeyError`. `master.key` 추적 해제, `credentials.yml.enc` 삭제(읽는 코드 없음). 환경변수만으로 프로덕션 부팅 확인. 스펙 `jwt_secret_spec.rb`(credentials 비밀로 서명한 토큰 → 401). **남은 운영 조치**: Render `RAILS_MASTER_KEY` 삭제 가능. 프로덕션이 유출 비밀로 서명하고 있었다면 배포 직후 전원 1회 재로그인.

## 🟠 HIGH

### H-1. 멤버의 견적 export 에 원가·마진이 실린다
- `app/services/quote_exporter.rb:8,66,69` — `Total Cost (KRW)`·`Margin %` 열을 호출자 역할과 무관하게 출력. `quotes_controller.rb#export` 에 admin 분기 없음.
- 직렬화에서 마진·원가를 빼 둔 정책(CLAUDE.md 「마진 노출 범위」)이 export 경로에서 뚫려 있다. `quote_margin_visibility_spec.rb` 는 list·detail·create 만 본다.
- 조치: 비 admin 이면 두 열 제외 + spec 에 export 케이스(CSV·xlsx) 추가.
- ✅ **해결(2026-10-06)**: `QuoteExporter.call(..., include_margin:)` 기본 `false`(deny-by-default), 컨트롤러는 `current_user.admin?` 를 넘긴다. 스펙: 멤버 CSV·xlsx 에 두 열과 원가 값이 없음, admin 은 유지. 결함주입으로 RED 확인.

### H-2. 남의 고객을 내 견적에 붙여 고객사명을 읽을 수 있다 (IDOR)
- `quotes_controller.rb:77`(create `customer_id: params[:customerId]`)·`:166`(update `permit(:customer_id)`). 고객은 다른 모든 경로에서 `scoped_customers`(멤버=본인 것)로 제한되는데 여기만 검사가 없다.
- 공격: 멤버가 `PATCH /quotes/:id {customer_id: N}` 을 N 을 바꿔가며 보내면 응답 `customerName`(`quote_serializer.rb:18,60`)으로 타 사용자 고객사명을 열거. 피해자 쪽 `recentQuotes` 에도 남의 견적이 섞인다.
- 조치: 대입 전 `scoped_customers.find(id)`(admin 은 전체). `customers_controller`·`users_controller` 는 **요청 스펙이 아예 없다** — 함께 추가.
- ✅ **해결(2026-10-06)**: create·update 모두 `customer_assignable?`(멤버=본인 고객, admin=전체) 통과 필수. 남의 id·없는 id 모두 `422 INVALID_CUSTOMER`(구분 불가 → 열거 오라클 없음), `nil` 로 떼어내기는 허용. 스펙 `quote_customer_ownership_spec.rb` 6건, 결함주입 RED 확인. ⚠️ `customers_controller`·`users_controller` 요청 스펙은 **아직 없다**.

### H-3. 토큰 폐기 목록·레이트리밋 카운터가 프로세스 메모리에만 있다
- `config/environments/production.rb:47` `cache_store = :memory_store` + `jwt_authenticatable.rb:62-74` 폐기 목록.
- 재배포·Render 무료 플랜 spin-down 마다 비워진다 → **로그아웃·회전된 refresh 토큰이 최대 7일 다시 유효**. 회전 기반 탈취 감지가 사실상 무력. 채팅 사용자별 한도·Slack 중복방지도 같은 저장소.
- 조치: 폐기 jti 를 DB 테이블(또는 solid_cache)로. 재사용 거부를 단언하는 스펙 추가(현재 없음 — 그래서 안 보였다).
- ✅ **해결(2026-10-06)**: 폐기 jti 를 DB `revoked_tokens`(jti 유니크·expires_at 인덱스)로 이전. 만료 행은 `revoke!` 때 정리 — 프로덕션엔 잡 스케줄러가 없어 `recurring.yml` 이 안 돈다(`SOLID_QUEUE_IN_PUMA` 미설정·워커 없음). 스펙 `token_revocation_persistence_spec.rb` 가 `Rails.cache.clear`(=재시작) 뒤 재사용 거부를 단언, 결함주입 RED 확인. ⚠️ 채팅 사용자별 한도·Slack 중복방지는 **여전히 `memory_store`** — 남은 항목.

### H-4. 캐리어 비교 카드가 다른 두 캐리어를 틀린 값으로 계산한다
- `src/features/quote/components/CarrierComparisonCard.tsx:64` — `fscPercent: defaultFscFor(carrier)` 는 **하드코딩 상수**, DB 주간 FSC 가 아니다(2026-08-24 에 메인 계산기에서 고친 부류의 재발).
- 같은 호출이 `input.resolvedSurcharges`(현재 캐리어 기준으로 조회한 War Risk·PSS 등)를 그대로 넘기고, `quoteSurcharges.ts` 는 캐리어로 거르지 않는다 → **현재 캐리어의 할증이 다른 캐리어 열에도 더해진다.**
- 영향: "어느 캐리어가 싼가" 판단이 틀어진다. 조치: 캐리어별 DB FSC 전달 + 할증을 `carrier` 로 필터(또는 캐리어별 조회).
- ✅ **해결(2026-10-06)**: 카드가 `useFscRates`(DB 주간 FSC, 상수는 폴백)와 캐리어별 `useSurcharges` 로 각 열을 계산. 매핑은 `toQuoteSurcharges` 로 `ServiceSection` 과 공유. 테스트 2건 추가(DB FSC 값은 상수와 겹치지 않게 선택), 결함주입 RED 확인. ⚠️ **남은 것**: `resolvedAddonRates` 도 현재 캐리어 것뿐이라 다른 열의 부가요금은 하드코딩 폴백으로 계산된다.

## 🟡 MEDIUM

| # | 위치 | 문제 | 조치 |
|---|---|---|---|
| M-1 | `api/.../quotes_controller.rb:50` | **비로그인 `POST /quotes/calculate`** 가 `totalCostAmount`·`profitMargin`·`breakdown.intlBase` 를 그대로 반환. (요율표는 이미 공개 JS 청크에 있어 피해는 제한적 — 심층방어 차원) | 비 admin 응답에서 원가·마진·breakdown 제거 |
| M-2 | `quotes_controller.rb:131` | 멤버가 `marginPercent` 를 보내 **0% 마진으로 저장** 가능(파트너 API 는 서버가 결정하는데 여기는 아님) | 비 admin 은 `MarginRuleResolver` 값으로 덮어쓰기 |
| M-3 | `quotes_controller.rb:190-208` `send_email` | 수신자·본문 자유 입력, `quotes@goodmangls.com` 발신, 사용자별 한도 없음 → 브랜드 스팸 중계 | 사용자·IP 한도 + 본문 길이 상한(+수신자 제한 검토) |
| M-4 | `quote_calculator.rb:140,179` · `quotePricing.ts:95` | `base*(1+m/100.0)` 부동소수 오차 후 100원 올림 → 정확히 100의 배수에서 **+100원**(실측: 3,000·10% → 3,400). FE·BE 동일하게 틀려 parity 는 유지 | 정수/Rational 로 계산 후 올림 — **양쪽 동시 변경 + parity 스냅샷 재생성** |
| M-5 | `quotes_controller.rb:367` vs `quote_calculator.rb:41` | 숫자 **문자열**(`"100"`)이 범위 검증은 통과하고 계산기에서 `String >= Integer` 로 터져 일반 422 | 검증 후 Float 강제 변환 |
| M-6 | `quote_input_attributes.rb:29-30` vs `schema.rb` | `exchangeRate`·`fscPercent` 생략 시 계산은 되는데 저장에서 `NotNullViolation` → 오해 소지 있는 422 | 계산기가 실제 쓴 값을 저장 |
| M-7 | `quotes_controller.rb:257-262` | 오래된 draft 만료 `update_all` 에 상태 조건·트랜잭션 없음 → 그 사이 `accepted` 된 견적이 `expired` 로 덮일 수 있음 | `where(status: draft/sent)` + 트랜잭션 |
| M-8 | `quote_serializer.rb:122-123` | `surchargeStale` 이 `appliedAmount` 키를 읽는데 저장 키는 `amount` → **금액 변경을 영원히 감지 못함**(코드 집합 변경만) | 키 교정 |
| M-9 | `QuoteCalculator.tsx:345` + `useSyncToInput.ts:22` | Reset 이 `resolvedSurcharges`·`resolvedAddonRates` 를 지우는데 동기화 훅은 이전 직렬화값과 같으면 다시 밀지 않음 → **리셋 후 경로가 직전과 같으면 DB 할증이 총액에서 빠진다**(패널 표에는 그대로 보임) | 훅이 ref 대신 현재 input 값과 비교 |
| M-10 | `useCarrierFscDefault.ts:45-57` | Reset 후 같은 캐리어면 상수 FSC 가 남아 DB 요율로 안 돌아감(≈1.9%p 과소) / 복제 시 저장 FSC 가 현재 기본값으로 덮임 | Reset·Duplicate 가 applied 기준을 명시적으로 재설정 |
| M-11 | `QuoteCalculator.tsx:195-211` | 복제가 애드온·`manualSurgeCost`·`pickupInSeoulCost` 를 잃어 원본과 금액이 달라짐 | 필드 저장·반환 또는 복제 시 경고 |
| M-12 | `useSurcharges.ts:46-72` · `useAddonRates.ts` · `useResolvedMargin.ts` · `QuoteHistoryPage.tsx:75` | `AbortController` 를 만들고 **요청에 signal 을 안 넘긴다** → 목적지를 빨리 바꾸면 늦게 온 옛 응답이 새 값을 덮음. 실패 시 이전 캐리어 할증이 남음 | signal 전달 + 실행별 cancelled 플래그 + 키 변경 시 상태 초기화 |
| M-13 | `QuoteHistoryPage.tsx:179-199` | 통계 카드(이번 달·합계·평균 마진·성사율)가 **현재 페이지 20건으로만** 계산, 합계는 통화 무시 | 서버 집계 |
| M-14 | `ups_eas_lookup.ts:41-53` | 문자열 이진탐색이라 GB 전체 우편번호(`AB31 4XY`)·`IV8`·US ZIP+4 가 미탐지(node 실측). 로드 실패도 Sentry 없이 삼킴 | 접두 매칭/정규화 + 실패 보고 |
| M-15 | `FinancialSection.tsx:124` | 환율 칸을 비우는 즉시 1 로 고정(`Number('')`=0 → 하한 1) — 다시 입력 불가, 1 이 견적에 들어감 | FSC 처럼 draft 문자열 |
| M-16 | `vercel.json` | CSP 가 Report-Only + `'unsafe-inline'`, HSTS 없음 | 강제 모드·nonce, HSTS 추가 |

## 🟢 LOW (묶음)

- `per_page=0` → kaminari 예외 500 (`quotes_controller.rb:142`, `audit_logs_controller.rb:34`) — `.clamp(1,100)`
- 품목 `quantity` 누락: 검증은 1, 계산기는 0(`item_cost.rb:34`) → 무게·포장비 0 으로 저장
- 마진 룰 `match_email` 대소문자 구분(`margin_rule_resolver.rb:49`), 리졸버 기본 24 vs 계산기 15
- `RecordNotFound` 메시지가 WHERE 절·컬럼명 노출(`application_controller.rb:18`), `quote_shares_controller` 에러 봉투에 `code` 없음
- 파트너 입력 치수 누락 → 0(`partner_quote_input.rb:87-89`) → 용적중량 과소
- `carrierRateEngine.ts:41` 구간 공백(70.01–70.09kg)에서 첫 밴드 선택 → 약 9% 과대
- `api/exchange-rate.ts`·`api/fsc.ts` 타임아웃·응답 크기 제한 없음, `error.message` 노출. `vercel.json` `/api/*` 의 `no-store` 가 `logistics-news` 의 `s-maxage` 를 무력화할 수 있음
- 로그인 스로틀이 IP 기준뿐(이메일별 잠금 없음)
- 클라이언트 번들의 `VITE_GOOGLE_MAPS_API_KEY` — 리퍼러 제한 여부 확인 필요
- `customers`·`users`·`margin_rules` 목록 페이지네이션 없음(관리 규모라 실해 낮음)

## 기존 알려진 항목 — 상태 (전부 여전히 열림)

| 항목 | 근거 |
|---|---|
| 요율 조회 실패: FE throw / BE `0` | `carrierRateEngine.ts:47` · `ups_cost.rb:63`·`dhl_cost.rb:63`·`fedex_cost.rb:63` |
| `item_cost.rb` 포장 버퍼 재인라인 | `item_cost.rb:38-41` vs `carrier_addon_support.rb:15-29` |
| 문서 무게 경고문 하드코딩 | `quote_calculator.rb:103,105,107` |
| `*_cost_spec.rb` 없음 | `spec/services/calculators/` 에 애드온 3 + war_risk 뿐 |
| 마진 입력 99.9 vs 엔진 80 | `FinancialSection.tsx:169` · `business-rules.ts:10` |
| 애드온 패널 재구현·자동감지 게이트 불일치 | UPS `UpsAddOnPanel.tsx:84` vs `upsAddonCalculator.ts:55`, **DHL 도 동일**(`DhlAddOnPanel.tsx:57` vs `dhlAddonCalculator.ts:44`) |
| DHL transitTime 불일치 | `config/rates.ts:9` `2-4 Business Days` |
| `manualDomesticCost`·`domesticTruckType` 죽은 배선 | `types.ts` 에만 존재 |
| `bundler-audit` CI 게이트 | `.github/workflows` 에 없음 |

## 복잡도 상위

| 위치 | 규모 | 비고 |
|---|---|---|
| `calculationService.ts:22` `calculateQuote` | 194줄 | 3캐리어 분기 집결 |
| `QuoteCalculator.tsx:43` | ~310줄·effect 6 | 마진 자동해석 effect 에 eslint-disable |
| `CargoSection.tsx:84` | ~340줄 | 단위 변환이 UI 와 섞임 |
| `item_cost.rb:18` `call` | 78줄 | 위 포장 버퍼 중복의 진원 |
| `ups_addon.rb:62` `call` | 59줄 | `fedex_addon.rb:90-103` 은 `normalize_db_rate` 를 복제하며 `ratePercent`·`detectRules` 누락 |

## 테스트 공백 (위험 순)

1. `customers_controller`·`users_controller` 요청 스펙 없음 — H-2 가 사는 곳
2. `verify_trusted_origin!`(Origin/CSRF) 스펙 없음
3. JWT 폐기·refresh 재사용 거부 스펙 없음 — H-3 이 안 보인 이유
4. 마진 노출 스펙에 export·calculate 없음 — H-1·M-1
5. FE: `CarrierComparisonCard` 가 DB FSC·캐리어별 할증을 쓰는지 단언 없음(H-4), `useSyncToInput` 리셋 경로(M-9)
6. FE 무테스트 모듈: `rateTableResolver.ts`·`authStorage.ts`·`fetchWithRetry.ts`·`api/exchange-rate.ts`·`api/fsc.ts`, 관리 훅 3종

## 권장 순서

1. ~~C-1~~ ✅ 2026-10-06 — 남은 건 Render `RAILS_MASTER_KEY` 삭제(운영)
2. ~~H-1·H-2~~ ✅ 2026-10-06 — `customers`·`users` 요청 스펙은 별도
3. ~~H-3~~ ✅ 2026-10-06 — 채팅 한도·Slack 중복방지 캐시는 별도
4. ~~H-4~~ ✅ 2026-10-06 (부가요금 DB 요율은 남음) · M-9·M-10 — "보조 경로가 메인 계산과 다른 입력을 쓴다" 부류를 한 번에
5. rubyzip `bundle update rubyzip --conservative` + `bundler-audit` CI 게이트(드디어)
6. vite/postcss/tar dev 의존성 비주요 업데이트(`npm audit fix`, `--force` 금지)
