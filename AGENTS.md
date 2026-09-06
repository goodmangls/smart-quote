# AGENTS.md

This file provides guidance to Codex and other coding agents when working with code in this repository.

> 이 파일은 `CLAUDE.md` 의 쌍둥이다. **한쪽만 고치면 두 에이전트가 다른 사실을 보게 된다** — 내용 변경은 항상 두 파일에 함께 적용할 것.

## Project Overview

Smart Quote System for **KS Ways** - an internal logistics quoting tool that calculates international shipping costs across carriers (UPS, DHL, FedEx). React frontend with a Rails API backend, sharing mirrored calculation logic. Includes customer dashboard with live exchange rates, weather, jet fuel prices, notices, and account manager widgets. Role-based access (Admin/Member) with Slack notifications and Sentry error tracking.

## Development Commands

### Frontend (React 19 + TypeScript 5.8 + Vite 6)

```bash
npm run dev          # Dev server on http://localhost:5173
npm run build        # tsc + vite build
npm run lint         # ESLint (--max-warnings 0)
npm run test         # Vitest in watch mode
npx vitest run       # Run frontend tests once
npm run test:coverage  # Run frontend tests with coverage
npm run test:e2e       # Run Playwright end-to-end tests
npx tsc --noEmit     # Type check only
```

### Backend (Rails 8 API-only - from smart-quote-api/)

```bash
bundle install           # Install gems
bin/rails db:prepare     # Create + migrate DB
bin/rails server         # API on http://localhost:3000
bundle exec rspec        # RSpec tests
bin/rubocop              # Ruby linting
```

### Running a single test

```bash
# Frontend
npx vitest run src/features/quote/services/calculationService.test.ts
# Backend
bundle exec rspec spec/requests/api/v1/quotes_spec.rb
```

## Architecture

### Monorepo Structure

