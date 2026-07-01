# AI Chat Memory & Recall — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make AI Chat feel like it remembers the user — inject their stored memory into every chat (deep memory) and let them resume a previous conversation (continuity) — without slowing replies.

**Architecture:** "Pre-fetch spine." murror-api reads cheap, already-stored memory (last ~3 chat summaries + top salient memories) and hands it to viasr *in the request*, so viasr injects it into the system prompt and **skips** the timeout-prone inline retrieval that was silently failing for SEA→US users. Slice A (deep memory) is backend+AI only (no app release). Slice B (resume) adds a mobile UI over an already-built backend read.

**Tech Stack:** NestJS/Prisma (murror-api, jest), FastAPI/Python (viasr-api, pytest+poetry), React Native (MurrorMobile, jest).

**Design doc:** `docs/plans/2026-07-01-ai-chat-memory-recall-design.md`

---

## Cross-cutting decisions (read first)

### Two pinned contracts

1. **`memory_context` is a pre-rendered PROSE STRING, not JSON.** murror-api renders its `MemoryContext` object into a short, capped, human-readable string (e.g. `"Recent themes across your last chats: work stress, sister's visit. Emotional arc: trending calmer."`) and sends that as the `memory_context` form field. viasr injects it **verbatim**. Both sides cap: backend trims to ~3 summaries; viasr enforces a hard `MAX_MEMORY_CONTEXT_CHARS = 2000` defense-in-depth. → This changes Cortex **Task 3**: send `memoryContext.toPromptString()` (a string), NOT `JSON.stringify(...)`.
2. **`latest-resumable` returns lightweight metadata.** `GET /api/v1/deep-chat/conversations/latest-resumable` → `{ conversationId, title, updatedAt, messageCount } | null`. The app fetches the actual messages via the **existing** `useDeepChatHistory({ conversationId })`. → murror-api **Task 6** returns this shape (not full messages).

### Branch strategy (per-repo, PRs target staging)
- **murror-api:** cut `feat/ai-chat-memory-recall` from `origin/staging`. First confirm `feat/referenced-memory-passthrough` (`ReferencedMemory`, `MemoryIndexRepository`) and `chore/connection-repair-dryrun` (`findLatestResumable`) are merged into `staging`; if not, base on them — **do not re-implement** (continue, never rebuild).
- **viasr-api:** cut `feat/chat-memory-injection` from `staging`.
- **MurrorMobile:** cut `feature/ai-chat-resume-conversation` from `staging-environment-setup`.

### Sequencing (within one push)
1. **murror-api Slice A** (Tasks 1-5) → deploy to staging. Producer of `memory_context`.
2. **viasr-api Slice A** (Tasks A1-A5) → deploy to staging. Consumer. Additive, so it can land in parallel; **recall works end-to-end only once both ship.**
3. **murror-api Task 6** (latest-resumable read) → unblocks mobile.
4. **MurrorMobile Slice B** (Tasks 1-6) → next TestFlight.

### Ship gates (hard)
- ⚡ **Speed:** measure p50/p95 time-to-first-word on a realistic SEA→US path, before vs. after. Regression = blocker. (viasr Task A2 adds a skip-path log to confirm the slow path is bypassed.)
- 🚨 **Safety:** run `compassion-review` on the new prompt block; Heart pressure-tests the "remembering" copy + the two mobile strings. No invented specifics, no "I remember when…" for empty-memory users.
- ✅ **DI:** murror-api `pnpm build` must pass (NestJS DI errors crash the whole app). viasr `poetry run python -m evals.runner` mandatory after the prompt change.

---

## murror-api (backend)

### Worktree-continuation finding
`murror-api-memrepair` (`chore/connection-repair-dryrun`) already implements `IConversationRepository.findLatestResumable()` (served at `GET /deep-chat/current-draft/messages` via `GetCurrentDraftMessagesUseCase`) — this IS Slice B's read. `murror-api-referenced-memory` (`feat/referenced-memory-passthrough`) already added the `ReferencedMemory` port, the `onReferencedMemory` SSE side-channel in `viasr-client.adapter.ts`, and `MemoryIndexRepository` (`src/modules/memory/`). **Verdict: CONTINUE.** Slice A layers a `memoryContext` producer onto the existing adapter; Slice B is a thin alias over `findLatestResumable`.

**Test harness:** unit `pnpm test` (jest, hand-mocked `jest.Mocked<IPort>` — see `send-message.use-case.spec.ts`), `pnpm type-check`, `pnpm build` (DI gate), `pnpm format && pnpm lint`.

