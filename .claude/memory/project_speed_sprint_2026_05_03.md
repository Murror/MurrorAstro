---
name: Speed Sprint 2026-05-03 — launch slipped to ship sub-7s chat for SEA users
description: 4-day speed sprint Mon-Thu replacing planned 2026-05-03 launch. Cloudflare + image cache + mobile SSE streaming. Targets <7s end-to-end chat on SEA cellular.
type: project
originSessionId: 8f1c5851-d71b-4095-b91e-a4809d2f710c
---
**Status as of 2026-05-03 13:05 PT:** Launch slipped from today to Thursday 2026-05-07 to fix speed before shipping.

## Why slipped
Astro tested chat on TF build 202 from his iPhone (SEA, cellular). Chat reply took **>15 seconds**. My Mac WiFi probes showed 4s — the 11s gap is mobile-cellular + cold-connection + asset-load overhead. Server-side timeout tuning (PR #410 saved 600ms) is not enough. Astro: "we cannot ship with this condition."

## Sprint plan (Mon 2026-05-04 → Thu 2026-05-07)

### Mon — Cloudflare in front + image cache override
- Astro creates Cloudflare account + adds `murror.app` zone (only step Astro must do)
- I migrate NS records (NS1 → Cloudflare) — DNS hosting only, all existing records (Squarespace, Google MX, OneSignal/Mailgun SPF) carry over via import
- Proxy `staging.api.murror.app` first (orange-cloud, SSL Full Strict)
- Cloudflare Page Rule on Supabase artwork bucket: override `Cache-Control: public, max-age=86400, immutable` so the no-cache override Supabase sends gets ignored at the edge
- Verify staging from Astro's iPhone — expected: detail page load **15s → <2s**, chat from cellular **15s → ~7s**
- If staging clean, flip prod (`api.murror.app`) same pattern

### Tue — Argo Smart Routing + tune
- Enable Argo ($5/mo per zone) on both staging + prod
- Tune cache rules per endpoint
- Long-tail probes from multiple regions

### Wed — Mobile SSE streaming proxy
- NestJS `deep-chat.controller.ts` `createConversation` currently aggregates the full LLM stream THEN returns one JSON. User waits in silence the whole time.
- Refactor to proxy SSE through to mobile: NestJS receives chunks from viasr-api, forwards each chunk down to mobile as it arrives
- MurrorMobile updates `journal-api-client.ts` to consume SSE (use `react-native-sse` or fetch-event-source pattern; verify which lib is RN-compatible)
- Result: user sees first token in ~1.5s instead of waiting 5-10s for full reply
- Files involved:
  - `murror-api/src/deep-chat/presentation/controllers/deep-chat.controller.ts` (the aggregator at lines 119-138)
  - `murror-api/src/deep-chat/infrastructure/.../ai-chat-port.ts` (the streamResponse iterator)
  - `MurrorMobile/src/apis/client/journal-api-client.ts:321-343` (generateConversation method)
  - `MurrorMobile/src/screens/main/Journal/add-log-screen.tsx:881-940` (onSubmitUserInput, currently awaits full result)

### Thu — E2E retest + ship decision
- New TF build with mobile SSE changes (build 203+)
- Astro tests from iPhone on cellular AND WiFi
- Pass criteria: chat reply ≤7s end-to-end on cellular, ≤4s on WiFi
- If pass: flip promotion PRs #352 + #397 ready, admin-merge, fire prod Deploy, 2h monitor
- If fail: investigate further; may need Claude Haiku for short replies, or speculative streaming

## Read-only prep done today (2026-05-03)
- Confirmed prod `api.murror.app` resolves to Microsoft Azure (`20.46.249.55`) — possibly already on Azure Front Door; will verify Monday before adding Cloudflare
- Confirmed staging `staging.api.murror.app` = DOKS SFO2 (`159.89.222.109`), no edge layer
- Confirmed `murror.app` DNS hosted on NS1 (`*.nsone.net`)
- Confirmed Supabase storage already on Cloudflare with Singapore POP (`cf-ray: ...-SIN`) BUT response sends `Cache-Control: no-cache` so every fetch revalidates — **the artwork-bucket cache override is the single biggest detail-page win**
- Mobile `generateConversation` is single POST, no retries, 60s timeout — confirms mobile-side is not making redundant calls

## Speed math (predicted vs measured)
| Component | Today (SEA cellular) | After sprint |
|---|---|---|
| First-byte (API) | ~4-6s | ~2-3s (Cloudflare) |
| Full chat reply | 15-20s perceived | ~7s perceived (SSE streaming) |
| Detail page | 15s+ | <2s (image cache override) |

## Cost of sprint (3-4 days)
- 1 person-day infra (Cloudflare) — Claude
- 1-2 person-days mobile SSE (Claude)
- 30 min Astro setup (Cloudflare account)
- ~$30/mo new Cloudflare Pro + Argo

## How to apply (this memory)
- Resume Monday morning: Astro confirms Cloudflare account ready
- Reference `please-tell-me-which-expressive-prism.md` plan for full launch state
- Check this file before starting any sprint task to confirm we're still on track
- Mark sprint days completed in todos as work lands