```
/                              # Frontend
  src/
    api/                       # API clients
      apiClient.ts             # Centralized fetch client (auth token, 401 handling)
      quoteApi.ts              # Rails backend (fetch-based, VITE_API_URL)
      marginRuleApi.ts         # Margin rule CRUD + resolve API
      exchangeRateApi.ts       # open.er-api.com (KRW base, localStorage cache for previous rates)
      weatherApi.ts            # Open-Meteo API (47 global ports/airports)
      noticeApi.ts             # Company announcements
    types.ts                   # Core TypeScript types & enums (QuoteInput, QuoteResult, Incoterm, etc.)
    types/dashboard.ts         # Dashboard types (ExchangeRate, PortWeather, LogisticsNews, AccountManager)
    i18n/translations.ts       # 4-language dictionary (en/ko/cn/ja, 390+ keys)
    config/                    # Rate tables, business rules, UI constants
      ups_tariff.ts            # UPS Z1-Z10 rate tables (synced with backend)
      dhl_tariff.ts            # DHL Z1-Z8 rate tables (synced with backend)
      fedex_tariff.ts          # FedEx IP/Envelope/Pak rate tables, letter zones A-Y (synced with backend)
      rates.ts                 # KRW cost constants + 환율·FSC 폴백 상수 (수치는 파일 참조 — 매주 바뀜)
      business-rules.ts        # Surge thresholds, packing weight buffer/addition
      options.ts               # Country options, carrier options, incoterm options; *_ZONE_COUNTRIES (zone-filter UI lists) derived from the zone maps
      addon-utils.ts           # Shared AddonRateLike/NormalizedRate types, calcAddonFee(), findRate()
      ups_zones.ts / dhl_zones.ts / fedex_zones.ts  # Config-driven zone mappings (Record<string, ZoneInfo>; FedEx letter zones; no fallback — unmapped country → null → ZoneNotFoundError)
      ups_addons.ts            # UPS add-on rates (6) + Surge Fee config (Israel/ME)
      dhl_addons.ts            # DHL add-on rates (19) with auto-detect (OSP, OWT)
      fedex_addons.ts          # FedEx add-on rates (18) — highest-only + 18kg min chargeable (synced with backend)
      ups_eas_lookup.ts        # EAS/RAS postal code lookup (binary search, lazy-load from public/data/)
    contexts/                  # React Context providers
      AuthContext.tsx           # JWT auth (user, session, login/logout)
      LanguageContext.tsx       # i18n (useLanguage hook, localStorage persistence)
      ThemeContext.tsx          # Dark/light mode (useTheme hook)
    features/
      quote/
        components/            # InputSection, ResultSection, SaveQuoteButton, CarrierComparisonCard
        components/widgets/    # ExchangeRateWidget, WeatherWidget, NoticeWidget, AccountManagerWidget, ExchangeRateCalculatorWidget
        services/              # calculationService.ts (orchestrator), rateTableResolver.ts (carrier/document table select), fedexCalculation.ts, fedexAddonCalculator.ts, dhlAddonCalculator.ts, upsAddonCalculator.ts
        hooks/                 # useSyncToInput (generic data sync hook)
        components/PackingTypeInfo.tsx  # Packing type info panel with live cost preview
      history/
        components/            # QuoteHistoryPage, QuoteHistoryTable, QuoteSearchBar, QuotePagination, QuoteDetailModal
        constants.ts           # Shared constants (STATUS_COLORS)
      admin/
        components/            # TargetMarginRulesWidget, FscRateWidget, UserManagementWidget, CustomerManagement, AuditLogViewer, RateTableViewer
        components/surcharge/  # SurchargeManagementWidget, SurchargeForm, SurchargeTable, SurchargeCarrierLinks, SurchargeNotice
      dashboard/
        components/            # WelcomeBanner, QuoteHistoryCompact, AccountSettingsModal, WidgetError, WidgetSkeleton
        hooks/                 # useExchangeRates, usePortWeather, useLogisticsNews, useMarginRules, useResolvedMargin, useFscRates, useSurcharges, useAddonRates
    pages/                     # Route-level pages
      LandingPage.tsx          # Public landing (/)
      LoginPage.tsx            # Auth login (/login)
      SignUpPage.tsx           # Auth signup (/signup)
      CustomerDashboard.tsx    # Dashboard with widgets (/dashboard)
      QuoteCalculator.tsx      # Calculator + history (/quote, /admin)
      components/              # CalculatorActionBar, AdminWidgets, MobileStickyBottomBar
    components/
      layout/                  # Header, MobileLayout, NavigationTabs, Footer
      ui/CollapsibleSection.tsx # Reusable collapsible wrapper for admin widgets
      ProtectedRoute.tsx       # Auth guard (requireAdmin prop for /admin, /schedule)
      ErrorBoundary.tsx        # React error boundary with Sentry
      ChannelTalk.tsx          # ChannelTalk chat widget
    lib/
      format.ts                # Currency/number formatters (formatKRW, formatUSD, formatNum, formatUSDInt)
      pdfService.ts            # jsPDF-based PDF (packing details, carrier add-ons, surcharge info)
      packing-utils.ts         # applyPackingDimensions() shared utility (eliminates 6x duplication)
      fetchWithRetry.ts        # Generic fetch retry wrapper
      slackNotification.ts     # Slack notification for member quote saves
      schemas/quoteInput.schema.ts  # Zod validation; addonCarrierSchema includes FEDEX (saveQuote must accept DB FEDEX rates)
smart-quote-api/               # Backend (Rails 8 API-only, Ruby 3.4, PostgreSQL)
  app/models/
    margin_rule.rb             # Margin rule model (validations, scopes, soft delete)
    audit_log.rb               # Audit trail model
  app/services/
    quote_calculator.rb        # Main orchestrator
    quote_searcher.rb          # Search/filter chain for quotes
    quote_exporter.rb          # CSV export with 10K limit
    quote_serializer.rb        # Quote summary/detail serialization
    margin_rule_resolver.rb    # Priority-based margin resolution (5min cache, first-match-wins)
    calculators/
      item_cost.rb             # Packing dimensions, volumetric weight, material/labor
      surge_cost.rb            # Surcharge logic
      ups_cost.rb / ups_zone.rb
      ups_surge_fee.rb         # UPS Surge Fee auto-calc (Israel/Middle East)
      dhl_cost.rb / dhl_zone.rb
      fedex_cost.rb / fedex_zone.rb  # FedEx cost + letter zone mapping (mirror of FE)
      fedex_addon.rb           # FedEx add-on calculator (mirror of fedexAddonCalculator.ts)
      rate_table_resolver.rb   # Carrier/document rate table selection (Envelope/Pak/IP)
      domestic_cost.rb         # Domestic pickup cost
  app/controllers/api/v1/
    quotes_controller.rb       # Quote CRUD (uses QuoteSearcher, QuoteExporter, QuoteSerializer)
    margin_rules_controller.rb # CRUD + resolve endpoint (admin guard, audit log)
    surcharges_controller.rb   # Surcharge CRUD
    addon_rates_controller.rb  # Add-on rate management
    customers_controller.rb    # Customer CRUD
    users_controller.rb        # User management
    auth_controller.rb         # JWT login/register/password
    fsc_controller.rb          # FSC rate view/update
    audit_logs_controller.rb   # Audit log viewer
    chat_controller.rb         # AI chatbot (Claude API, role-aware, language auto-detect, markdown, preset questions)
    notifications_controller.rb # Slack webhook proxy
  db/seeds/addon_rates.rb      # DHL 19 + UPS 6 + FedEx 18 add-on rate seed data (FedEx must be all 18 or none)
  lib/constants/               # Tariff tables (ups_tariff.rb, dhl_tariff.rb, fedex_tariff.rb)
```

### Routing (src/App.tsx)

```
/              → LandingPage (public)
/login         → LoginPage (public)
/signup        → SignUpPage (public)
/dashboard     → CustomerDashboard (ProtectedRoute)
/quote         → QuoteCalculator isPublic=true (ProtectedRoute)
/admin         → QuoteCalculator isPublic=false (ProtectedRoute requireAdmin)
/schedule      → FlightSchedulePage (ProtectedRoute requireAdmin)
/guide         → UserGuidePage (public)
*              → redirect to /
```

Context providers wrap the app: `ThemeProvider > LanguageProvider > BrowserRouter > AuthProvider`

### Role-Based Access

