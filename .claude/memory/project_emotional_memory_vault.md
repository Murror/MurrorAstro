---
name: Emotional Memory Vault — 4-component design (Librarian + 3 toys)
description: Approved 2026-04-18; makes user FEEL Murror remembers everything they've shared. Replaces blind emotion-extraction on Bucket 2 AI-written paths.
type: project
originSessionId: 1da68e58-e6c5-44d5-8bc8-8bb394874dfb
---

On 2026-04-18 Astro approved the full 4-component Emotional Memory Vault design (all defaults locked). This replaces Bucket 2 blind emotion extraction on `services/deep_chat_stream` + `tasks/journal_analysis` with a retrieval-and-surfacing system.

**Design doc:** `/Users/astro/Projects/murror-transfer/Murror/docs/plans/2026-04-18-emotional-memory-vault-design.md` (NOT yet committed — Astro to commit when ready).

**Four components:**
1. **Memory Librarian** (baseplate) — `memory_index` table w/ pgvector embeddings (OpenAI text-embedding-3-small, $0.10/mo). Scoring = 55% cosine + 20% peak_intensity + 15% recency decay – 10% repetition penalty. API: `POST /internal/v1/memories/retrieve`. Backfill via one-shot Celery task.
2. **AI Callbacks (Toy 1)** — inject 2–3 retrieved memories into `deep_chat_stream` + `journal_analysis` system prompts. Uses existing `emotional_memory/context_assembler.py`. Locked: NO specific dates ("a few weeks ago" only). "Forget me" v1 = Settings page only, no intent classifier yet. Crisis + deleted + <24h filters in WHERE clause.
3. **Memory Room (Toy 2)** — stack-pushed screen from Diary tab (tab bar full at 5). Castle map: 12 months as glowing rooms → tap → calendar heatmap → memory cards. Soft-delete only (room dims). Includes summary widget + connection-tagged entries (user's own view).
4. **Callback Pings (Toy 3)** — hourly Celery scheduler, 1 ping/user every 10–14 days. Reuses `emotional_memory` queue (NO new queue — stale-consumer rule). `memory_callback_log` table for idempotency. OneSignal w/ per-env app_id + `recipients:0` as FAILURE. Locked: first-ever ping = joy memory, win-back for 30+ day inactive = YES with soft copy, connection memories = YES.

**Locked decisions (all Astro-approved):**
- No date references in AI callbacks
- "Manage Memories" Settings page for forget-me (classifier deferred to v2)
- Include connection-tagged memories in callbacks
- Soft template set for quiet-user win-back
- First callback is always joy/positive
- Soft-delete deletion model

**Build order + dependencies:**
1. Librarian (3d) → 2. AI Callbacks (2d, depends on 1) → 3. Memory Room (4d, depends on 1) → 4. Pings (3d, depends on 1+3). Total ~12 days.

**Shipping status (staging):**
- Phase 1 Librarian: ✅ schema + retrieval shipped (PR #328)
- Phase 2 Memory Surfaced Events: ✅ telemetry table (part of PR #329 squash)
- Phase 3 Memory Room read API (Tasks 3-1..3-4): ✅ shipped + verified end-to-end on real Supabase auth 2026-04-19 (PR #329 + #330). All 3 endpoints return correct data; /index=`[{202604,hopeful},{202603,sad}]`, /month and /summary both 200.
- Phase 3 Tasks 3-10/11/12 (mobile MemoryRoomScreen + navigation + deep link + i18n + Ship Gate): pending — needs Astro approval before UI work.
- Phase 2 callback injection into deep_chat_stream + journal_analysis: pending.
- Phase 4 Callback Pings scheduler: pending.

**Blockers to flag:**
- Toy 1 prod launch requires resolving `incident_crisis_detection_gap.md` first (can ship to staging without fix).
- Crisis exclusion is double-gated (selection + send time re-classification); non-negotiable safety.

**How to apply:** When Astro or agents resume this work, open the design doc first. When implementing, use `writing-plans` skill to produce the detailed per-task build plan. Don't re-brainstorm — all decisions are locked. If something needs to change, update this memory and the design doc together.

**Success metrics (post-ship):**
- LLM reference rate (% AI replies citing past memory)
- Memory Room DAU/MAU
- Callback ping open rate (target ≥ 25%)
- 7-day retention delta (A/B exposed vs unexposed)
- "Creepy" thumbs-down rate (target < 2%)
