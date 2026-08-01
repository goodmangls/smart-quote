# Intercom Dashboard Setup Runbook

> Single-file runbook for configuring the BridgeLogis Intercom workspace.
> Follow these steps in order. Everything below is pre-written and ready to
> copy-paste into Intercom (app.intercom.com).
>
> Estimated total time: **60–90 minutes** (excluding ad-hoc tweaks).

## Prerequisites

- Admin access to the Intercom workspace (`k5z51xs2`)
- BridgeLogis codebase deployed with commit `14101c2` or later
  (this gives us event tracking for `quote_calculated`, `quote_saved`,
  and `last_page`)
- About 90 minutes of focused time

---

## Phase 1 — Messenger Home Screen (5 min)

**Intercom → Messenger → Customize → Home screen**

### Heading
```
👋 Welcome to BridgeLogis
```

### Subheading
```
The express freight quoting platform trusted by forwarding partners in 250+ countries.
```

### Body
```
We're here to help with rates, routing, cut-offs, schedules, and everything in between. Usually reply within a few hours during Seoul business hours (09:00–18:00 KST, Mon–Fri).
```

### Shortcuts (Home screen → Shortcuts → Add)

Add these five shortcuts in order. Each can link to a Help Center article
or start a new conversation with a template.

```
📊  Get a quick quote walkthrough
✈️  Ask about a specific route or lane
📅  Check schedules & cut-off times
⛽  Fuel surcharge or rate question
👤  Talk to someone on the team
```

---

## Phase 2 — Office Hours & Away Message (5 min)

**Intercom → Settings → Office hours**

### Office hours
- **Timezone**: Asia/Seoul
- **Days**: Monday–Friday
- **Hours**: 09:00–18:00

### Away message (outside office hours)
```
Thanks for your message! Our team is currently offline
(we're based in Seoul 🇰🇷, 09:00–18:00 KST, Mon–Fri).

Leave your question and we'll get back to you first thing —
usually within 2 hours of opening. For urgent shipments,
please also email support@bridgelogis.com.
```

> ⚠️ Replace `support@bridgelogis.com` with your actual support email
> before publishing.

---

## Phase 3 — Pre-chat Greeting (3 min)

**Intercom → Messenger → Conversations → Pre-chat form**

### Greeting message
```
Thanks for reaching out 👋
Before we dive in — could you share:

1. Origin and destination (city or airport code)
2. Approximate weight and dimensions
3. Carrier preference if any (UPS, DHL, or open)

That helps us give you a precise answer faster.
```

---

## Phase 4 — Saved Replies (15 min)

**Intercom → Saved replies → New saved reply**

Create these six saved replies. The shortcut is what operators type after
a slash to insert the full text.

### `/fsc`
```
Our FSC is updated weekly based on UPS and DHL public notices. You can see the current rate in the quote result footer. The next scheduled update is every Monday.
```

### `/dap`
```
UPS and DHL express shipments on BridgeLogis are DAP terms only. This means the shipper pays freight and we handle DDP-style cost breakdown up to the delivery address, but import duties and taxes are billed to the consignee at delivery.
```

### `/zone`
```
UPS and DHL assign destination countries to zones (Z1–Z10 and Z1–Z8 respectively). You can see the zone lookup in the admin Rate Table Viewer. If your destination isn't listed, please share the country/city and we'll confirm.
```

### `/cut-off`
```
Cut-off times vary by carrier. UPS ICN outbound typically cuts off 2 hours before departure; DHL is 3 hours. You'll see exact cut-offs in /schedule once you're signed in.
```

### `/magic-link`
```
Magic link sign-in sends a one-time link to your email. It's valid for 15 minutes and single use. If the link expired, just request a new one from the sign-in page. Also check your spam folder and make sure your mail server isn't prefetching the link (a common corporate cause for "already used" errors).
```

### `/pdf`
```
You can download any saved quote as a PDF from the History tab — click the quote, then the download icon. The PDF includes the full carrier breakdown, add-ons, and a valid-until date. You can also use the Share Link button to send a read-only URL that hides your margin.
```

---

## Phase 5 — Help Center Collections & Articles (30 min)

**Intercom → Help Center → Collections → New collection**

### Create collections
Create four collections in this order:

1. **Getting Started** — icon: 🚀
2. **Quoting** — icon: 📊
3. **Admin** — icon: 🔧
4. **Troubleshooting** — icon: 🛠

### Publish articles

Copy each markdown file from `docs/help-center/` into a new Intercom
article (Intercom supports markdown paste directly in the editor).

| File | Intercom Collection | Audience |
|---|---|---|
| `01-how-express-rates-are-calculated.md` | Quoting | All users |
| `02-ups-vs-dhl-which-to-pick.md` | Quoting | All users |
| `03-fuel-surcharge-fsc-explained.md` | Quoting | All users |
| `04-saving-sharing-exporting-quotes.md` | Getting Started | All users |
| `05-magic-link-sign-in.md` | Troubleshooting | All users |
| `06-flight-schedule-viewer.md` | Admin | Admin segment |
| `07-rate-tables-and-addons.md` | Admin | Admin segment |
| `08-destination-not-in-zone-list.md` | Quoting | All users |

For Admin articles, restrict the audience to the `role = admin` segment
so partners don't see them on the Help Center homepage.

---

## Phase 6 — Fin AI System Prompt (5 min, optional)

**Intercom → Fin AI → Settings → Custom instructions**

Only if you're using Fin AI for automated responses.