### Task 0 — Branch + rebase on prior worktrees (no test)
Confirm the two prior branches are in `staging`; cut `feat/ai-chat-memory-recall` from `origin/staging` (or base on them). Verify: `grep -q findLatestResumable src/deep-chat/domain/repositories/conversation.repository.ts && echo OK`. No commit.

### Task 1 — MemoryContext type + port (contract first)
- **Create** `src/deep-chat/application/ports/memory-context.port.ts`:
  ```ts
  export interface PastChatMemory { summary: string; insights: string[]; emotionJourney: string | null; }
  export interface MemoryContext {
    recentChats: PastChatMemory[];
    salientMemories: string[];
    isEmpty: boolean;
    toPromptString(): string;   // renders the capped PROSE string sent to viasr (Contract #1)
  }
  export abstract class IMemoryContextPort {
    abstract getForSession(userId: string): Promise<MemoryContext>;
  }
  export function isMemoryContextEmpty(ctx: MemoryContext): boolean { return ctx.isEmpty; }
  ```
- **Test first** `memory-context.port.spec.ts`: empty context is valid & `isMemoryContextEmpty` → true; `toPromptString()` of empty → `''`.
- Run `pnpm test memory-context.port` (RED→GREEN). **Commit:** `feat(deep-chat): add MemoryContext type + IMemoryContextPort contract`

### Task 2 — PrismaMemoryContextRepository (cheap pre-stored reads, size-capped)
- **Create** `src/deep-chat/infrastructure/adapters/prisma-memory-context.repository.ts` implementing `IMemoryContextPort`:
  - last **3** `DeepChatConversation` where `{ userId, deletedAt:null, status:'COMPLETED', summary:{not:null} }`, `orderBy createdAt desc, take 3`, select `summary, insights, emotionJourneyText` (uses `idx_deep_chat_user_deleted_created`).
  - optional top **2** `MemoryIndex` by `salience desc` (add `findTopSalient(userId, limit)` to `MemoryIndexRepository` if absent — thin `findMany`).
  - **`toPromptString()`** renders a compact prose string; **size cap:** each summary ≤ ~280 chars, ≤2 insights each, total serialized `< MAX_MEMORY_BYTES`; `isEmpty:true` when no rows → `toPromptString()===''`.
- **Test first** `prisma-memory-context.repository.spec.ts` (mock `PrismaService` + `MemoryIndexRepository`): empty user → `isEmpty:true`; 3 rows → `recentChats.length===3` newest-first; **size-cap** (5000-char summary + 10 insights → capped) asserting `toPromptString().length` bounded.
- Run `pnpm test prisma-memory-context`. **Commit:** `feat(deep-chat): read cheap pre-stored memory context (3 summaries + salience, capped)`

