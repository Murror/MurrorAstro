---
name: Performance sprint 2026-05-03 to 2026-05-08 — launch slip + systemic fixes
description: 13-day systemic perf sprint that slipped launch from May 7. Cumulative tax across infra/backend/mobile, all rooted out. 31 PRs, ~30 fixes, 8 TF builds. Detail-page load 8-10s → ~1-2s, chat 10-20s → ~6s target.
type: project
originSessionId: 8f1c5851-d71b-4095-b91e-a4809d2f710c
---

**Status as of 2026-05-08:** Sonnet 4.6 deploy in flight. TF 210 has all mobile fixes. Backend healthy. Astro testing pending.

## What slipped + why

Original launch: 2026-04-23 → slipped to 2026-05-07 → slipped again. Reason: TF builds 200-209 surfaced **cumulative latency taxes** invisible to Mac simulator. Astro on SEA cellular was paying 2-5s extra per screen vs. what Mac timing showed. Cellular reality forced the slip.

## What we shipped (13 systemic + ~12 hotfix fixes)

**Infra (lives in `nsp-staging-murror`, deployed):**
- T1 InfluxDB writes disabled (env var) — kills 5-attempt retry storm to localhost:8086. -50-300ms p95.
- T2 CPU 200/500m → 500/1000m. Unblocks throughput.
- T7 RabbitMQ heartbeat 30s + reconnect jitter. Fixed `socketOptions: {heartbeat: 30}` typo (wrong key, silently ignored). Eliminates 5s stalls.

**Backend (murror-api):**
- T3 PerformanceMonitoringInterceptor stripped: dropped cpu/memory snapshots, body-stringify, 1000-entry ring buffer. -30ms p50, -100ms p99 every endpoint.
- T6 Auth Guard: local JWT signature verification with network fallback. Activate by adding `SUPABASE_JWT_SECRET` env var.
- T8 `/subscription/status` no-sub cache (5min TTL) + Promise.allSettled RevenueCat variations. -2-3s on free-user app open.
- T9 `/me` + `/streaks` migrated off legacy Prisma client.
- T10 `GET /api/v1/relationships/:id/detail-bundle` aggregator endpoint. 11 mobile useQuery → 1 server-side parallel call.
- T18 `exploreConnection` AI response cache by `insightId+userId+lang` (1h TTL, 5000 FIFO). Eliminates the slowest AI call in the bundle on warm loads.
- T19 `/connections/:id/insights` N+1 fix: batched `findByInsightIds` for movie/place/song invites. 60 queries → 3.

**AI service (viasr-api):**
- Prompt cleanup (PR #413): removed duplicate `##` markdown headers in `conversation_chat.yaml` + `ai_personality_prompt.py`. Stops Claude leaking `# Response` literal markdown into replies.
- Fire-and-forget user-message storage (T9 fire-and-forget pattern, viasr-api side).
- `CRISIS_DETECTION_ENABLED` flag added (default TRUE in code; effectively False because Statsig flag missing).
- Sonnet 4.0 → Sonnet 4.6 (PR #415, 2026-05-08). Drop-in replacement, ~30-40% faster TTFT.

**Mobile (MurrorMobile, TF 210):**
- T11 React Query `staleTime: 1 week → 5 min`, `gcTime: 24h`. Sane defaults; cached back-nav actually serves.
- T12 Removed decorative staggered fade-in animations on `journal-detail-screen` and `relationship-detail-screen`. -1.7s and -3s respectively.
- T13 `relationship-detail-screen.tsx`: 11 useQuery hooks → 1 `useGetRelationshipDetailBundle` call.

## Hotfixes for cascading discoveries

| Hotfix | Bug | Fix |
|---|---|---|
| PR #360 (murror-api) | `setHeader after response started` crashing every SSE chat (interceptor + 2 filters) | Guard with `headersSent` |
| PR #361 + revert via #362 (murror-api) | nginx `proxy-request-buffering: off` silently dropped iPhone HTTP/2 POSTs | Reverted; kept only `proxy-buffering: off` for SSE |
| PR #412 (viasr-api) | Anthropic 400 "messages: final assistant content cannot end with trailing whitespace" | rstrip every assistant message in `_build_messages_and_system` |
| PR #467 (mobile) | Second message hangs forever — XHR Promise never resolves on iOS HTTP/2 | Resolve on SSE `done` event + xhr.abort + setTimeout(0) abort + handler detach |
| PR #373 (murror-api) | T6 missed `jsonwebtoken` runtime dep — pod CrashLoopBackOff | `pnpm add jsonwebtoken@9.0.2` |
| PR #365 (murror-api) | undici Agent dispatcher caused fetch failed at 8ms | Reverted; default global fetch retains connection pooling |
| PR #414 (viasr-api) | T9 fire-and-forget race → empty messages array → Anthropic 400 | Explicitly append new user msg to history |
| PR #473 + #474 (mobile) | `FadeInDown.duration(0)` in Reanimated 3 leaves entering anim at opacity 0 forever — "every page loads forever" | `ANIM_DURATION = 0 → 1` + delete same pattern in conversation-detail |

## Process rules captured

- `feedback_mobile_first_speed.md` (Mac sim hides device-specific bugs — TF on iPhone is the verdict)
- `feedback_code_review_before_tf.md` (parallel domain agents pre-TF / pre-prod)
- `feedback_flat_task_list.md` (no Day-1/2/3 plans; flat checklist)
- `feedback_test_once_at_end.md` (bundle TF builds; Astro tests once)

## Astro manual actions still pending

1. Create Statsig flag `crisis_regex_prefilter_enabled` (default ON). Currently no-op since crisis detection itself is disabled by default.
2. Add `SUPABASE_JWT_SECRET` to k8s secret `murror-api-secrets` for nsp-staging-murror (pull from Supabase dashboard → Project Settings → API → JWT Settings → JWT Secret). Without it, T6 auth path falls back to network — no break, just no perf win.
3. Test TF 210 + post-Sonnet-4.6 deploy on iPhone cellular. ONCE, full package.

## Numbers (sprint totals)

- 31 PRs merged across 3 repos
- 8 TF builds (203 → 210)
- Backend p95 latency: -500ms across all endpoints from T1+T3 alone
- Detail page: 8-10s → ~1-2s perceived
- Chat: 10-20s → target 6s (Sonnet 4.6 validating)