| Feature | Admin | Member |
|---------|:-----:|:------:|
| Dashboard & widgets | O | O (limited) |
| Quote calculator | O | O |
| Carrier Comparison | O | O |
| Financial settings (Ex.Rate, FSC, Margin) | O | X |
| Special Packing options | O | X |
| Weather Widget | O | X |
| Exchange Rate / Calculator Widget | O | X |
| Jet Fuel Widget | O | O |
| Language toggle (i18n) | O | X |
| Currency toggle (KRW/USD) | O | X |
| Flight Schedule (/schedule) | O | X |
| Quote history | O | O |
| Margin / cost fields in quote API responses | O | **X — 응답에 실리지 않음** |
| Low Margin badge (<10%) in history | O | X |
| Admin widgets panel (collapsible) | O | X |
| Slack notification on save | X | O (auto) |

### Data Flow

1. User edits input -> frontend `calculateQuote()` runs instantly via `useMemo` (no debounce, pure function)
2. "Save Quote" -> `POST /api/v1/quotes` -> backend `QuoteCalculator.call(params)` recalculates + persists to PostgreSQL (ref: `SQ-YYYY-NNNN`)
3. Member save -> Slack notification via `POST /api/v1/notifications/slack` (best-effort, condition: `user.role === 'member' && !isDuplicate`)
4. History tab -> `GET /api/v1/quotes` with pagination/search/filter params

### Mirrored Calculation Logic

Frontend (`src/features/quote/services/calculationService.ts`) and backend (`smart-quote-api/app/services/`) implement **identical** calculation logic. The frontend runs calculations instantly for UI responsiveness; the Rails API is the source of truth for saved quotes.

### Calculation Pipeline

1. **Item Costs** - Packing dimensions (+10/+10/+15cm), volumetric weight (L*W*H / 5000), packing material/labor, manual surge charges (all carriers)
2. **Carrier Costs** - Zone lookup (country -> zone code), `rateTableResolver` selects tables per carrier + Document type (FedEx Document: Envelope ≤0.5kg / Pak ≤2.5kg / IP fallback with warning), shared `lookupCarrierRate()` engine (exact table 0.5-20kg -> range table >20kg -> fallback), FSC% surcharge
3. **Margin** - Dynamic margin via `MarginRuleResolver` (priority-based: P100 per-user flat > P90 per-user weight > P50 nationality > P0 default), **Markup 방식**: `revenue = cost × (1 + margin%)`, rounded up to nearest KRW 100. Admin can manually override at any time. ⚠ 매출 대비 실효 마진율은 명목값보다 낮음 (예: 24% Markup → 실효 마진율 19.35% = margin / revenue). ⚠️ **Admin 은 이 룰 해석을 건너뛰고 0% 에서 시작한다** (2026-09-06) — 아래 「Admin 마진 정책」 참조.
4. **Warnings** - Low margin (<10%), high volumetric weight, surge charges, collect terms (EXW/FOB)

### 입력값 `0` 의 의미 (2026-08-21)

**명시적으로 보낸 0 은 진짜 0 이다. 기본값은 값이 아예 없을 때만 적용된다.** FE·BE 가 같은 규칙을 따라야 화면 견적과 저장 견적이 일치한다.

| 필드 | 0 을 보냈을 때 | 값이 없을 때 |
|---|---|---|
| `fscPercent` | 연료할증료 0원 | 캐리어 기본 FSC (`defaultFscFor`, BE 는 DB FSC 테이블 우선) |
| `marginPercent` | 마진 0% | 15% |
| `exchangeRate` | **422 INVALID_INPUT** (0 은 어떤 해석으로도 무의미) | `DEFAULT_EXCHANGE_RATE` |

- FE 는 `??`, BE 는 `.nil?` 로 읽는다. **Ruby 의 `||` 는 0 이 truthy 라 JS 의 `||` 와 반대로 동작한다** — 이 자리에서 `||` 를 쓰면 안 된다.
- FSC 입력칸(`FinancialSection`)은 **빈칸과 0 을 구분**한다. 빈칸은 캐리어 기본값으로 해석되므로 실수로 칸을 비워도 할증료가 통째로 빠지지 않는다. 표시용 draft 상태를 따로 두는 이유가 이것이다.
- 게이트: 공유 픽스처 `ups_us_fsc_zero_explicit`(양쪽 원 단위 단언) + `spec/services/fsc_zero_semantics_spec.rb` + `FinancialSection.test.tsx`.
- **범위 검증의 단일 출처는 `QuotesController::NUMERIC_INPUT_BOUNDS`** (2026-08-21 신설). 여기 값을 바꾸면 calculate·create·파트너 3경로에 동시 적용된다. ⚠️`"abc".to_f`·`"".to_f` 가 모두 `0.0` 이라 **범위 검사만으로는 문자열이 "유효한 0" 으로 통과한다** — 반드시 `NUMERIC_INPUT_PATTERN` 으로 숫자 여부부터 거를 것. `marginPercent`(계산기가 이미 clamp)와 품목 수(파트너 화물은 100개 초과가 정상)는 **의도적으로 제외**.
- 이력: 2026-08-21 이전 FE 가 `||` 를 써서 `fscPercent: 0` 견적이 **화면 1,355,800 / 저장 1,020,600** 으로 갈렸다. 이미 저장된 견적의 금액은 재계산하지 않는다.