### Task 3 — Thread memoryContext through port + adapter (zero-regression when null)
- **Modify** `src/deep-chat/application/ports/ai-chat.port.ts` (`streamResponse`, ~lines 78-88): append trailing optional `memoryContext?: MemoryContext | null` (last position → existing positional callers unchanged).
- **Modify** `src/deep-chat/infrastructure/adapters/viasr-client.adapter.ts` (body block ~74-93): after `active_prompt`, `if (memoryContext && !memoryContext.isEmpty) body.set('memory_context', memoryContext.toPromptString())` — **the rendered STRING (Contract #1)**, not JSON. When null/empty the body is byte-identical to today.
- **Test first** `viasr-client.adapter.spec.ts` (mock global `fetch`): null memory → body has **no** `memory_context` key (byte-identical); populated → body `memory_context` equals the prose string.
- Run `pnpm test viasr-client.adapter` then `pnpm type-check`. **Commit:** `feat(deep-chat): forward capped memory_context string to viasr (byte-identical when empty)`

### Task 4 — Wire fetch into send path, in PARALLEL with the message save
- **Modify** `src/deep-chat/application/use-cases/send-message.use-case.ts`: inject `IMemoryContextPort`; start `const memoryPromise = this.memoryContextPort.getForSession(userId).catch(() => emptyContext)` **before** the save; `await Promise.all([messageRepository.save(userMessage), memoryPromise])`; pass resolved context as the trailing `streamResponse` arg.
- **Test first** `send-message.use-case.spec.ts`: (a) **parallel** — `save` called before the deferred memory promise resolves; (b) **empty user** — `isEmpty:true` reaches `streamResponse`; (c) **fetch failure non-fatal** — rejection → send still streams + returns normal result.
- Run `pnpm test send-message.use-case`. **Commit:** `feat(deep-chat): assemble memory context in parallel with message save`

### Task 5 — DI wiring (verify app boots)
- **Modify** `src/deep-chat/deep-chat.module.ts` (providers ~85-106): bind `{ provide: IMemoryContextPort, useClass: PrismaMemoryContextRepository }`; `imports:[..., MemoryModule]`.
- **Test first** `deep-chat.module.memory-context.di.spec.ts` (mirror `deep-chat-analysis.di.spec.ts`): boot `Test.createTestingModule`, assert `IMemoryContextPort` + `SendMessageUseCase` resolve.
- Run `pnpm test memory-context.di` then **`pnpm build`** (DI gate). **Commit:** `chore(deep-chat): wire IMemoryContextPort + import MemoryModule`

### Task 6 — Slice B: latest-resumable read (thin, lightweight shape per Contract #2)
- **Create** `src/deep-chat/application/use-cases/get-latest-resumable.use-case.ts`: calls existing `conversationRepository.findLatestResumable(userId)`; returns `{ conversationId, title, updatedAt, messageCount } | null` (**metadata only** — messages fetched by the app via the existing history endpoint).
- **Modify** `src/deep-chat/presentation/controllers/deep-chat.controller.ts` (after `current-draft/messages`, ~line 287): `@Get('conversations/latest-resumable')`, existing JWT guard.
- **Test first** `get-latest-resumable.use-case.spec.ts`: resumable exists → its metadata; none → `null`.
- Run `pnpm test get-latest-resumable`. **Commit:** `feat(deep-chat): expose latest-resumable conversation metadata for mobile resume`

**Coverage checklist:** empty-memory user (T2/T4), size-cap (T2), parallel-fetch non-blocking (T4), fetch failure non-fatal (T4), byte-identical when empty (T3), latest-resumable null-safe (T6).

---

## viasr-api (AI service)

**Branch:** `feat/chat-memory-injection` off `staging`. **Scope:** Slice A — accept the pre-assembled `memory_context` STRING, inject it, short-circuit the timeout retrieval. Mirrors the shipped `active_prompt` pattern exactly.

**Test harness:** `pyproject.toml` → `asyncio_mode="auto"`, `testpaths=["tests"]`. Run `poetry run pytest <file> -q`. Mirror `tests/services/deep_chat_stream/test_stream_chat_active_prompt.py` (DB-free: patches `aread_prompt_cached`, `context_assembler.for_deep_chat`/`with_memories`, `_memory_recall_enabled`). After any prompt change: `poetry run python -m evals.runner` + `compassion-review` skill (mandatory).

**Fixed names:** route field `memory_context: str | None = Form(default=None)`; kwarg `memory_context: Optional[str] = None`; prompt marker `WHAT YOU REMEMBER ABOUT THIS PERSON`; cap `MAX_MEMORY_CONTEXT_CHARS = 2000`.

### Task A1 — Inject the memory block in `_get_system_prompt` (core)
- **Modify** `app/services/deep_chat_stream/application/use_cases/stream_chat.py`: add `MAX_MEMORY_CONTEXT_CHARS = 2000` (~line 68); add `memory_context: Optional[str] = None` to `_get_system_prompt` (~175-184); inject after the `active_prompt` block (~after 374):
  ```python
  if memory_context and memory_context.strip():
      safe_mem = memory_context.strip()[: self.MAX_MEMORY_CONTEXT_CHARS]
      safe_mem = safe_mem.replace("{", "{{").replace("}", "}}")
      system_prompt += (
          "\n\nWHAT YOU REMEMBER ABOUT THIS PERSON:\n"
          "Here is what you already know from your past conversations with them:\n"
          f"{safe_mem}\n"
          "Let this quietly shape how you understand and greet them, so it feels "
          "like you know them. Reference it gently and only when it fits naturally. "
          "Use ONLY what is written above. Never invent specifics, dates, names, or "
          "events that are not here, and never list back everything you remember or "
          "announce that you remember. If this is thin or empty, simply be present "
          "with what they say now."
      )
  ```
- **Test first** `tests/services/deep_chat_stream/test_stream_chat_memory_context.py` (mirror active_prompt): injected-when-present (marker + content + `"never invent"`); **no block when None**; **no block when blank** (`"   "`); **hard size cap** (`"x"*10000` → `count("x") <= MAX`); **byte-identical** (omit param == None).
- Run `poetry run pytest tests/services/deep_chat_stream/test_stream_chat_memory_context.py -q`. **Commit:** `feat(stream-chat): inject passed-in memory_context into chat system prompt`

### Task A2 — Short-circuit the timeout retrieval when memory present (the speed fix)
- **Modify** same file (~lines 259-299): guard the inline-retrieval branch — `if user_id and not (memory_context and memory_context.strip()):` around the `for_deep_chat` (262) + `with_memories` (287) block; `else:` logs `"[STREAM_CHAT] using passed-in memory_context; skipping inline retrieval for %s"`.
- **Test first** (same file, `-k inline_retrieval`): assemblers `assert_not_awaited()` when memory present (and `"SLOW_CTX"` absent, marker present); assemblers `assert_awaited()` when memory absent (zero regression for existing users).
- Run `poetry run pytest ... -k inline_retrieval -q`. **Commit:** `perf(stream-chat): skip inline emotional-context retrieval when memory_context supplied`

### Task A3 — Thread from `execute()` into `_get_system_prompt`
- **Modify** `execute()` (~line 774): add `memory_context: Optional[str] = None` + docstring; pass `memory_context=memory_context` into `_get_system_prompt(...)` (~988-997).
- **Test first** (`-k execute_forwards`): patch `_get_system_prompt`, assert it receives the kwarg.
- **Commit:** `feat(stream-chat): forward memory_context from execute() to system prompt`

### Task A4 — Accept `memory_context` on the `/chat/stream` route
- **Modify** `app/api/controller/chat/route.py` `stream_chat` handler (~200-210): add `memory_context: str | None = Form(default=None)` (after `active_prompt`); pass into `execute(...)` (~252-261); mirror the `active_prompt` comment. (Confirm with Cortex that murror-api hits `/chat/stream`; `/chat/text` v1 parity is a follow-up.)
- **Test first** `tests/api/test_chat_stream_memory_context.py` (FastAPI TestClient, reuse existing auth-override fixture; fallback = direct handler unit test): posting `memory_context` → `execute` receives it; omitting → `execute` receives `None`.
- **Commit:** `feat(chat-route): accept optional memory_context on /chat/stream`

### Task A5 — Verification gate (no code change)
`poetry run ruff check . --fix`; `poetry run pytest tests/services/deep_chat_stream/ tests/api/ -q` (no regression in `test_stream_chat_active_prompt.py`); `poetry run pytest -q`; **`poetry run python -m evals.runner`** (spot-check a new-user/empty-memory transcript); run **`compassion-review`** on the new block + hand a sample prompt+output to **Heart**. Confirm with Cortex the form field name is exactly `memory_context`.

**Out of scope (separate PRs, confirm with lead):** removing dead `_get_relevent_interchat` (`deep_conversation.py:271`); `/chat/text` v1 parity; editing `conversation_chat.yaml` (block lives in Python like `active_prompt`, so the yaml is untouched).

---

## MurrorMobile (app)

**Branch:** `feature/ai-chat-resume-conversation` off `staging-environment-setup`. **Test harness:** Jest, colocated `.spec.ts(x)`; hooks use `renderHook` + `makeQueryWrapper` from `src/queries/__test-utils__/query-test-env`. Default `yarn jest` hangs — always `yarn jest <path> --runInBand --forceExit --testTimeout=15000`.

**Guardrails:** Bug-1 reset (`conversationIdRef.current=''`, add-log-screen.tsx:419) stays; resume is **opt-in via the new `conversationId` param only**. `MUText` variants, `MUColors`, name "AI Chat"/"Connection Reflection", no em-dashes. i18n keys in `en/vi/ja` (`yarn i18n-check`).

### Task 1 — API client `getLatestResumableConversation` (blocked on murror-api Task 6)
- **Modify** `src/types/api/journal.ts` (~after 254): `LatestResumableConversation { conversationId; title; updatedAt; messageCount }` + `LatestResumableConversationResponse = ApiResponse<LatestResumableConversation | null>`. **Modify** `src/apis/client/journal-api-client.ts`: `getLatestResumableConversation()` mirroring `getDeepChatDetail` (`this.get(path, {}, meta, true)`).
- **Test first** `journal-api-client.latest-resumable.spec.ts`: GETs `/api/v1/deep-chat/conversations/latest-resumable` with `isNewBE=true`; `data:null → null`.
- **Commit:** `feat(journal-api): add getLatestResumableConversation client read`

### Task 2 — Pure seed helper `MessageHistoryItem[] → Messages[]`
- **Create** `src/screens/main/Journal/seed-messages.ts` (`seedMessagesFromHistory(items, opts?)`) extracting the inline mapping at add-log-screen.tsx:517-524.
- **Test first** `seed-messages.spec.ts`: maps order+source; `[]`/`undefined` → `[]` (new-chat safety); `liftLeadingAiAsSuggestion` lifts a leading `openai` message.
- **Commit:** `refactor(journal): extract pure seedMessagesFromHistory helper`

### Task 3 — `conversationId` param plumbing + seed-on-open (core of Slice B)
- **Modify** `src/common/navigation.tsx:47` (`conversationId?: string; resumeSource?: 'recent'|'diary'` on `AddLogScreen` params). **Modify** `src/screens/main/Journal/add-log-screen.tsx`: read `params?.conversationId`; add to `getParamsKey` (:391); after the Bug-1 reset (:417) `if (resumeConversationId) conversationIdRef.current = resumeConversationId`; add `useDeepChatHistory({ conversationId: resumeConversationId||'', enabled:!!resumeConversationId })` + a seed effect calling `seedMessagesFromHistory`. Extract pure `resolveInitialConversationId(params, draft)` + `shouldShowResumeCue(params)`.
- **Test first** `resume-utils.spec.ts`: no id + no draft → `''` (Bug-1); explicit id wins; `journalPrompt` entry with stale draft still `''`; `shouldShowResumeCue({conversationId}) → true`, `({}) → false`.
- Run the spec then `yarn tsc --noEmit`. **Commit:** `feat(ai-chat): seed AddLogScreen from conversationId, preserve new-chat reset`

### Task 4 — `useLatestResumableConversation` hook
- **Create** `src/queries/journal/use-latest-resumable-conversation.ts` (mirror `use-deep-chat-detail.ts`; `staleTime: STALE_TIME.SHORT`, key `LATEST_RESUMABLE_CONVERSATION_KEY`).
- **Test first** `use-latest-resumable-conversation.spec.tsx` (mirror `use-memory-summary.spec.tsx`): success returns data; `enabled:false` → no call; stable key.
- **Commit:** `feat(journal): add useLatestResumableConversation query hook`

### Task 5 — "Continue this chat" affordance in conversation-detail
- **Modify** `src/screens/main/Diary/conversation-detail-screen.tsx` (~421/454): `<MUButton>` "Continue this chat" → `present('AddLogScreen', buildContinueChatParams(conversationId))`. Add i18n `aiChat.continueChat` (en/vi/ja). Extract pure `buildContinueChatParams(id) → { conversationId:id, resumeSource:'diary' }`.
- **Test first** `conversation-detail-continue.spec.ts`: `buildContinueChatParams('c42')` shape. Then `yarn i18n-check`.
- **Commit:** `feat(diary): add Continue this chat affordance to conversation detail`

### Task 6 — "Picking up where we left off" resume cue
- **Create** `src/screens/main/Journal/resume-cue.tsx` (`MUText`/`MUColors`, subtle `FadeIn`). **Modify** add-log-screen.tsx to render `{shouldShowResumeCue(params) && <ResumeCue/>}` above the seeded list. i18n `aiChat.resumeCue = "Picking up where we left off"`.
- **Test first** `resume-cue.spec.tsx`: renders copy; gating reuses Task 3's `shouldShowResumeCue` cases.
- Full sweep `yarn jest --runInBand --forceExit --testTimeout=15000` + `yarn tsc --noEmit` before TF. Bump `CURRENT_PROJECT_VERSION` + per-scheme `CFBundleVersion` together at archive.
- **Commit:** `feat(ai-chat): show subtle resume cue when continuing a conversation`

**Coverage checklist:** open without id → fresh (Bug-1, T3); open with id → seeds (T2/T3); cue only on resume (T3/T6); latest-resumable null-safe (T1/T4); Diary Continue opens right convo (T5). No native deps → no pod install.

---

## Definition of done
- [ ] murror-api Slice A on staging; `pnpm build` green; memory sent as prose string.
- [ ] viasr Slice A on staging; evals + compassion-review pass; skip-path log confirms slow retrieval bypassed.
- [ ] Speed measured before/after — no p50/p95 regression.
- [ ] Heart signed off on remembering copy + mobile strings.
- [ ] Mobile Slice B in TestFlight; resume + cue verified; new-chat path unchanged.