```
You are the BridgeLogis assistant.
You help forwarding partners with:
- Express freight quoting (UPS and DHL only — we don't quote air cargo or sea here)
- Door-to-Door pricing including FSC and surcharges
- UPS and DHL zone lookups by destination country
- Flight schedule information (ICN outbound, visible in /schedule)
- Saving, sharing, and exporting quotes as PDF
- Magic-link sign-in troubleshooting

Rules:
- Always quote in KRW by default. USD conversion uses live FX.
- UPS and DHL express shipments are DAP only. Never suggest EXW or FOB for express.
- For air cargo (Aeroflot SU, TG, LJ etc.) or sea freight, hand off to a human —
  these are not in the platform yet.
- For pricing agreements, contract rates, or claims — hand off to a human.
- Office hours: 09:00–18:00 KST, Mon–Fri. Outside these hours, tell the partner
  we'll reply first thing the next business day.
- Respond in the same language the partner uses. Default is English.

Tone: warm, professional, concise. Avoid jargon unless the partner uses it first.
Sign off as "The BridgeLogis team" when closing a thread.
```

---

## Phase 7 — Event-Based Auto-Messages (wait 1 day + 15 min)

> ⏳ **Wait at least 24 hours after deploying commit `14101c2`** before
> setting these up. This gives the platform time to collect baseline
> `quote_calculated` and `quote_saved` events so you can see the data
> shape before targeting against it.

**Intercom → Outbound → Chats → New message**

### Auto-message 1 — Stuck on a quote
- **Audience**: users who triggered `quote_calculated` ≥ 3 times in the
  last 10 minutes AND `quote_saved` count = 0
- **Trigger**: after 30 seconds on `/quote`
- **Message**:
```
Stuck on a quote? We can help you figure out the right
carrier, zone, or add-on. Just ping us here.
```

### Auto-message 2 — First save congrats
- **Audience**: users whose `quote_saved` total count = 1
- **Trigger**: right after the event fires
- **Message**:
```
Nice — your first quote is saved 🎉
Want us to walk you through the history view
or the PDF export? Happy to help.
```

### Auto-message 3 — Schedule page visitors
- **Audience**: users whose `last_page` = `/schedule`
- **Trigger**: 45 seconds on page
- **Message**:
```
Looking at the flight schedule? If you need to confirm a
cut-off or check capacity on a specific flight, just ask —
we usually have carrier contacts for ICN outbound lanes.
```

### Auto-message 4 — Returning partner
- **Audience**: users whose `last_seen_at` is > 30 days ago
- **Trigger**: on messenger open
- **Message**:
```
Welcome back 👋 Anything new we can help you quote this week?
```

---

## Phase 8 — Product Tour (optional, 20 min)

**Intercom → Outbound → Tours → New tour**

### "60-second platform tour"

Target: users whose `created_at` is within the last 7 days AND
`quote_saved` count = 0.

**Step 1** — on `/dashboard` or `/quote`
```
Welcome aboard 👋
Let's get you quoting in under a minute.
Three steps, no paperwork.
```

**Step 2** — highlighting `InputSection`
```
Enter origin, destination, weight, and dimensions.
We fetch live rates, FX, and fuel surcharges automatically.
```

**Step 3** — highlighting `CarrierComparisonCard`
```
Compare UPS and DHL side by side.
We'll highlight the better option based on your cargo.
```

**Step 4** — highlighting `SaveQuoteButton`
```
Save, share, or download as PDF.
Your quote history lives under /dashboard. That's it.
```

---

## Phase 9 — Verification (10 min, after deploy)

After deploying and doing a test quote on bridgelogis.com:

- [ ] Open messenger as a signed-out visitor — English UI, welcome heading
      shows "Welcome to BridgeLogis"
- [ ] Sign in — messenger still English, profile shows your email/name
- [ ] Visit `/quote` — check Intercom inbox: `last_page = /quote` on your
      session
- [ ] Enter a test quote and wait 3 seconds — check Events tab:
      `quote_calculated` event received with carrier, zone, total_krw
- [ ] Save the quote — check Events tab: `quote_saved` with reference_no
- [ ] Open saved quote detail — click **Ask** button → messenger opens
      with pre-filled "I have a question about quote SQ-2026-XXXX"
- [ ] Switch app language to Korean — messenger stays English (because
      `FORCED_INTERCOM_LANGUAGE = 'en'`)

---

## Rollback

If anything misbehaves:

- **Revert to default welcome**: Messenger → Customize → Reset to default
- **Disable auto-messages**: Outbound → select → Pause
- **Revert codebase**: `git revert 14101c2` — all hooks become no-ops
  automatically because `trackEvent`/`updateContext` gracefully skip if
  Intercom isn't loaded

---

## Future — Re-enable Multi-Language

When you're ready to serve Korean/Japanese/Chinese partners in their
native language:

1. Prepare language-specific saved replies in Intercom for ko/ja/zh-CN
2. Translate the 8 Help Center articles
3. Set up language-conditional auto-messages in Outbound
4. Edit `src/components/Intercom.tsx`:
   ```ts
   const FORCED_INTERCOM_LANGUAGE: string | null = null; // was 'en'
   ```
5. Deploy. Messenger UI will swap to partner's language automatically
   (ko → ko, ja → ja, cn → zh-CN, en → en).

No other code changes needed — the infrastructure is already in place.

---

## Who to ping when stuck

- Platform / code issues → engineering
- Intercom billing / plan limits → whoever owns the Intercom account
- Content tweaks (article copy, saved replies) → anyone with Intercom
  admin access

Keep this runbook updated as the workflow evolves. Git history on this
file is the audit trail.