### Admin 마진 정책 · 마진 노출 범위 (2026-09-06)

**Admin 견적의 시작 마진은 무조건 0% 다.** 단일 출처는 `src/pages/quoteDefaults.ts` 의 `ADMIN_DEFAULT_MARGIN_PERCENT = 0` 이고, 초기 로드와 **Reset 이 둘 다** `initialInputFor(isAdmin)` 을 거친다. 마진은 관리자가 지정·조정하는 값이고, 그에 따라 Total Estimate Quote 가 즉시 다시 계산된다.

- ⚠️ **Reset 이 이 규칙을 가장 쉽게 깬다.** 0% 는 `isAdmin` 을 키로 한 effect 가 적용하는데 리셋 시 역할은 바뀌지 않으므로 effect 가 재발화하지 않는다 — `setInput(INITIAL_INPUT)` 로 되돌리면 admin 이 member 기본값 15% 에 앉는다. 반드시 `initialInputFor(isAdmin)` 을 쓰고 `hasManuallyChangedMargin` ref 도 함께 비울 것(안 비우면 member 쪽 룰 자동 해석까지 막힌다).
- Member 는 영향 없다. `INITIAL_INPUT.marginPercent`(15%)와 `MarginRuleResolver` 자동 해석을 그대로 쓴다.
- 저마진 임계값의 단일 출처는 `src/config/business-rules.ts` 의 `LOW_MARGIN_THRESHOLD_PERCENT = 10` · `isLowMargin()` 이다. 계산 경고와 이력 배지가 같은 값을 본다.
- 이력 화면의 **Low Margin 배지**는 색만으로 알리지 않는다 — 색은 색각 이상·흑백 출력에서 사라지므로 텍스트 배지를 함께 렌더한다(`QuoteHistoryTableParts.tsx`).

**마진·원가는 Admin 에게만 나간다 — 화면에서 감추는 게 아니라 직렬화에서 뺀다.**

- `QuoteSerializer.summary` / `.detail` 은 `include_margin:` **기본값이 `false`** 다(deny-by-default). 호출부가 `current_user.admin?` 일 때만 켠다 — 새 엔드포인트를 추가하면서 아무것도 안 하면 안전한 쪽으로 떨어진다.
- 빠지는 필드: `marginPercent` · `totalCostAmount` · `profitAmount` · `profitMargin` · `breakdown`.
- 공개 공유 링크(`GET /shared/:token`)는 별도 화이트리스트 `QuoteSerializer.shared` 를 쓴다. 미인증 경로라 **뺄 것을 고르는 방식이 아니라 담을 것을 고르는 방식**이어야 한다 — 필드가 새로 생겨도 자동으로 새지 않는다.
- ⚠️ 프론트에서 마진 열·배지를 숨기는 것만으로는 부족하다. **응답에 값이 없어야** 개발자도구·공유 링크로도 안 보인다.

### UPS Zone Mapping (Z1-Z10) — per UPS 2026 Service Guide

Z1: SG/TW/MO/CN, Z2: JP/VN, Z3: TH/PH, Z4: AU/IN, Z5: CA/US, Z6: ES/IT/GB/FR, Z7: DK/NO/SE/FI/DE/NL/BE/IE/CH/AT/PT/CZ/PL/HU/RO/BG, Z8: AR/BR/CL/CO/AE/TR/ZA/EG/BH/SA/PK/KW/QA, Z9: IL/JO/LB, Z10: HK/CN-S

Zone mappings are config-driven (`src/config/ups_zones.ts`, `src/config/dhl_zones.ts`, `src/config/fedex_zones.ts`).

⚠️ **폴백 존 없음 (2026-08-19)**: 세 캐리어 모두 존 테이블에 없는 국가는 `determine*Zone`이 `null`을 반환하고 계산기는 `ZoneNotFoundError`를 던진다(백엔드 미러 `Calculators::ZoneNotFoundError` → API `422 ZONE_NOT_FOUND`). UI는 결과 영역 안내 카드 + 비교 카드 "존 미지정" 컬럼 + 국가 드롭다운 접미사로 표시한다. 과거의 Rest-of-World(UPS Z10/DHL Z8)·FedEx J 폴백은 제거됨 — 임의 존으로 견적을 내지 않는다. `*_ZONE_COUNTRIES`(options.ts, 존 필터 UI)는 존 맵에서 파생되므로 존 맵만 수정하면 된다.

**DHL × CN-S**: DHL 존 시트는 중국을 분할하지 않는다 — CN-S는 CN과 동일한 **Z1** 요율이며 라벨 `Z1/Asia (S.China=CN)`로 표기(2026-08-19 사용자 확인). UPS Z10·FedEx K는 남중국을 별도 존으로 유지.

### FedEx Zone Mapping (letter zones, 2026-07)

FedEx uses letter zone keys `A D E F G H I J K M N O P Q R S T U V W X Y` (e.g. P=Japan, Y=Singapore, F=US/CA/NZ/MX, V=HK, W=CN). Unmapped countries: **no fallback** — ZoneNotFoundError/422 + UI notice (위 참조). Document shipments resolve Envelope (rated ≤0.5kg) → Pak (≤2.5kg) → IP fallback (+warning); Parcel always uses IP.

