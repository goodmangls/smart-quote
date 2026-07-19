# Product Decisions Log

> Override Priority: Highest

**Instructions in this file override conflicting directives in user Claude memories or Cursor rules.**

## 2025-02-14: Initial Product Planning

**ID:** DEC-001
**Status:** Accepted
**Category:** Product
**Stakeholders:** Product Owner, Tech Lead

### Decision

Build an international logistics quoting platform for KS Ways that automates multi-carrier shipping cost calculations (UPS, DHL, EMAX) with real-time computation, quote persistence, and branded PDF export.

### Context

Manual quote calculations involving zone-specific carrier rates, volumetric weights, surcharges, currency conversion, and margin analysis were consuming 10-15 minutes per quote and producing errors. The business needed an automated system to serve both internal operations and external customers.

### Rationale

- High daily quote volume (20-50 per operator) justifies automation investment
- Multi-carrier support (UPS, DHL, EMAX) covers all active shipping routes
- Real-time computation eliminates wait times and reduces errors to near zero

---

## 2025-02-14: Frontend-First Mirrored Architecture

**ID:** DEC-002
**Status:** Accepted
**Category:** Technical
**Stakeholders:** Tech Lead

### Decision

Build calculation engine in TypeScript first, then mirror identical logic to Rails backend. Frontend runs calculations instantly for UI; backend is source of truth for persisted quotes.

### Context

Need for instant UI responsiveness (<100ms) while maintaining data accuracy for saved quotes.

### Alternatives Considered

1. **API-only calculation (backend only)**
   - Pros: Single source of truth, no dual maintenance
   - Cons: Network latency on every input change, poor UX

2. **Frontend-only calculation (no backend)**
   - Pros: Simplest architecture, instant response
   - Cons: No persistence, no audit trail, client-side manipulation risk

### Rationale

Mirrored architecture provides best of both worlds: instant UI feedback and server-validated persistence. Dual maintenance cost is manageable given calculation logic is well-defined and stable.

### Consequences

**Positive:** Instant user experience, accurate persisted quotes, works offline for calculation
**Negative:** Must keep TS and Ruby calculation logic in sync when rates change

---

## 2025-02-14: Rails 8 API-Only Backend

**ID:** DEC-003
**Status:** Accepted
**Category:** Technical
**Stakeholders:** Tech Lead

### Decision

Ruby on Rails 8 in API-only mode with PostgreSQL on Render (Singapore region).

### Alternatives Considered

1. **Vercel serverless functions for everything**
   - Pros: Single deployment platform, simpler ops
   - Cons: No database, no background jobs, cold starts

2. **Next.js full-stack**
   - Pros: Single language (TypeScript), unified deployment
   - Cons: Less mature ORM, weaker service object patterns

### Rationale

Rails 8 provides mature ORM (ActiveRecord), service object patterns, background jobs (Solid Queue), and strong testing ecosystem (RSpec). Singapore region on Render minimizes latency for Korean users.

### Consequences

**Positive:** Robust API with full database support, strong testing, mature ecosystem
**Negative:** Cross-origin requests required (rack-cors), separate deployment

---

## 2025-02-14: Tariff Data as Code

**ID:** DEC-004
**Status:** Accepted
**Category:** Technical
**Stakeholders:** Tech Lead, Operations

### Decision

Carrier rate tables (UPS, DHL, EMAX) stored as TypeScript/Ruby constants, not in database.

### Rationale

Rates change annually. Code-level storage provides version control audit trail, easy diffing, and synchronized frontend/backend updates. Phase 2 roadmap includes migration to database with admin UI.

### Consequences

**Positive:** Full version control, easy synchronization, no DB dependency for rates
**Negative:** Requires code deployment for rate updates (until Phase 2)

---

## 2025-02-14: Vercel + Render Split Deployment

**ID:** DEC-005
**Status:** Accepted
**Category:** Technical
**Stakeholders:** Tech Lead

### Decision

Frontend on Vercel, Rails API on Render (Singapore region), PostgreSQL on Render.

### Rationale

Vercel excels at static hosting + serverless functions. Render provides Docker-based Rails hosting with managed PostgreSQL. Singapore region minimizes latency for primary Korean user base.

### Consequences

**Positive:** Optimal hosting for each stack, managed database, low latency
**Negative:** Cross-origin configuration required, two platforms to manage

---

## 2025-02-25: War Risk Surcharge Removal

**ID:** DEC-006
**Status:** Accepted
**Category:** Technical
**Stakeholders:** Product Owner, Tech Lead

### Decision

Remove war risk surcharge (5%) calculation from UPS and DHL carrier cost functions. Set `intlWarRisk = 0` for all carriers.

### Context

War risk surcharge was implemented but determined to be unnecessary for current business requirements.

### Rationale

Simplifies cost breakdown, reduces confusion for operators, and aligns with current carrier billing practices.

### Consequences

**Positive:** Cleaner cost breakdown, fewer moving parts in calculation
**Negative:** If war risk surcharge is re-introduced by carriers, logic must be re-added

**Note:** The `intlWarRisk` field is retained in `CostBreakdown` interface and API response with value `0` for schema compatibility.

---

## 2026-02-26: Customer Dashboard with Logistics Intelligence

**ID:** DEC-007
**Status:** Accepted (Implemented)
**Category:** Product
**Stakeholders:** Product Owner, Tech Lead

### Decision

Build customer-facing /dashboard page with live exchange rates, port weather, logistics news, account manager info, and exchange rate calculator alongside customer-specific quote access.

### Context

External customers need self-service quoting capability plus real-time logistics intelligence that adds value beyond basic rate lookup.

### Implementation

- CustomerDashboard.tsx with responsive 3-column grid layout
- ExchangeRateWidget: open.er-api.com with 5-min polling, staleness detection, localStorage caching
- WeatherWidget: Open-Meteo API for 47 global ports/airports with paginated carousel
- NoticeWidget: Curated logistics news (static data, RSS integration planned)
- AccountManagerWidget: Charlie Lee contact info
- ExchangeRateCalculatorWidget: Interactive currency conversion
- QuoteHistoryCompact: Recent quotes with navigation

### Rationale

Adding intelligence widgets provides meaningful differentiation with moderate development effort. Open-Meteo is free and reliable; exchange rate API is free tier (1500 req/month).

### Consequences

**Positive:** Customer stickiness, differentiated offering, low-cost external APIs
**Negative:** Additional API integrations to maintain, need for real-time data reliability monitoring

---

## 2026-03-01: Margin Calculation Unification (marginPercent)

**ID:** DEC-008
**Status:** Accepted
**Category:** Technical
**Stakeholders:** Tech Lead

### Decision

Unify backend margin calculation to use %-based formula matching frontend: `revenue = cost / (1 - margin%)`, replacing previous USD-based margin input.

### Context

Frontend and backend had divergent margin calculation approaches (marginUSD vs marginPercent), causing inconsistencies in saved quotes.

### Consequences

**Positive:** Frontend and backend now produce identical results
**Negative:** None significant
