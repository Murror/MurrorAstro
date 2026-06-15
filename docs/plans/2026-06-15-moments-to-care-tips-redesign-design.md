# Moments to Care → Care Tips redesign

Date: 2026-06-15
Status: Approved (brainstorm complete), pending implementation plan
Author: Astro + Claude

## Problem

The home-screen "Moments to Care" section today is a paged carousel of AI-generated
cards per connection. For each friend the web fans out two calls
(`GET /v1/connections/{id}/insights/latest` and `GET /v1/connections/{id}/takeaways`)
and assembles up to 3 cards: a Common Insight, activity Suggestions, a static
"Reflect on Today" prompt, and (the richest) a Takeaway Insight.

The value is real but **gated behind a chain of inputs**:

1. The user journals / reflects, AND
2. the connection journals / reflects, THEN
3. the AI generates a shared insight, THEN
4. the card appears.

The best card (Takeaway Insight) only appears **after both people reflect**, so it is
usually empty. New or quiet connections see mostly empty / reflect-prompt cards. The app
asks the user to *give* before it *gives back* — high friction, slow time-to-value.

## Goal

Reframe the section so it **helps the user capture, remember, and act on the essence of
the people they care about** — the details that build empathy — and surface that value
**quickly and with low friction**. The user should see something meaningful immediately
and feel pulled toward deeper understanding of and connection with the people in their life.

## Decisions (locked during brainstorm)

| Decision | Choice |
| --- | --- |
| Who authors the tips | AI generates them |
| Data sources | Both sides' in-app data **when available, never gated** + confirmed public online content + smart cold start |
| Tip flavors | `remember`, `action`, `understand`, `question` (all four) |
| Home presentation | Per-person card carousel (reuse the existing carousel) |
| Implementation approach | Approach B — new **additive** Care Tips generator + endpoint; existing pipeline untouched |
| External data scope | Auto-discover & scan **public** profiles, with guardrails (see below) |
| Identity matching | User must confirm which public profile is their friend before any scan |
| Launch gating | Build + test on staging behind flags; production launch gated on aegis (legal) + shield (compliance) sign-off |

### Data model: both sides, never gated

Tips are generated from whatever data exists on either side, but **never wait on both
sides**:

- Only the user has shared things about the connection → tips from the user's side + cold start.
- The connection is also an active Murror user → the AI additionally draws on the
  connection's app activity (emotional arc, reflections), via the **same privacy gate that
  `commonInsight` already uses today**. No new raw-content exposure.

The generator always returns >= 1 tip. Rich data → real tips. Thin data → warm cold-start prompts.

## Architecture (Approach B — purely additive)

```
WEB (moment-to-care.tsx, existing carousel)
  │ alongside today's getLatestInsight + getTakeaways:
  ├─▶ GET /v1/connections/{relationshipId}/care-tips        ◀── NEW endpoint
  ▼
murror-api (NestJS) ──▶ enqueue/fetch CareTips for this pair
  ▼
viasr-api (FastAPI + Celery) ──▶ NEW care_tips generator task, source tiers:
  TIER 1  Your in-app data about them (your journals mentioning them, connection
          profile, birthday, how you met, your past reflections)
  TIER 2  Their in-app activity (privacy-gated, like commonInsight today)
  TIER 3  Their CONFIRMED public online content (NEW, guarded — see guardrails)
  else →  COLD-START seed (never empty)
```

Design pillars:

- **Privacy-first** — reuse the existing privacy gate `commonInsight` relies on. The AI
  synthesizes empathetic understanding ("Mai's had a heavy week"); it never leaks raw
  private journal text the connection has not consented to share.
- **Never empty** — generator always returns >= 1 tip.
- **Purely additive** — old `insights/latest` + `takeaways` pipeline is untouched. New card
  is flag-gated; if anything is off, the section behaves exactly like today.
- **No added latency** — the card renders immediately from in-app tips (tiers 1–2); the
  external scan runs async (Celery), is cached per connection, and refreshes periodically,
  enriching on a later load.

## External scanning guardrails