### FedEx Add-on Services (2026, IPE/IP/IE)

Source: FedEx "추가 서비스 요금 및 기타 정보 — 대한민국" (KR_20251119_102313). Config `src/config/fedex_addons.ts` ↔ backend `app/services/calculators/fedex_addon.rb` — **동일 값 유지 필수**.

Two rules are FedEx-specific and easy to get wrong:

- **Highest-only** — 한 패키지가 비표준화물 기준(용적/중량/패키징 35,600 · 특대형 86,000 · 미허가 378,200) 2종 이상에 해당하면 **가장 높은 금액 하나만** 부과된다. 합산하면 최대 4배 과대견적.
- **최소 청구 중량 18kg** — 추가 취급 요금–용적 기준에 해당하는 패키지는 18kg 미만으로 청구되지 않는다. 부가요금이 정액이므로 이 규칙은 **base 요율 조회**에 작용한다(`getFedexMinChargeableWeight` → `billableWeight`).

**범위 밖**: Freight(IPF/IEF) 요금, 계약 기반 프리미엄(M&I·Priority Alert·ODC), 지역 그룹 기반 OPA/ODA(그룹 A/B/C 국가 목록이 원문에 없음), 제3자 청구 2.5%(과금 기준이 declared value 가 아니라 총 운임이라 `calcAddonFee` 경로와 맞지 않음).

⚠️ **DB 요율(`resolvedAddonRates`)은 all-or-nothing 이다.** FEDEX 행이 하나라도 있으면 **DB 만** 쓰고 하드코딩 표로 폴백하지 않는다 — 프론트·백엔드 모두 동일. 따라서 **시드는 18행 전부 적용해야 한다.** 일부만 넣으면 빠진 코드가 조용히 미청구된다. (UPS/DHL 에서 물려받은 의미이며 양쪽이 같게 동작하도록 맞춰 둠)

✅ **UPS·DHL·FedEx 애드온 모두 백엔드에 미러됨** (2026-08-17, `calculators/ups_addon.rb`·`dhl_addon.rb`·`fedex_addon.rb`) — 저장 견적이 화면과 원 단위로 일치한다. parity fixture 23건 전부 expected 블록으로 양쪽 단언. UPS SGF(급증수수료)는 FE 와 같은 **애드온 버킷**에 있다(구 `UpsSurgeFee` 서비스의 surge 버킷 방식·2권역 구요율은 제거됨). 이 전환 이전에 저장된 UPS/DHL 견적의 금액은 재계산되지 않는다.

### UPS Surge Fee (2026-03-15~)

- Israel (IL): KRW 4,722/kg + FSC
- Middle East (AF/BH/BD/EG/IQ/JO/KW/LB/NP/OM/PK/QA/SA/LK/AE): KRW 2,004/kg + FSC
- Auto-detected in `ups_addons.ts` → applied as UPS Add-on (code: SGF)
- Backend: `calculators/ups_surge_fee.rb`

### EAS/RAS Auto-Detection

- 86 countries, 39,876 zip ranges in `public/data/ups_eas_data.json` (lazy-loaded)
- Binary search O(log n) in `src/config/ups_eas_lookup.ts`
- Detects EAS (Extended), RAS (Remote), DAS (Delivery) surcharges by postal code
- Shows auto-detect banner in UpsAddOnPanel with one-click apply

### Incoterm Policy

Express shipments (UPS/DHL/FedEx) → **DAP only** (no exceptions). AI chatbot enforces this in responses.

## Dashboard Widgets

### ExchangeRateWidget

- **API**: `open.er-api.com/v6/latest/KRW` (free tier, 1500 req/month, daily updates)
- **Currencies**: USD, EUR, JPY, CNY, GBP, SGD
- **Rate inversion**: API returns KRW→foreign (e.g., USD: 0.000701), code inverts to "1 USD = X KRW"
- **localStorage caching**: Previous rates stored under `exchange_rates_prev` key for real change calculation
- **Polling**: `useExchangeRates` hook - 5min interval, 6min stale threshold, 30s stale check tick
- **Auto-refresh**: `visibilitychange` + `online` event listeners trigger `refreshIfStale()`
- **Live indicator**: Green pulse (fresh) / gray dot (stale) in widget header

### ExchangeRateCalculatorWidget

- Quick currency conversion calculator on the dashboard sidebar

### WeatherWidget

- **API**: Open-Meteo (no API key required)
- **Coverage**: 47 global ports & airports
- **Hook**: `usePortWeather` with paginated carousel (8 ports per page)

### JetFuelWidget

- **API**: US Energy Information Administration (EIA) via `VITE_EIA_API_KEY`
- **Dashboard**: Real-time USGC Jet Fuel spot prices and trend chart

### NoticeWidget / AccountManagerWidget

- NoticeWidget dynamically fetches real-time logistics news via a Vite proxy / edge function pulling from RSS feeds.
- AccountManagerWidget displays static/mock contact information with a paginated carousel display

### Admin Widgets (visible at /admin only)

