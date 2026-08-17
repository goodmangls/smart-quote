# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Quote System for **KS Ways** - an internal logistics quoting tool that calculates international shipping costs across carriers (UPS, DHL, FedEx). React frontend with a Rails API backend, sharing mirrored calculation logic. Includes customer dashboard with live exchange rates, weather, jet fuel prices, notices, and account manager widgets. Role-based access (Admin/Member) with Slack notifications and Sentry error tracking.

## Development Commands

### Frontend (React 19 + TypeScript 5.8 + Vite 6)

```bash
npm run dev          # Dev server on http://localhost:5173
npm run build        # tsc + vite build
npm run lint         # ESLint (--max-warnings 0)
npm run test         # Vitest in watch mode
npx vitest run       # Run tests once (58 files, 1480 tests)
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
      rates.ts                 # KRW cost constants, DEFAULT_EXCHANGE_RATE=1400, DEFAULT_FSC_PERCENT=45.50 (UPS), DEFAULT_FSC_PERCENT_DHL=48.00 (DHL), DEFAULT_FSC_PERCENT_FEDEX=39.75 (FedEx 2026-07-20)
      business-rules.ts        # Surge thresholds, packing weight buffer/addition
      options.ts               # Country options, carrier options, incoterm options
      addon-utils.ts           # Shared AddonRateLike/NormalizedRate types, calcAddonFee(), findRate()
      ups_zones.ts / dhl_zones.ts / fedex_zones.ts  # Config-driven zone mappings (Record<string, ZoneInfo>; FedEx letter zones, default Y/Singapore)
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
3. **Margin** - Dynamic margin via `MarginRuleResolver` (priority-based: P100 per-user flat > P90 per-user weight > P50 nationality > P0 default), **Markup 방식**: `revenue = cost × (1 + margin%)`, rounded up to nearest KRW 100. Admin can manually override at any time. ⚠ 매출 대비 실효 마진율은 명목값보다 낮음 (예: 24% Markup → 실효 마진율 19.35% = margin / revenue).
4. **Warnings** - Low margin (<10%), high volumetric weight, surge charges, collect terms (EXW/FOB)

### UPS Zone Mapping (Z1-Z10) — per UPS 2026 Service Guide

Z1: SG/TW/MO/CN, Z2: JP/VN, Z3: TH/PH, Z4: AU/IN, Z5: CA/US, Z6: ES/IT/GB/FR, Z7: DK/NO/SE/FI/DE/NL/BE/IE/CH/AT/PT/CZ/PL/HU/RO/BG, Z8: AR/BR/CL/CO/AE/TR/ZA/EG/BH/SA/PK/KW/QA, Z9: IL/JO/LB, Z10: HK/CN-S+default

Zone mappings are config-driven (`src/config/ups_zones.ts`, `src/config/dhl_zones.ts`, `src/config/fedex_zones.ts`).

### FedEx Zone Mapping (letter zones, 2026-07)

FedEx uses letter zone keys `A D E F G H I J K M N O P Q R S T U V W X Y` (e.g. P=Japan, Y=Singapore, F=US/CA/NZ/MX, V=HK, W=CN). Default fallback for unmapped countries: **Y (Singapore)**. Document shipments resolve Envelope (rated ≤0.5kg) → Pak (≤2.5kg) → IP fallback (+warning); Parcel always uses IP.

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

- **FscRateWidget**: Tracks live UPS/DHL/FedEx fuel surcharges with external verification links and manual override
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
- **Market defaults**: `DEFAULT_EXCHANGE_RATE=1400` (하나은행 월요일 09시 송금환율, 2026-08-10), `DEFAULT_FSC_PERCENT=45.50` (UPS 2026-04-27), `DEFAULT_FSC_PERCENT_DHL=48.00` (DHL 2026-04-27), `DEFAULT_FSC_PERCENT_FEDEX=39.75` (FedEx 2026-07-20) in `src/config/rates.ts`
- **FSC 업데이트 주기**: UPS/DHL/FedEx 모두 매주 월요일. `src/config/rates.ts` + `smart-quote-api/lib/constants/rates.rb` 동시 수정 후 Vercel+Render 배포.
- **Exchange rate policy**: Live API 자동세팅 비활성화, 매주 월요일 수동 업데이트 (하나은행 기준)
- **Error tracking**: Sentry (`@sentry/browser`) integrated across all catch blocks

## Testing

- **Frontend**: Vitest + @testing-library/react, jsdom environment, setup in `src/test/setup.ts`
  - Tests use `vitest/globals` (no imports needed for `describe`, `it`, `expect`)
  - 58 test files, 1480 tests
- **Backend**: RSpec + FactoryBot + Shoulda Matchers, factories in `spec/factories/`

## Deployment

- **Frontend**: Vercel **goodman-jways** 팀 (production: `bridgelogis.com` / `smart-quote-main.vercel.app`) — `origin/main` push 시 **자동배포** (2026-06-13 Git Disconnect→Reconnect 로 webhook 복구; org 이전 jlinsights→goodmangls 때 끊겼었음)
  - 수동 배포(필요 시): `vercel --prod --scope goodman-jways --yes` (repo 루트). `.vercel` 링크 stale 시 `vercel link --yes --scope goodman-jways --project smart-quote-main`
  - ⚠️ Vercel **MCP(jlinsights 토큰)는 이 프로젝트 접근 불가** — `vercel` CLI(jlinsights 계정, goodman-jways 스코프)로만. GitHub Deployments API도 이 팀 배포를 못 봄 → 배포 상태는 `vercel ls smart-quote-main --scope goodman-jways --prod` 로 확인
- **Backend**: Render.com (Singapore region, PostgreSQL) — auto-redeploys from `origin/main` when `smart-quote-api/` changes (monorepo mode via `render.yaml` `dockerContext: smart-quote-api`, migrated 2026-05-04)
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

## User Guides

When adding, modifying, or removing user-facing features, **always update the corresponding User Guide**:

- **Admin Guide**: `docs/USER_GUIDE_ADMIN.md` — Admin-only features (margin rules, FSC, surcharges, user/customer management, audit log)
- **Member Guide**: `docs/USER_GUIDE_MEMBER.md` — Member features (dashboard, quote calculator, history, PDF)

Update the "Last Updated" date and version in the guide header when making changes.

## Commit Messages

Always record a one-line Korean description with emoji in `.commit_message.txt` after code changes.