| # | Guardrail | Why |
| --- | --- | --- |
| 1 | **User confirms the identity** — AI proposes candidate public profiles; the user taps the right one (or "none"). We scan only after confirmation. | Eliminates wrong-person tips; adds a human consent/accountability layer. |
| 2 | **Public-only, via a compliant search/fetch layer** — public web pages & profiles only; no logging in, no auth-gated scraping. | Stays on the defensible side of platform ToS. |
| 3 | **No sensitive inference** — tips never surface or infer health, religion, politics, sexuality. Only benign signals (achievements, milestones, interests, public mood). | Legal + ethical floor. |
| 4 | **Transparent provenance** — any externally-sourced tip names its source ("from Mai's public Instagram") and is dismissible/reportable. | Honesty = trust; no "how did it know that?" dread. |
| 5 | **Production launch gated on aegis (legal) + shield (compliance) sign-off.** Build + test on staging behind a flag; do not flip on in production until cleared. | Matches "never touch prod carelessly"; health-adjacent brand risk. |

## API contract

```
GET /v1/connections/{relationshipId}/care-tips
{
  relationshipId, connectionName, generatedAt,
  dataRichness: "cold_start" | "in_app" | "enriched",   // drives subtle UI + analytics
  externalScan: {
    status: "awaiting_identity_confirmation" | "scanning" | "ready" | "no_match" | "skipped",
    candidates?: [{ id, label, sourceType, url, thumbnail }]   // shown only when confirming
  },
  tips: [{
    id,
    flavor: "remember" | "action" | "understand" | "question",
    text,                      // short, warm, the tip itself
    detail?,                   // optional supporting line
    source: "in_app" | "external" | "cold_start",
    provenance?: { label, url },   // present only when source === "external"
    isNew, dismissible
  }]
}
```

A companion endpoint confirms identity and triggers the scan, e.g.
`POST /v1/connections/{relationshipId}/care-tips/identity` with the chosen candidate id
(or "none"), which moves `externalScan.status` to `scanning` and enqueues the Celery task.

## Card UI

Reuse the existing per-person carousel card. Each card:

- **Header** — avatar + name + soft relationship context ("cared for 3 weeks · day 12") +
  carousel position dots.
- **Hero tip** — the single most timely/valuable tip, color-coded by flavor, with one
  tap-to-act CTA. CTA adapts to flavor: `action` → "Message", `question` → "Ask",
  `remember` → saved automatically, `understand` → "Got it".
- **Secondary tips** — 2 compact rows mixing the other flavors; each dismissible; `new`
  badge for fresh tips.
- **Provenance line** — externally-sourced tips always name their source.
- **Confirm prompt** — one-time identity step; until confirmed, the card works fully from
  in-app data (external is pure upside).
- **Flavor colors** — action = coral, remember = amber, understand = teal, question = blue;
  consistent everywhere.

## Cold start (never empty)

When data is thin, the generator returns warm getting-to-know-them tips:

- "You added Mai 3 weeks ago — what's one thing you appreciate about her?" (remember-seed)
- "Her birthday's in 9 days. Want to plan something?" (action-seed, from profile)
- "You haven't checked in with Mai lately — a quick hello?" (action-seed)

`dataRichness: "cold_start"` drives a subtle "Getting to know Mai…" hint so it reads as a
beginning, not a bug.

## Flags, error handling, testing

| Concern | Plan |
| --- | --- |
| Feature flag | `careTipsEnabled` (Statsig). Off → section behaves exactly like today. |
| Second flag | `careTipsExternalScan` — ship the in-app version first, scanning later post-legal. |
| Statsig gotcha | Statsig returns `False` for console-undefined gates; explicitly define both flags (cf. crisis-detection incident). |
| Graceful failure | If `/care-tips` errors or times out → card falls back to today's insight/takeaway cards. Never a broken state. |
| No added latency | Card renders from in-app tips immediately; external scan is async + cached. |
| Backend tests | Unit tests per source tier + cold start + privacy gate (watch the `str, Enum == .value` trap). |
| E2E tests | Real test accounts: one rich connection + one cold connection; assert >= 1 tip in both. |
| Web tests | Card render per flavor, fallback path, provenance display, identity-confirm flow. |

## Out of scope (YAGNI)

- A separate standalone "memory profile" page (the existing connection detail page can host
  a "see all" later; not required for v1).
- Modifying the existing two-sided insight/takeaway pipeline.
- Auth-gated scraping of any platform.

## Open items for the implementation plan

- Exact viasr prompt design for each of the four flavors + cold-start seeds (run through
  the compassion-review skill).
- The compliant search/fetch layer for tier 3 (provider choice, caching, refresh cadence,
  rate limits).
- Where identity-confirmation candidates are sourced and how "no_match" is remembered.
- Privacy-gate reuse details and a privacy-review checklist for aegis + shield.