- **FscRateWidget**: DB(`fsc_rates`) 요율을 표시하고 관리자가 UPS/DHL/FedEx 를 직접 편집·저장한다(연필 → 입력 → 체크). 저장은 캐리어당 `POST /api/v1/fsc/update` 로 나가고, 캐리어 공식 확인 링크를 함께 둔다.
  - ⚠️ **부분 저장 실패를 뭉뚱그리지 말 것** (`fsc/useFscRateEdit.ts`). 저장된 캐리어 / 응답을 못 받아 **반영 여부가 불확실한** 캐리어 / **아예 시도되지 않은** 캐리어는 서로 다른 상태이고, 각각 다르게 알려야 관리자가 무엇을 다시 해야 할지 안다. 요청이 던져진 캐리어를 "이전 값 그대로"라고 단언하면 거짓말이 된다.
  - ⚠️ 실패 후 판단 근거는 입력칸 아래 **`현재 DB`** 값이다. 재조회 중이거나 재조회가 실패했으면 **직전 값을 현재 DB 인 것처럼 보여주지 말 것** — `확인 중…` / `읽지 못했습니다` 로 구분한다.
- **TargetMarginRulesWidget**: DB-driven margin rule CRUD, priority-based grouping (P100/P90/P50/P0), inline add/edit, soft delete
- **SurchargeManagementWidget**: Carrier-specific surcharge CRUD (split into SurchargeForm, SurchargeTable, SurchargeCarrierLinks, SurchargeNotice sub-components)
- **CustomerManagement**: Customer CRUD with quote count badges
- **UserManagementWidget**: User role/company/nationality/network management
- **RateTableViewer**: Read-only carrier rate table viewer
- **AuditLogViewer**: All admin actions audit trail with search/filter

## External APIs

| API             | Endpoint                                | Purpose                                          |
| --------------- | --------------------------------------- | ------------------------------------------------ |
| Rails Backend   | `VITE_API_URL` (default localhost:3000) | Quote CRUD, persistence, **JWT 인증** (`/api/v1/auth/login`, `/me`, httpOnly `bl_session` cookie) |
| open.er-api.com | `/v6/latest/KRW`                        | Exchange rates (KRW base)                        |
| Open-Meteo      | `api.open-meteo.com/v1/forecast`        | Port/airport weather                             |
| US EIA API      | `api.eia.gov/v2/petroleum/pri/spt/data` | USGC Jet Fuel prices                             |
| Slack Webhook   | `/api/v1/notifications/slack`           | Member quote save alerts                         |

> 인증은 **Rails JWT** 가 단일 진실. dead `VITE_SUPABASE_*` 는 `supabase-config-cleanup` 사이클에서 제거됨 (`.env.example` / `vite-env.d.ts` / README).

## i18n System

- **Languages**: `en | ko | cn | ja` (defined in `src/i18n/translations.ts`)
- **Hook**: `useLanguage()` from `LanguageContext` returns `{ language, setLanguage, t }`
- **Persistence**: localStorage key `'language'`
- **Usage**: `t('key.name')` in all components

## API Endpoints

```
POST   /api/v1/quotes/calculate  # Stateless calculation
POST   /api/v1/quotes            # Calculate + save
GET    /api/v1/quotes            # List (page, per_page, q, destination_country, date_from, date_to, status)
GET    /api/v1/quotes/:id        # Detail
PATCH  /api/v1/quotes/:id        # Update status/notes/customer
DELETE /api/v1/quotes/:id        # Delete
GET    /api/v1/quotes/export     # CSV download

# Partner Quote API (X-API-Key auth, NOT user JWT)
POST   /api/v1/quote_api/quotes  # Partner-facing calculate + save.
                                 # Margin resolved server-side from margin_rules against
                                 # PartnerApiKey#margin_identity — caller-supplied
                                 # margin_percent is not permitted. Response is USD total
                                 # only (no breakdown/margin). Throttled 30/min + 500/day
                                 # per key. Keys: bin/rails partner_api_keys:issue[...]

# Authentication
POST   /api/v1/auth/login        # JWT Login
POST   /api/v1/auth/register     # Account creation
PUT    /api/v1/auth/password     # Change Password

# Admin Configuration
GET    /api/v1/fsc/rates         # View Fuel Surcharges (UPS/DHL/FEDEX)
POST   /api/v1/fsc/update        # Update global FSC% rates
GET    /api/v1/margin_rules          # List all rules
POST   /api/v1/margin_rules          # Create rule
PUT    /api/v1/margin_rules/:id      # Update rule
DELETE /api/v1/margin_rules/:id      # Soft delete rule
GET    /api/v1/margin_rules/resolve  # Resolve margin
CRUD   /api/v1/surcharges            # Surcharge management
CRUD   /api/v1/addon_rates           # Add-on rate management
CRUD   /api/v1/customers             # Customer management
GET    /api/v1/users                 # User list/management
GET    /api/v1/audit_logs            # Audit log viewer

# Notifications
POST   /api/v1/notifications/slack   # Slack webhook proxy
```

## Configuration

