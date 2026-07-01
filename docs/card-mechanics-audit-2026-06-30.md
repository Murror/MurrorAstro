# Murror Card Mechanics Audit (2026-06-30)

Synthesis of three parallel audits: mobile rendering (iris), backend lifecycle (cortex), AI content (muse). Read-only. Goal: understand how every "card" works end to end, then optimize.

## 1. The mental model (how cards work)

- **One shell, two pipelines.** Every card renders through a single `React.memo` component, `MurrorMobile/src/screens/main/Diary/insight-card.tsx`, fed by ~40 props. Two separate code paths build nearly-identical card lists with different keys: the **Home "Moments to Care" rail** (`use-cross-connection-feed.ts` + `moment-to-care.tsx`) and the **connection-detail screen** (`relationship-detail-screen.tsx`, via the `detail-bundle` aggregator). There is **no cross-connection feed endpoint** server-side; cards are assembled per connection.
- **Three origins of card content:**
  - **AI-generated** (async): murror-api writes a `PENDING` row, ships a job to viasr over RabbitMQ, a response-handler writes the text back and flips to `COMPLETED`. (Connection insight, reflection card, takeaway insight, dive-deeper questions, the FOR US reflect question.)
  - **Templated / keyword-matched** (no LLM, $0): card **artwork** is chosen by keyword overlap from a manifest, not generated.
  - **User-created** (just a DB row): movie/song/place invites, challenges.
- **The daily limit** (raised 3→10 in #523) is enforced in exactly one place: `triggerInsightGeneration` (`connection-insight.service.ts:266`) via `countByConnectionAndDate` (counts all non-FAILED rows for `connectionId + dateKey`, where `dateKey` is **UTC**). **Only the ConnectionInsight path consumes it**; everything else is free downstream.

## 2. Card types

| Card | Origin | Trigger | Consumes limit |
|---|---|---|---|
| Connection Insight ("we noticed…") | AI | both users finish LOG/QUIZ (RabbitMQ) + app-open daily-suggestion + health-check | **YES** |
| FOR US Reflect question ("When do you feel most understood…") | AI (Sonnet, temp 1.3) | downstream of insight | no |
| Reflection Card (daily overview) | AI | downstream of insight; Redis 24h cache | no |
| Relationship/Individual Reflection (shared) | AI | after insight COMPLETED | no |
| Takeaway / Connection Reflection (reflect-back) | AI | user shares a takeaway | no |
| Moments-to-Care / CareTips | AI | on-demand GET per (connection, viewer), 24h cache | no |
| Movie / Song / Place invite | user | user taps suggest | no |
| Challenge, Suggested connection, Daily prompt | user/curated | various | no |
| Card artwork | templated | keyword overlap, $0 | n/a |

## 3. Lifecycle (canonical AI insight)

1. Both users finish the same task → RabbitMQ `BOTH_USERS_COMPLETED_TASK` → `insight-generation.event-handler.ts`.
2. `triggerInsightGeneration`: limit check → dedupe (FAILED delete+retry, PENDING/GENERATING skip, COMPLETED make-new) → create `PENDING` row.
3. Job → viasr → reply → `connection-insight-response-handler.service.ts`: write `content` jsonb, flip COMPLETED, invalidate reflection-card cache, WebSocket + push, trigger downstream relationship reflection.
4. Safety nets: `insight-health-check` (PENDING>10min/GENERATING>15min → FAILED every 5min; auto-fix missing every 30min), `stuck-task-completion-recovery` (every 10min).
5. Served via `GET /relationships/:id/detail-bundle` (replaced 13 calls; Wave 1 = 9 parallel fetches, Wave 2 = overview + dive-deeper).

## 4. Optimization backlog (ranked, merged)

### P0 — Safety / correctness
1. **`eval()` on raw LLM output** — `viasr new_relationship/service.py:259` runs `eval()` on a model-generated title string. Crash + code-exec risk. → `json.loads` + schema.
2. **Connection Insight has no meta-leak guard** — the flagship card has only Pydantic validation; the empty/meta-reply failure fixed on reflection-card (#537) + takeaway can surface here. → reuse `looks_like_meta()` + warm fallback.
3. **Meta-leak detector is English-only** (`reflection_card/safety.py`) — vi/ja meta-replies reach users. → add vi/ja phrase sets or guard pre-translation.
4. **#2A normal-path gap** — `connections.service.ts:182` still creates insights with `dayId=NULL`; the health-check then generates one redundant duplicate per QUIZ day (consumes a slot + tokens). → thread `pendingDay.id` into the normal call too.

### P1 — Cost / latency
5. **Dive-deeper makes 2 LLM calls**; the 2nd only swaps a name/pronoun that code already does via `.replace()`. → drop the 2nd call.
6. **Inverted model allocation** — flagship Connection Insight runs on **Haiku**, while the MCQ FOR US question runs on **Sonnet @ temp 1.3, 4096 tokens**. → rebalance.
7. **No response caching of card content** — stable per-pair-per-day inputs re-hit the LLM. → short-TTL Redis cache.
8. **UTC `dateKey` everywhere** — limit/dedupe/"reflected today" roll over at 7am Vietnam time. → one `dateKey(userTz)` helper.
9. **Home 5s poll refetches ALL takeaway queries**, not just the generating one. → per-query self-stopping `refetchInterval`.

### P2 — Structure / quality
10. **Two pipelines build the same cards** (feed + detail) → drift risk; extract one `buildConnectionCards()` helper.
11. **FOR US question prompt** self-describes as a "relationship coach" at temp 1.3 with glyph issues → rewrite to Murror voice (after evals).
12. **No eval coverage for any card prompt** → add fixtures before any tone rewrite (repo mandates evals).
13. Reflection-card rules live in the user turn (empty system prompt) → move to system + prompt-cache.
14. Orphaned mobile query hooks (dead code), `cardIdentityOverride` footgun, unbounded takeaway `findMany` + dual-language jsonb bloat.

## 5. Recommended first moves
The P0 safety items (especially `eval()` and the missing meta guards) are small, high-impact, and should go first. P1 #5 (drop redundant dive-deeper call) and #6 (model rebalance) are cheap cost wins. Tone work (#11) waits behind eval fixtures (#12).
