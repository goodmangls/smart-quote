---
type: analysis
title: Codebase Health Analysis
project: j-ways-smart-quote-system (smart-quote-main)
date: 2026-06-06
author: jhlim725
method: 3 parallel subagents (FE quality, BE quality, security) + direct verification
scope: monorepo — React 19/TS frontend (~20k LOC) + Rails 8 backend (~4k LOC)
---

# Codebase Health Analysis — smart-quote-main

> **Overall Health: 6.7 / 10** 🟡
> Date: 2026-06-06 · Method: 3 parallel subagents + direct verification (6 security claims corrected)

Sibling codebase to smart-quote-emax (shared calc-logic lineage; Goodman GLS / J-Ways → bridgelogis.com). Solid foundation (type-safe `any`=0, no SQLi/hardcoded secrets, proper CORS, 1443 FE tests). Main weaknesses vs emax: **security gaps in the new AI chat feature + larger backend rubocop debt (1054)**.

| Area | Score | One-liner |
|------|:-----:|-----------|
| Frontend quality | 6.8 | calc orchestrator + UPS/DHL panel ~99% duplication + large admin widgets |
| Backend quality | 6.8 | chat_controller (key per-request, no timeout, 64-line inline prompt) + broad rescue |
| Security | 6.5 | AI chat trio (rate limit / prompt injection / authz) + margin resolve authz |

---

## Metrics

| Metric | Value |
|--------|-------|
| Frontend TS/TSX (non-test) | ~19,871 LOC |
| Backend Ruby (app/lib) | ~4,186 LOC |
| `any` types | 0 |
| `console.log/debug` | 0 |
| `dangerouslySetInnerHTML` | 1 (verified SAFE — JSON-LD `JSON.stringify`) |
| Largest FE file | GuideVisuals.tsx (482), UserGuidePage.tsx (439) |
| Largest BE file | quotes_controller.rb (249), chat_controller.rb (234) |
| FE tests | 51 files, 1443 passing |
| Backend rubocop | 1054 offenses (1038 autocorrectable) — CI-ungated |
| npm audit | 4 vulns (1 critical / 2 high / 1 moderate), mostly dev deps |

---

## Verification notes (security subagent claims corrected)

The security subagent reported a 4.2/10 posture; direct verification found several overstatements:

| Claim | Verification | Corrected |
|-------|--------------|-----------|
| Chat prompt injection "CRITICAL privilege escalation" | `chat_controller.rb:55-56` interpolates user `name`/`company` — confirmed | **HIGH info-disclosure** (LLM may leak admin/pricing knowledge; not system privilege escalation) |
| Chat endpoint no rate limit | `rack_attack.rb` has no `chat` throttle (general 300/min only) — confirmed | **HIGH** (Claude API per-token cost abuse) ✓ |
| margin_rules#resolve arbitrary email | `before_action :require_admin!, except: [:resolve]` + `params[:email]` — confirmed | **HIGH** authz/IDOR ✓ |
| npm "2 CRITICAL, 11 HIGH" | Actual: 4 (1 crit/2 high/1 mod), mostly dev (vite/vitest/undici/tar) | **MEDIUM** (dev-env risk, not prod runtime) |
| CORS misconfig | `cors.rb` uses allowlist + Vercel regex + reject-localhost-in-prod | **SAFE** (better than emax's fail-open `*`) ✓ |
| dangerouslySetInnerHTML | `JsonLdNewsArticle.tsx:88` = `JSON.stringify(schema)`, code-gen, no user input | **SAFE** ✓ |

---

## HIGH

| # | Category | Location | Issue | Recommendation |
|---|----------|----------|-------|----------------|
| H1 | Security/Cost | `smart-quote-api/config/initializers/rack_attack.rb` (no chat throttle) | `/api/v1/chat` falls under general 300/min → authenticated user can abuse Claude API token cost | Add chat-specific throttle (e.g. 10/min) |
| H2 | Security/AuthZ | `margin_rules_controller.rb:7,52` | `resolve` not admin-gated + arbitrary `params[:email]` → member can enumerate any/competitor pricing & margin | Restrict to own email (or admin) |
| H3 | Security/Injection | `chat_controller.rb:55-56` | user `name`/`company` interpolated into system prompt unsanitized → prompt injection can surface admin pricing knowledge | Sanitize/escape user fields; enforce authorization in code, not the prompt |
| H4 | Complexity | `src/features/quote/services/calculationService.ts` (orchestrator) + `quote_calculator.rb` | Single large orchestrator = single point of failure for the calc pipeline (same pattern as emax) | Extract surcharge/fsc/addon pure functions (FE+BE mirror) |
| H5 | ErrorHandling | `quotes_controller.rb:16`, `chat_controller.rb:34`, auth | Broad `rescue StandardError` hides root cause; some `e.message` leakage | Branch by exception type + structured logging + generic client message |
| H6 | Backend reliability | `chat_controller.rb:13-29` | Anthropic client created per-request, no timeout/circuit-breaker → hang/latency risk | Add 30s timeout + pooled/lazy client |

## MEDIUM

| # | Category | Location | Issue | Recommendation |
|---|----------|----------|-------|----------------|
| M1 | Duplication | `UpsAddOnPanel.tsx` ↔ `DhlAddOnPanel.tsx` (283/246 lines, ~99% clone) | Carrier add-on logic/render duplicated → sync-miss bug vector | `<CarrierAddOnPanel>` generic + `useCarrierAddOns(carrier)` |
| M2 | Security/Deps | `package.json` | npm audit 4 (1 crit/2 high/1 mod), mostly dev (vite/vitest/undici/tar) | `npm audit fix` (dev-env hardening) |
| M3 | Performance | `quotes_controller.rb:55` index | stale_drafts update + paginated serialization N+1 risk | `includes(:customer)` before pagination |
| M4 | Maintainability | admin widgets (UserManagement 378, TargetMarginRules 376, FscRate 372, QuoteDetailModal 355) | 300+ lines, no row/form decomposition, scattered useState | Extract row/form subcomponents + custom hooks |
| M5 | Complexity | `chat_controller.rb:44-129` | 64-line inline system prompt coupled to controller | Extract to `app/services/prompts/` |
| M6 | Performance | `quote_calculator.rb`, FscFetcher | per-request DB FSC fetch (no request-scope cache) | `@db_fsc ||= ...` request memoization |

## LOW
- Session cookie domain `:all` in dev → explicit domain
- Magic-link email enumeration (rate-limited, acceptable)
- Refresh-token jti denylist not implemented (mitigated by 15-min access TTL)
- `JsonLdNewsArticle` add Zod schema validation (currently safe but typos fail silently)

---

## Verified-safe patterns (strengths)
- **Types**: `any`=0, `console.log`=0
- **Security**: SQLi=0 (parameterized), `dangerouslySetInnerHTML` safe (JSON-LD code-gen), CORS allowlist+regex+reject-localhost, `.env.local/.production` git-untracked, JWT refresh rotation, force_ssl, param filtering, rate limiting on most endpoints
- **Structure**: service objects (Resolver/Calculator), audit logging, no 800-line violations

## Known debt
- Backend rubocop 1054 offenses (CI-ungated) — separate cleanup cycle
- Backend rspec not run (needs test DB; likely pre-existing infra debt like emax)

---

## Priority backlog

```
[ ] H1  chat endpoint rate limit (block cost abuse) — fastest ROI
[ ] H2  margin_rules#resolve own-email/admin only (block pricing enumeration)
[ ] H3  chat prompt user-field sanitization (injection)
[ ] H6  Anthropic client timeout (prevent hangs)
[ ] H4  calc orchestrator extraction (FE+BE, shared with emax)
[ ] H5  broad rescue cleanup
[ ] M1  unify UPS/DHL panels (de-dup)
[ ] M2  npm audit fix (dev deps)
```

**Highest-ROI bundle = AI chat security (H1+H2+H3+H6)** — the new chat/resolve features lack guards; cost abuse, pricing disclosure, and prompt injection all concentrate there. Good candidate for one cycle: `/pdca plan chat-security-hardening`.

Findings shared with smart-quote-emax (H4 calc complexity, H5 rescue, M1 panel duplication) are best fixed across both repos together.