- **Path alias**: `@/` -> `src/` (both vite.config.ts and tsconfig.json)
- **Tailwind**: BridgeLogis brand palette (`brand-blue-*`, `cyan-*`, `navy`, `deep-blue`, `gold`) + Semantic (`success/warning/destructive/info`), class-based dark mode. Phase 2 완료 후 레거시 `jways-*`/`accent-*` 제거.
- **Environment**: `VITE_API_URL`, `VITE_EIA_API_KEY`, `VITE_SENTRY_DSN`, `VITE_INTERCOM_APP_ID`, `VITE_GOOGLE_MAPS_API_KEY`
- **Tariff sync**: Frontend tariff files in `src/config/` must stay in sync with backend `lib/constants/`
- **Market defaults**: `DEFAULT_EXCHANGE_RATE` (적용 기준환율 — 산출 방식은 아래 **Exchange rate policy**) 과 캐리어별 `DEFAULT_FSC_PERCENT*` 는 `src/config/rates.ts` 에 있다. **현재 수치는 여기 옮겨 적지 않는다** — 매주 바뀌어서 문서가 곧 stale 해진다. 값이 필요하면 파일을 볼 것.
- **FSC 업데이트 주기**: UPS/DHL/FedEx 모두 매주 월요일.
  - **평시 갱신은 Admin FSC 위젯(DB)만으로 끝난다** — 배포 불필요. 2026-08-24부터 계산기가 `useCarrierFscDefault` 로 DB 요율을 기본값으로 읽는다(백엔드는 이전부터 DB 우선). 그 전까지는 위젯 값이 견적에 반영되지 않아 관리자가 올려도 지난주 요율로 견적이 나갔다.
  - 코드 상수(`src/config/rates.ts` + `smart-quote-api/lib/constants/rates.rb` + `src/config/fsc-history.ts`)는 **DB 조회 실패·요청 대기 중 폴백**이자 이력 차트 시드다. 세 파일은 항상 같은 값으로 함께 수정하며, `fsc-history.test.ts` 가 시드↔상수 정합을 강제한다(부분 갱신 시 RED).
  - ⚠️ 사용자가 FSC 칸에 직접 입력한 값은 DB 응답이 늦게 와도 덮이지 않는다. 캐리어를 바꾸면 새 캐리어 기본값으로 초기화된다.
- **Exchange rate policy** (2026-09-02 정책 변경): Live API 자동세팅 비활성화. **부르는 숫자를 반올림 없이 그대로 적용한다** — `/fx-update 1300` 이면 적용 환율이 1300 이다. 50원 단위 제약이 없어 1325·1337 도 그대로 들어간다.
  - ⚠️ **입력값이 곧 마진이다.** 견적 USD = `KRW ÷ 환율` 이라 환율을 낮게 잡으면 USD 견적이 높아져 안전 버퍼가 된다 — 버퍼를 얼마나 둘지는 **숫자를 부르는 쪽의 판단**이고 스크립트는 아무것도 더하거나 빼지 않는다. 송금환율을 그대로 넣으면 버퍼는 0 이다.
  - 구 정책 `floor(송금환율/50)×50`(2026-08-25~09-02)은 **버퍼가 시장 위치에 따라 1원~49원으로 들쭉날쭉**해서 폐기했다(1401 → 1400 이면 버퍼 1원). `--market` 플래그로만 남아 있고 명시할 때만 동작한다.
  - 갱신은 **`/fx-update` 스킬**이 한다(`~/.claude/skills/fx-update/`). main+emax 를 같은 값으로 동시 처리하고, 저장소당 `src/config/rates.ts` + `smart-quote-api/lib/constants/rates.rb` 2파일을 쓴 뒤 재읽기로 검증한다.
  - ⚠️ **FSC와 달리 DB·Admin 위젯이 없다. 상수를 수정하고 배포해야 반영된다.** TS↔RB 불일치는 `fx-apply.py --check`로 검사한다.
  - ✅ `ExchangeRateWidget`은 `evaluateFxDrift`(`src/features/dashboard/lib/fxDrift.ts`)로 시장 USD/KRW와 적용값을 비교한다. 버킷 이탈 시 재검토, 경계 15원 이내면 근접 경고를 표시하며 임계값은 `FX_NEAR_BAND`에서 관리한다. **이게 없던 동안 smart-quote-emax 가 1450 으로 5개월 방치됐다**(2026-08-25 발견) — 위젯은 시장을 계속 보는데 상수는 사람이 갱신해야만 움직여서, 둘을 잇는 게 없으면 stale 이 화면에 안 보인다.
  - ⚠️ 임계값이 15원인 이유: **위젯은 시장(중간)환율이고 정책 입력은 송금환율이라 둘이 다른 숫자다.** TT 스프레드가 ~1%(약 14원)까지 가므로 그 폭에 맞췄다. 송금환율이 더 높아 시장만 보면 상승 이탈을 늦게 잡는데, 밴드가 그 지연을 메운다.
  - ⚠️ 위젯 테스트에서 `DEFAULT_EXCHANGE_RATE` 실값에 의존하지 않는다. `vi.hoisted`와 `@/config/rates` 부분 mock으로 고정하고, 실제 상수와 다른 값을 주입해 mock의 판별력을 확인한다.
- **Error tracking**: Sentry (`@sentry/browser`) integrated across all catch blocks

## Testing

