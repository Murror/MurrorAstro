# AI Chat Memory & Recall — Design

- **Date:** 2026-07-01 (PST)
- **Owner:** Astro (mobile + murror-api + viasr-api domain)
- **Status:** Approved (design). Next: implementation plan.
- **User-facing name:** "AI Chat" (code still says "Deep Chat" / `deep_chat`).

## Problem

When a user opens AI Chat, it does not recall context or memory from previous
chat sessions. It feels like a blank slate every time. A three-lens panel
(Muse/AI, Cortex/backend, Iris/mobile) found the failure exists independently on
all three layers — any one alone would break recall:

| Floor | Should do | Actually does | File |
|---|---|---|---|
| Mobile | Continue a past chat | Hard-resets to a **new conversation** every open; history is a read-only dead-end; no memory UI | `MurrorMobile/src/screens/main/Journal/add-log-screen.tsx:222,419,509` |
| Backend | Hand the AI stored memory | Retains rich per-session `summary`/`insights`/`learning` + a semantic `MemoryIndex`, but forwards the AI only `{message, user_id, conversation_id}` | `murror-api/src/deep-chat/infrastructure/adapters/viasr-client.adapter.ts:74-93` |
| AI service | Weave history into the reply | *Tries* to load EIM/wrapups but on a **200ms `asyncio.wait_for` timeout** the code says real SEA→US users blow every turn → silently empty. `/chat/text` path skips memory entirely. Journals/insights/reflections never injected. | `viasr-api/app/services/deep_chat_stream/application/use_cases/stream_chat.py:248-296`; `viasr-api/app/services/murror_chat/deep_conversation/deep_conversation.py:187,395` |

**Root cause of "slow, so disabled":** memory retrieval was attempted *inline on
the AI hot path* (cross-region DB + embedding search), which was slow, so it was
throttled/disabled ("6.3s saving" from skipping inter-chat retrieval; 200ms cap).

## Goals

1. In any AI Chat, the AI naturally reflects what the user has shared before
   (past chats + emotional patterns) — feels like it knows them.
2. The user can resume/continue a previous conversation instead of starting blank.
3. **No reply-speed regression** — p50/p95 time-to-first-word measured before vs.
   after is a ship gate.
4. No fabricated or "creepy" memory claims (emotional-safety gate).

## Non-goals (v1)

- Live semantic embedding search on the hot path (kept off in v1; cheap
  pre-stored summaries first).
- Web (murror-platform) AI Chat — Codex's domain; out of scope here.
- Rebuilding the memory system — this is wiring + surfacing of existing machinery.

## Architecture — the "pre-fetch spine"

The backend already sits next to the memory, so we move the fetch off the AI hot
path and hand memory to the AI ready-to-use:

```
User sends a message
  → murror-api: read ready-made "memory context" + save message   [in parallel]
  → murror-api → viasr: { message, user_id, conversation_id, MEMORY }
  → viasr: inject passed-in memory into the prompt (no inline lookup, no timeout)
  → stream reply (fast first token, personalized)
```

The timeout-prone retrieval inside viasr (`_build_emotional_context`,
`ContextAssembler.for_deep_chat`, `_get_relevent_interchat`) is **replaced** by
"use what the backend handed me." Existing summary/snapshot machinery is reused,
not rebuilt.

## Slice A — Deep memory (backend feeds the AI)

- **Before:** on send, murror-api gathers cheap, already-stored signals — the
  user's last ~3 `DeepChatConversation.summary` rows + latest EIM emotional
  snapshot. No embedding search on the hot path in v1.
- **During:** viasr injects them into the system prompt under an explicit "what
  you remember about this person" block, instructed to reference gently and
  **never invent** specifics.
- **After:** the existing post-chat wrap-up keeps writing new summaries/snapshots
  (`_background_post_chat`), so the next session's memory is ready. Memory
  compounds over time.
- **Touches:** murror-api + viasr-api. **No app release** → validates on staging first.

## Slice B — Continue last chat (mobile + one endpoint)

- **Before:** AI Chat entry can carry a `conversationId` — resume most-recent
  open thread, or "Continue" from a Diary entry. New backend read: "get my latest
  resumable conversation."
- **During:** thread opens pre-seeded with prior messages; a subtle "picking up
  where we left off" cue so recall is visible.
- **After:** finishing wraps/closes the session exactly as today; nothing existing
  changes. `conversationIdRef` reset behavior (Bug-1 fix) preserved for the
  new-chat case.
- **Touches:** MurrorMobile + one murror-api read endpoint. **Needs a TestFlight build.**

## Emotional-safety guardrails

- Guard empty/thin memory: brand-new users get **no** memory block (no
  "I remember when…").
- Validate AI output: no raw memory dumps, no invented specifics. (Hard product
  rule: validate user-facing AI text; worst failure mode is new users.)
- Heart to pressure-test the "remembering" copy before ship.

## Speed — defense + offense (standing directive: always optimize speed)

**Defense (no regression):**
- Read only pre-stored rows (ms, not cross-country seconds).
- Hard cap injected memory to a tight token budget (~3 summaries + 1 snapshot).
- Fetch memory once per session, cached; run in parallel with the message save.

**Offense (active wins):**
- Move work to idle time: optionally materialize a denormalized "memory card" when
  a chat *ends*, so chat-time is a single cheap row read. (Add only if measurement
  asks for it — YAGNI.)
- Cache the memory card per session so repeated turns cost nothing extra.
- Smaller, tighter prompts = faster first token + lower cost (free win from memory).
- Add lightweight timing logs to keep catching regressions/wins over time.

## Testing & measurement

- Measure p50/p95 time-to-first-word on a realistic SEA→US path, before vs. after.
  Regression = blocker.
- End-to-end recall: send → memory appears in context → reply references it
  appropriately.
- Safety pass: new-user / empty-memory / stale-memory cases.

## Sequencing (within one push)

1. Slice A (backend memory-card + viasr injection) lands & validates on staging
   first — no app build, early measurable win.
2. Slice B (mobile resume UI + endpoint) rides the next TestFlight.

## Key files (panel findings)

- Mobile: `MurrorMobile/src/screens/main/Journal/add-log-screen.tsx`;
  `use-create-conversation.ts`; `use-deep-chat-history.ts`;
  `conversation-history-screen.tsx`; `conversation-detail-screen.tsx`.
- Backend: `murror-api/src/deep-chat/application/use-cases/send-message.use-case.ts`;
  `.../infrastructure/adapters/viasr-client.adapter.ts`;
  `.../application/ports/ai-chat.port.ts`; `src/modules/memory/`;
  `prisma/schema.murror.prisma:1606-1694,2287-2331`.
- AI service: `viasr-api/app/services/murror_chat/deep_conversation/deep_conversation.py:80-136,187,357,395`;
  `viasr-api/app/services/deep_chat_stream/application/use_cases/stream_chat.py:248-296,978`;
  `viasr-api/app/services/emotional_memory/context_assembler.py:55`;
  `viasr-api/app/services/murror_chat/deep_conversation/retriever.py:37-97`.
