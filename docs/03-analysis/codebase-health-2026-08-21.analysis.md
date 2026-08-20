# 코드 분석 — smart-quote-main (2026-08-21)

- **HEAD**: `e60e781e` (main, origin 동기)
- **직전 분석**: 2026-08-17 (`4a255a4e`, 건강도 8.1, 백로그 0건) → 이후 8커밋 / +1,158 −833 라인
- **범위**: `4a255a4e..HEAD` 신규 코드 + 직전 분석의 미해결 항목 + 자동 감사(의존성)
- **건강도**: 직전 8.1 대비 **소폭 상향**으로 본다(측정값이 아니라 판단이다). 구조·테스트·파리티 인프라는 강하고, 감점 요인은 아래 HIGH 1건 — "0 이라는 입력값의 의미가 FE·BE 에서 갈린다" 는 **한 부류의 결함**이다
- **검토하지 않은 범위**: `MobileLayout.tsx`(+289줄, 이번 diff 중 최대)·`RateTableViewer.tsx`(+144줄)는 열어보지 않았다. 금액 계산 경로를 우선했고 a11y e2e·컴포넌트 테스트가 통과 중이라 후순위로 뒀다 — 이 두 파일에 대한 커버리지는 **없다**

## 게이트 현황 (같은 날 `/check` 실측)

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` | PASS (src 273파일) |
| `eslint --max-warnings 0` | PASS |
| vitest + coverage | 66파일 / 1663테스트 PASS, 플로어 전부 충족 |
| rubocop | PASS (154파일, offense 0) |
| rspec (`db:test:prepare` 후) | 557 examples / 0 failures |
| playwright | 10 PASS / 1 조건부 skip |
| build | PASS (7.29s) |

---

## HIGH-1 — 입력값 `0` 의 의미가 FE·BE 에서 갈린다 (금액 정합성) — ✅ **해소 (2026-08-21, 미커밋)**

> **처리 결과**: 사용자 결정에 따라 "명시적 0 은 진짜 0, 빈칸은 기본값" 으로 통일했다.
> - `fscPercent`: FE `quotePricing.ts` `||` → `??`. `fscPercent: 0` 견적이 양쪽 모두 **1,020,600** 으로 일치
> - FSC 입력칸: 빈칸과 0 을 구분하는 draft 상태 도입 (빈칸 → 캐리어 기본값)
> - `exchangeRate`: BE `validate_quote_input!` 에서 `<= 0` 을 **422 INVALID_INPUT** 으로 거절 (calculate·create·파트너 3경로 공통). ⚠️ 1차 구현은 `rate.present?` 로 가드했다가 **`""` 가 그대로 통과**했다 — `"".present?` 는 false 인데 `"" || DEFAULT` 는 `""` 를 그대로 두고(Ruby 에서 `""` 는 truthy) `"".to_f = 0.0` 이라 같은 Infinity 로 떨어졌다. `!rate.nil?` 로 교정, `""`·`"abc"` 도 거절
> - 게이트: 공유 픽스처 `ups_us_fsc_zero_explicit` 신설 + `fsc_zero_semantics_spec.rb` + `FinancialSection.test.tsx`. **결함주입 3종으로 게이트 유효성 증명**
> - 기존 견적 금액 무변경: 파리티 스냅샷 diff **48줄 추가 / 0줄 삭제**
> - FE 1673 · BE 573 테스트 green
>
> **수정 후에도 남는 것 (덮었다고 읽히지 않도록 명시)**
> 1. **`fscPercent` 가 아예 없을 때의 FE↔BE 일치는 여전히 게이트 밖이다.** BE 분기는 `fsc_zero_semantics_spec.rb` 에서 `FscFetcher` 를 스텁해 고정했지만, **FE 의 하드코딩 상수와 BE 의 DB FSC 행이 같은 값인지는 아무것도 단언하지 않는다.** 둘 다 매주 움직이고 DB 가 상수를 덮는다. 공유 픽스처에 넣으면 시드 변경이 무관한 테스트를 깨뜨려서 일부러 뺐다. 도달 경로가 좁아(필드를 생략한 직접 API 호출) 남겨두는 판단이지만, **커버된 것이 아니다.**
> 2. **이미 저장된 `fsc_percent = 0` 견적은 재계산하지 않는다.** 그 견적들은 고객에게 약 24.7% 높은 금액으로 *보여졌고* 저장은 낮은 금액으로 됐다. Render DB 접근이 되는 시점에 `SELECT count(*) FROM quotes WHERE fsc_percent = 0` 으로 규모부터 확인할 것 — 0건이면 종이 문제도 아니다.
> 3. **비교 카드의 FSC 비대칭은 코드 변경 없이 남긴다.** `CarrierComparisonCard.tsx:62` 는 선택되지 않은 캐리어를 각자의 기본 FSC 로 계산하고 선택 캐리어만 사용자 값을 쓴다. 사용자가 20% 든 35% 든 커스텀 값을 넣으면 **이미 비대칭이었고**, 이번 변경은 0 만 예외적으로 기본값으로 바꿔치던 특수 케이스를 없앤 것이다. 다만 FSC 0 을 넣으면 선택 캐리어만 0%, 나머지는 42~43.5% 로 비교되므로 최저가 배지가 사실상 자동으로 붙는다 — 협의 요율을 반영한 정직한 표시로 볼지, 오해를 부르는지는 별도 판단이다.
>
> 아래는 발견 당시의 기록이다.


**같은 입력에 대해 프론트가 보여주는 금액과 백엔드가 계산·저장하는 금액이 다르다.** 단일 필드 버그가 아니라 **부류**다 — `fscPercent` 와 `exchangeRate` 두 곳에서 같은 형태로 발현한다.

### (a) `fscPercent = 0` — 견적 총액이 갈린다

| fscPercent | FE (화면) | BE (저장) | 차이 |
|---|---|---|---|
| 30 | 1,272,300 | 1,272,300 | 0 ✅ |
| **0** | **1,355,800** | **1,020,600** | **335,200** (화면 기준 −24.7%, 저장 기준 +32.8%) |

측정 입력은 파리티 픽스처 `basic_ups_us_wooden_box` 이며, `fscPercent: 30` 일 때 양쪽 모두 픽스처의 `expected.totalQuoteAmount = 1272300` 을 재현했다 — **프로브 하네스 자체는 유효**하다.

### 원인 — 0 의 의미가 양쪽에서 반대다

- FE `src/features/quote/services/quotePricing.ts:83`
  ```ts
  // `||` not `??` — a supplied 0 means "unset", not "no fuel surcharge".
  const fscRate = (input.fscPercent || defaultFscFor(carrier)) / 100;
  ```
  → 0 은 falsy → **캐리어 기본 FSC 로 대체**
- BE `smart-quote-api/app/services/quote_calculator.rb:143`
  ```ruby
  if @input[:fscPercent].nil?   # 0 은 nil 이 아니다
  ```
  → 0 을 **그대로 0% 로 인정**

바로 위 줄에서 `marginPercent` 는 `??` 를 써서 "명시적 0 은 진짜 0" 으로 처리한다. 즉 같은 파일 안에서 두 필드의 0 해석이 갈린다.

### 도달 경로 (이론이 아니라 UI 조작으로 가능)

1. `FinancialSection.tsx:103` FSC 입력칸은 `min='0'`, 값을 지우면 `Number('') === 0` → `onFieldChange('fscPercent', 0)`
2. `quoteInput.schema.ts:61` `fscPercent: z.number().min(0).max(200)` → 0 통과
3. `quotes_controller.rb:33` `create` 는 **서버에서 재계산해 그 값을 저장**한다 → 화면 ≠ 저장

즉 "연료할증료 없는 협의 건" 을 입력하려고 0 을 넣으면, 화면에는 기본 FSC 가 붙은 더 **비싼** 금액이 뜨고, 저장은 FSC 0 의 **싼** 금액으로 된다.

### (b) `exchangeRate = 0` — USD 금액이 조용히 `null` 이 된다

| exchangeRate | FE (화면) | BE (응답·저장) |
|---|---|---|
| 1400 | $908.79 | $908.79 ✅ |
| **0** | **$942.44** (기본환율 1350 대체) | **`null`** |

- FE `quotePricing.ts:75` `input.exchangeRate || DEFAULT_EXCHANGE_RATE` — JS 에서 0 은 falsy → 1350 대체
- BE `quote_calculator.rb:135` `@input[:exchangeRate] || DEFAULT_EXCHANGE_RATE` — **Ruby 에서 0 은 truthy** → 0 그대로 → `총액 / 0.0 = Infinity`
- `JSON.generate` 는 Infinity 에 예외를 던지지만 Rails 인코더가 **조용히 `null` 로 직렬화**한다

**같은 `||` 토큰이 두 언어에서 0 을 반대로 처리한다.** 그리고 이 경로는 **파트너 API 에서도 열려 있다** — `partner_quote_input.rb:51` 의 `(@api["exchange_rate"].presence || DEFAULT)` 에서 `0.presence == 0`(Rails 에서 `0.blank? == false`) 이므로 0 이 그대로 통과한다. 실측: 파트너 페이로드 `exchange_rate: 0` → 응답 `{"totalQuoteAmountUSD": null}`, 견적은 정상 저장.

### 왜 아무도 못 알아채는가 — 완전히 무음이다

`SaveQuoteButton.tsx:39` 는 저장 응답에서 **`referenceNo` 만 꺼내 쓰고 금액은 버린다.** 화면은 FE 가 계산한 값을 계속 표시하고, Intercom 이벤트(`total_krw`)와 Slack 알림도 **FE 값**을 보낸다. 반면 DB·견적 이력·PDF·공유 견적 페이지는 **BE 값**을 쓴다. 저장 시점에 숫자가 바뀌는 걸 보는 사람이 아무도 없다.

### 게이트가 못 잡는 이유

`shared/test-fixtures/calculation-parity.json` 23건의 `fscPercent` 분포는 **30 × 22건, 28 × 1건**. **0 또는 null 케이스가 0건**이라 FE/BE 파리티 스펙이 이 구간을 아예 밟지 않는다.

### 같은 부류를 전수 확인한 결과

판별 기준은 **"FE 기본값이 0 이 아닌 필드"** 다. 기본값이 0 이면 0→0 이라 어느 쪽으로 처리하든 같은 값이 나온다.

| 필드 | FE 처리 | BE 처리 | 0 일 때 |
|---|---|---|---|
| `fscPercent` | `\|\|` → 캐리어 기본값 | `.nil?` → 0 인정 | **갈림** (a) |
| `exchangeRate` | `\|\|` → 1350 | Ruby `\|\|` → 0 인정 | **갈림** (b) |
| `marginPercent` | `??` → 0 인정 | Ruby `\|\|` → 0 인정 | 일치 ✅ (실측 확인) |
| `dutyTaxEstimate` · `pickupInSeoulCost` · `manualPackingCost` · `manualSurgeCost` | 기본값 0 | 기본값 0 | 일치 ✅ |

`marginPercent` 만 FE 가 `??` 를 쓰며 코드에 그 이유가 주석으로 달려 있다 — 나머지 두 필드는 그 판단이 적용되지 않았다.

### 처방

1. **불변식을 하나 정한다**: "명시적으로 보낸 0 은 진짜 0 이다" 인지 "0 은 미입력이다" 인지. 필드마다 다르게 갈 거라면 **양쪽 코드에 같은 규칙**을 적어 둔다
2. 정한 쪽으로 FE·BE 를 동시에 맞춘다. "미입력" 으로 갈 경우 UI 에서 빈 값과 0 을 구분해야 하므로 입력 처리도 함께 바꿔야 한다
3. **파리티 픽스처에 0 값 케이스를 추가**한다 — `fscPercent: 0`, `exchangeRate: 0` 각각 `expected` 금액을 박아 넣고 ±100 결함주입으로 게이트가 실제로 빨개지는지 증명
4. `fscPercent` 가 아예 없는(null) 케이스도 같이 추가 — 이때 FE 는 하드코딩 상수, BE 는 **DB FSC 테이블**을 먼저 본다. 실측에서 테스트 DB 의 UPS 국제 FSC 는 44.25% 로 FE 상수와 달랐다
5. `exchangeRate` 는 0 을 **422 로 거절**하는 편이 낫다 — 환율 0 은 어떤 해석으로도 의미가 없고, 지금은 `null` 로 조용히 흘러간다

> 참고: `app/services/quote_calculator.rb:228` 주석은 애드온의 FSC 비대칭을 "FE 와 맞추려고 의도적으로 미러했다" 고 적고 있다. 애드온 미러는 실제로 일치하지만, **국제구간의 0 처리는 미러되지 않았다.**

### ⚠️ smart-quote-emax 도 볼 것 (이 저장소에서 확인한 건 아님)

같은 스택이라 한쪽 발견이 다른 쪽에 그대로 적용되는 이력이 있다. **grep 수준으로만** 확인했고 emax 에서 프로브를 돌리지도, 도달 가능성을 따지지도 않았다 — 아래는 확정 결함이 아니라 **점검 리드**다.

- **`exchangeRate`**: emax FE `calculationService.ts:479` `input.exchangeRate || DEFAULT_EXCHANGE_RATE` ↔ emax BE `quote_calculator.rb:177` `@input[:exchangeRate] || DEFAULT_EXCHANGE_RATE` — **main 과 완전히 같은 형태**. 0 에서 갈릴 가능성이 높다
- **`fscPercent`**: emax 는 main 과 구조가 다르다. FE `calculationService.ts:498` `(input.fscPercent || 0)` / BE `quote_calculator.rb:87` `@input[:fscPercent] || default_fsc_for(@carrier)` → **0 일 때는 양쪽 다 0 이라 일치**하지만, **값이 아예 없을 때(nil/undefined)** FE 는 0%, BE 는 캐리어 기본값(45% 대)을 쓴다. 이쪽이 오히려 폭이 크다 — emax 에서 fscPercent 누락이 가능한지부터 확인할 것

---

## MEDIUM-2 — `mail` 2.9.0 이메일 스푸핑 취약점 (신규)

```
Name: mail   Version: 2.9.0
GHSA-mvxr-6m87-mv2q   Criticality: Medium
Email address spoofing via malformed RFC 2047 encoded-words
Solution: update to '>= 2.9.1'
```

`bundler-audit` 결과 백엔드에서 발견된 **유일한** 권고다(고유 GHSA 1건). 2026-08-19 공개라 직전 분석 시점에는 없었다. 이 앱은 매직링크·견적서 메일을 발송하므로 헤더 스푸핑은 무관하지 않다.

**처방**: `bundle update mail --conservative` — `--conservative` 없이 돌리면 지정하지 않은 젬까지 딸려 올라간다(과거 사고 이력).

---

## MEDIUM-3 — 백엔드 입력 검증이 프론트 Zod 보다 약하다 (05-15 Phase B 미완)

`validate_quote_input!` (`quotes_controller.rb:307`) 는 **destinationCountry 존재 + 품목별 quantity>0 + weight>0**, 이 3가지만 본다. 나머지는 `params.permit` 의 통과 여부에만 의존한다. 그런데 **계산과 저장의 권위자는 백엔드**다.

실측 (rails runner):

| 입력 | 결과 |
|---|---|
| `fscPercent: 100000` | 견적 **840,196,400원** 생성 — 상한 없음 |
| `exchangeRate: 0` | HIGH-1 (b) 참조 — `null` 로 무음 처리 |
| `marginPercent: -50` | 0 으로 clamp — 정상 동작 ✅ |

프론트 Zod 는 `exchangeRate: positive().max(10000)`, `fscPercent: min(0).max(200)`, `marginPercent: min(0).max(100)` 으로 전부 막는다. **범위 검증의 실질적 주체가 FE 하나뿐**이라는 게 문제다 — FE 를 우회하는 경로(직접 API 호출, 파트너 API)는 그 보호를 받지 못한다.

**처방**: FE Zod 스키마와 같은 범위를 BE 에 미러. 최소한 `exchangeRate > 0`, `fscPercent 0..200` 은 422 로 거절할 것. 스키마를 양쪽에 두 벌로 쓰는 게 부담이면, 범위 상수만이라도 `shared/` 에 두고 양쪽이 참조하게 하는 방법이 있다.

---

## LOW-4 — `GET /auth/magic_link/verify` 라우트 잔존

`config/routes.rb:19`. 2026-08-17 에 POST 로 전환하면서 "배포 윈도우용으로 잠시 둔다" 고 기록했고, 프론트는 `authApi.ts:39` 에서 **POST 만** 호출한다. 배포 윈도우는 지났다. 토큰이 URL 에 실리는 경로를 남겨둘 이유가 없다.

**처방**: `get` 라인 삭제 + 관련 스펙 확인. (`peek` 는 `Rails.env.test?` 가드가 있어 무해)

---

## LOW-5 — `XK`(코소보)는 어느 캐리어에서도 견적이 불가능한 드롭다운 항목

`e60e781e` 로 존 폴백이 제거되면서, 존이 없는 목적지는 견적 대신 "존 미지정" 안내로 간다. 선택 가능한 목적지 192개 기준 미매핑 현황:

| 캐리어 | 미매핑 | 국가 |
|---|---|---|
| UPS | 8 / 192 (4.2%) | PG FJ XK YE TJ SD SS LY |
| DHL | 3 / 192 (1.6%) | XK CW SX |
| FedEx | 12 / 192 (6.3%) | MM VA SM XK TM TJ SL CF KM GW SD SS |

**3사 모두 존이 없는 국가는 XK 하나뿐**이다 — 선택은 되지만 어떤 캐리어로도 금액이 안 나온다. 매핑을 넣거나 드롭다운에서 빼는 편이 낫다. (직전 분석 시점 FedEx 미매핑 63% 대비 크게 개선됨)

**파생 리스트 검증**: `UPS/DHL/FEDEX_ZONE_COUNTRIES` 는 존 맵에서 파생되며, 존 맵에 없는 국가를 **지어내지 않는다**(`extraNotInMap = 0`, 3사 모두). 존 맵에는 있으나 파생 리스트에 없는 국가(UPS 11·DHL 15·FedEx 25)는 `SELECTABLE_COUNTRY_CODES` 필터에 의한 **의도된** 제외다.

---

## INFO — 조치 불필요하거나 사실 확인만

- **npm 취약점 18건(critical 1·high 13)은 전부 dev/build 전용.** `npm audit --omit=dev` 결과 **프로덕션 트리 0건**. `@vercel/node` 도 `api/*.ts` 에서 `import type` 으로만 쓰여 런타임에 남지 않는다. ⚠️ `npm audit fix` 는 돌리지 말 것 — 과거 증분 설치를 깨뜨려 Vercel 에서만 실패한 이력이 있다.
- **Rails 8.0.5.1** (`~> 8.0.4` 핀). 직전 분석의 "EOL 2026-10-07" 은 **여전히 1차 출처 미확인**이며 여기서도 확인하지 않았다 — 사실로 인용하지 말 것. 지금 걸려 있는 Ruby CVE 는 위 `mail` 1건뿐이다.
- **rack `:unprocessable_entity` deprecation 63곳**(app+spec). 경고일 뿐 동작 영향 없음.
- **복잡도·파일 크기는 지적 사항 없음.** 최대 소스 파일 482줄(`GuideVisuals.tsx`) < 800 기준. 이 저장소 eslint 에는 `complexity` 룰이 없어 순환복잡도는 게이트가 아니며, 숫자를 근거로 한 추가 분해는 권하지 않는다(2026-08-11 결론 유지).
- **`bundler-audit` CI 게이트는 여전히 미도입.** 새 CVE 가 무관한 PR 을 빨갛게 만드는 정책 문제라 판단이 필요하다 — 이번 `mail` 건은 그 게이트가 있었으면 자동으로 잡혔을 사례다.

## 강점 (유지할 것)

- FE↔BE 파리티 인프라(`tariff:snapshot` 전셀 + 계산 파리티 23건 `expected` 단언)가 실제로 작동한다 — 이번 HIGH 도 **그 인프라의 사각지대**를 지적하는 것이지 인프라 부재가 아니다
- `CarrierComparisonCard` 는 캐리어별 `ZoneNotFoundError` 를 격리해 한 캐리어 실패가 카드 전체를 죽이지 않는다
- 3개 견적 엔드포인트(calculate·create·파트너) 모두 `ZoneNotFoundError → 422` 를 rescue 한다 — 누락 없음
- 파생 존 리스트가 하드코딩 목록을 대체해 stale drift 원인이 제거됨