- **Frontend**: Vitest + @testing-library/react, jsdom environment, setup in `src/test/setup.ts`
  - Tests use `vitest/globals` (no imports needed for `describe`, `it`, `expect`)
  - 전체 실행은 `npx vitest run`, 커버리지는 `npm run test:coverage`, E2E는 `npm run test:e2e`
  - ⚠️ 테스트 **개수를 문서에 적지 않는다** — 커밋마다 바뀌어 반드시 stale 해진다. 실제로 이 줄에 박혀 있던 수치가 2026-08 기준 260 여 건 어긋나 있었다. 개수가 필요하면 위 명령을 돌릴 것
- **Backend**: RSpec + FactoryBot + Shoulda Matchers, factories in `spec/factories/`

## Deployment

- **Frontend**: Vercel **goodman-ksways** 팀 — 구 goodman-jways 에서 개명됨 (production: `bridgelogis.com` / `smart-quote-main.vercel.app`) — `origin/main` push 시 **자동배포** (2026-06-13 Git Disconnect→Reconnect 로 webhook 복구; org 이전 jlinsights→goodmangls 때 끊겼었음)
  - 수동 배포(필요 시): `vercel --prod --scope goodman-ksways --yes` (repo 루트). `.vercel` 링크 stale 시 `vercel link --yes --scope goodman-ksways --project smart-quote-main`
  - ⚠️ Vercel **MCP(jlinsights 토큰)는 이 프로젝트 접근 불가** — `vercel` CLI(jlinsights 계정, goodman-ksways 스코프)로만. GitHub Deployments API도 이 팀 배포를 못 봄 → 배포 상태는 `vercel ls smart-quote-main --scope goodman-ksways --prod` 로 확인
- **Backend**: Render.com (Singapore region, PostgreSQL) — `render.yaml` `rootDir: smart-quote-api` monorepo 모드 (migrated 2026-05-04)
  - ⚠️ **자동배포 이력**: org 이전(jlinsights→goodmangls) 후 Render 가 구 repo 에 연결된 채 방치돼 **자동·수동배포가 모두 헛돌았음** (그 사이 백엔드 변경은 프로덕션 미반영). 2026-08-17 goodmangls/smart-quote 로 재연결했지만 push 자동배포는 계속 미발화였고, **2026-09-06 배포 로그에서 원인을 확인했다 — `we don't have access to your repo`. goodmangls org 에 Render GitHub App 이 설치돼 있지 않았다**(`gh api /orgs/goodmangls/installations` 응답에 `render` 없음). App 설치 후 `render (all)` 로 확인됨. ⚠️ **다만 push 트리거가 실제로 발화하는지는 아직 관측되지 않았다** — 다음 백엔드 push 에서 확인할 것. 그때까지는 대시보드 **Manual Deploy** 로 실행하고, 반영 여부는 커밋 해시가 아니라 **프로덕션 응답의 코드 마커**로 검증한다. ⚠️ Manual Deploy 를 눌러도 **같은 커밋을 다시 배포**하는 경우가 있으니 배포 대상 커밋을 확인할 것
- **Config**: `render.yaml` (repo root) for backend infrastructure; `healthCheckPath: /up` for zero-downtime deploys
- **Seed**: After backend deploy, run `rails runner db/seeds/addon_rates.rb` in Render Shell for new add-on rates

## Design System (DESIGN.md)

**UI 작업 시 `docs/02-design/DESIGN.md`를 먼저 참조한다.**

- BridgeLogis 브랜드 토큰·Semantic 토큰의 단일 진실 공급원(SSOT)
- YAML 프론트매터 = 기계 참조용 토큰 (`{colors.brand-blue}`, `{colors.navy}` 등)
- 마크다운 본문 = Do's/Don'ts + 컴포넌트 패턴 + WCAG 검증 쌍
- **Phase 2 완료** (2026-04-24, DESIGN.md v1.1.0) — 레거시 `jways-*`/`accent-*` 전면 제거. Tailwind 기본 `blue-*`/`sky-*` 도 **사용 금지**
- 토큰이 없으면 임의 값을 만들지 말고 DESIGN.md 를 먼저 수정한다
- 차트·SVG 등 HEX 직접 사용 영역은 `src/lib/chartColors.ts` 의 `CHART_COLORS` 상수만 사용
- Feature 단위 design 문서(`docs/02-design/features/*.design.md`)는 DESIGN.md 토큰을 참조
- 화면 목업 아트보드는 `design/` 에 있다(`*.dc.html` + `canvas.json`). ⚠️ 시드된 `design/*.html` 은 `seed-canvas.mjs` 가 원본에서 다시 찍어내는 **2.4MB 생성물**이라 `.gitignore` 로 제외돼 있다 — 수정은 항상 원본을 고쳐 재시드한다

## User Guides

When adding, modifying, or removing user-facing features, **always update the corresponding User Guide**:

- **Admin Guide**: `docs/USER_GUIDE_ADMIN.md` — Admin-only features (margin rules, FSC, surcharges, user/customer management, audit log)
- **Member Guide**: `docs/USER_GUIDE_MEMBER.md` — Member features (dashboard, quote calculator, history, PDF)

Update the "Last Updated" date and version in the guide header when making changes.

## Commit Messages

Always record a one-line Korean description with emoji in `.commit_message.txt` after code changes.
