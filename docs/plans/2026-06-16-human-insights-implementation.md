# Human insights implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement this plan task-by-task. Each repo task runs in its own isolated worktree; subagents report a diff, the controller reviews and applies. Target branch is each repo's `staging` convention. No PRs opened by subagents.

**Goal:** surface, on journal-detail and deep-chat-detail insight cards, the persona's avatar + the book teaching the RAG step already retrieves, attributed to its source — paraphrase-only, consented-voices-only, zero-regression.

**Architecture:** capture the RAG-retrieved teaching at generation time in viasr and carry it as an optional, per-entry `grounding` payload + `personaId` through murror-api (Prisma + DTO) to the web entity, where the shared `CollapsibleSection` renders a persona chip + one grounding block. Every new field is optional/defaulted so absence renders exactly as today.

**Tech stack:** viasr-api (FastAPI, pytest), murror-api (NestJS, Prisma, Jest), murror-platform/web-client (React, RTK Query, Vitest/RTL).

**Design doc:** `docs/plans/2026-06-16-human-insights-design.md`.

---

## Canonical contract (DRY — referenced by every task)

Per-entry, not per-insight (retrieval runs over the whole entry text → top-k teachings).

```
InsightGrounding = {
  teaching: string    # paraphrased teaching text, NEVER verbatim
  book: string        # source book title, from persona.source_book
  personaId: string   # e.g. "minh-niem"
}
```

API/entity additions on both journal and deep-chat insight payloads:
- `personaId?: string` — the persona that shaped the entry (from User.personaId)
- `grounding?: InsightGrounding[]` — teachings retrieved for the entry (display top 1)

Absent `personaId`/empty `grounding` ⇒ render today's plain list (default Murror, or no teaching cleared `min_score`).

---

# Phase 1 — viasr-api (produce the grounding)

Repo: `viasr-api`. Worktree off the staging-tracking branch. Run: `pytest <path> -v`.

### Task 1: `source_book` on the Persona dataclass

**Files:**
- Modify: `app/personas/registry.py` (Persona dataclass ~line 34-73; persona constructors)
- Test: `tests/personas/test_source_book.py` (create)

**Steps:**
1. Write failing test: `get_persona("minh-niem").source_book == "Hiểu Về Trái Tim"`, `get_persona("thanh-loc").source_book == "Tâm Thành và Lộc Đời"`, `get_persona("astrovinh").source_book` truthy, `get_persona("thich-nhat-hanh").source_book is None`, `get_persona("murror") is None`.
2. Run → FAIL (no attribute `source_book`).
3. Add `source_book: Optional[str] = None` to the frozen `Persona` dataclass; set the three constructors. Leave TNH unset.
4. Run → PASS.
5. Commit: `feat(personas): add source_book to Persona for insight attribution`.

### Task 2: retrieval returns the matched teaching (additive)

**Files:**
- Modify: `app/personas/retrieval.py` (`retrieve_persona_teachings`, lines 66-100)
- Test: `tests/personas/test_retrieval_grounding.py` (create)

**Steps:**
1. Write failing test: a new `retrieve_persona_teachings_scored(persona_id, query, k, min_score)` returns `list[str]` of teachings (top match first); empty list on unknown persona/empty corpus; never raises. (Keep the existing `retrieve_persona_teachings` string API untouched — assert it still returns the same.)
2. Run → FAIL.
3. Implement the sibling (or extend internals so the existing function delegates) — do NOT change the existing signature/callers.
4. Run → PASS.
5. Commit: `feat(personas): expose retrieved teaching text for grounding`.

### Task 3: `build_persona_voice_block_with_rag` returns retrieved teachings

**Files:**
- Modify: `app/personas/registry.py` (`build_persona_voice_block_with_rag`, ~620-721)
- Test: `tests/personas/test_voice_block_rag_return.py` (create)

**Steps:**
1. Write failing test: a new `build_persona_voice_block_with_rag_grounded(persona, text)` returns `(voice_block: str, retrieved: list[str])`; the voice_block byte-identical to today's output; `retrieved` holds the teachings. Existing `build_persona_voice_block_with_rag` (string-only) unchanged for current callers.
2. Run → FAIL.
3. Implement the grounded variant reusing the retrieval from Task 2; keep the old function delegating to it and dropping the second tuple element (zero behavior change for chat/journal callers not yet updated).
4. Run → PASS.
5. Commit: `feat(personas): return retrieved teachings from RAG voice block`.

### Task 4: journal generation emits `grounding`

**Files:**
- Modify: `app/services/journal_analysis/prompts.py` (RAG call site ~202-212)
- Modify: `app/services/journal_analysis/generation.py` (`generate`, 25-73)
- Test: `tests/services/journal_analysis/test_generation_grounding.py` (create)

**Steps:**
1. Write failing test: `generate(..., persona_id="minh-niem")` returns insights AND grounding `[{teaching, book, personaId}]` (book = `persona.source_book`, top teaching only for display); `persona_id=None` ⇒ grounding `[]`; persona without source_book ⇒ grounding `[]` (no book to attribute). Insight strings unchanged vs. today.
2. Run → FAIL.
3. Use the grounded voice-block (Task 3) at prompts.py:202; thread the retrieved teaching out of `generate()` as a parallel return; map to the contract. Keep the existing fail-safe try/except (grounding best-effort, never fails the insight).
4. Run → PASS.
5. Commit: `feat(journal): emit persona grounding alongside insights`.

### Task 5: deep-chat `conversation_insights` gains persona + RAG + grounding

**Files:**
- Modify: `app/services/murror_chat/chat.py` (`conversation_insights`, 850-909)
- Test: `tests/services/murror_chat/test_conversation_insights_grounding.py` (create)

**Steps:**
1. Write failing test: with a user whose persona is `minh-niem`, `conversation_insights(...)` injects the grounded voice block (mirror journal) and returns grounding `[{teaching, book, personaId}]`; default/no persona ⇒ grounding `[]` and prompt byte-identical to today.
2. Run → FAIL.
3. Resolve persona (the path has `user_id`; reuse the same persona lookup journal uses), prepend the grounded voice block to the wrapup prompt, capture retrieved teaching, return grounding. Best-effort try/except like journal.
4. Run → PASS.
5. Commit: `feat(deep-chat): ground conversation insights in persona teachings`.

### Task 6: response schemas carry grounding

**Files:**
- Modify: `ConversationInsightsResponse` (in `app/services/murror_chat/chat.py` or its schema module) + the journal-analysis result payload published to murror-api (RMQ event / HTTP response)
- Test: extend Task 4/5 tests to assert the serialized response includes `grounding` + `persona_id`.

**Steps:**
1. Write failing test for the serialized shape (snake_case `persona_id`, `grounding[].teaching/book/persona_id`).
2. Run → FAIL.
3. Add optional fields (default empty) to the response/event models.
4. Run → PASS.
5. Commit: `feat(viasr): add grounding + persona_id to insight responses`.

---

# Phase 2 — murror-api (carry the grounding)

Repo: `murror-api`. Worktree off staging. Run: `npm test -- <pattern>`. Migration SQL + code land together.

### Task 7: Prisma column + migration

**Files:**
- Modify: `prisma/schema.murror.prisma` (`journal` model, `deepChatConversation` model)
- Create: a Prisma migration (grounding Json? nullable + insightPersonaId String? on both models)

**Steps:**
1. Add `insightGrounding Json?` and `insightPersonaId String?` to both models (nullable ⇒ zero-risk on existing rows).
2. Generate migration; review SQL is purely additive (ADD COLUMN nullable, no backfill).
3. `npx prisma generate`; build types.
4. Commit: `feat(db): add insightGrounding + insightPersonaId to journal and deepChat`.

### Task 8: journal analysis persists + returns grounding

**Files:**
- Modify: `src/log/services/journal-analysis.service.ts` (consume viasr grounding; persist; return)
- Modify: `src/log/log.controller.ts` if the insights response shape changes
- Test: `src/log/services/journal-analysis.service.spec.ts` (extend/create)

**Steps:**
1. Write failing test: when viasr returns grounding + persona_id, service writes `journal.insightGrounding`/`insightPersonaId` and the GET returns them; when viasr returns none, fields stay null and response matches today.
2. Run → FAIL.
3. Map viasr's snake_case → DTO camelCase; persist; include in the read path. personaId already resolved at line ~100.
4. Run → PASS.
5. Commit: `feat(journal): persist + serve persona insight grounding`.

### Task 9: deep-chat analysis persists + returns grounding

**Files:**
- Modify: `src/deep-chat/.../DeepChatAnalysisService` + `deep-chat.controller.ts` (443-470)
- Test: the corresponding `.spec.ts`

**Steps:** mirror Task 8 for `deepChatConversation`. Resolve `User.personaId` on this path. Commit: `feat(deep-chat): persist + serve persona insight grounding`.

### Task 10: response DTOs

**Files:**
- Modify: journal + deep-chat insight response DTOs (add optional `grounding`, `personaId`)
- Test: DTO/controller specs assert optional fields round-trip and are omitted when null.

**Steps:** TDD as above. Commit: `feat(api): add grounding + personaId to insight DTOs`.

---

# Phase 3 — web-client (render the grounding)

Repo: `murror-platform`. Worktree off the web staging branch. Run: `pnpm --filter web-client test <pattern>` + `pnpm --filter web-client check-types`. commitlint: header ≤100 chars, no em dashes in copy.

### Task 11: entities

**Files:**
- Modify: `apps/web-client/src/domain/entities/journal.ts` (`JournalDetail`, `AIContentResponse`)
- Modify: `apps/web-client/src/domain/entities/deep-chat.ts` (`DeepChatDetail`)
- Modify: `apps/web-client/src/application/services/diary-api.ts` + `deep-chat-api.ts` (map new fields)

**Steps:**
1. Add `InsightGrounding` type + optional `grounding?`, `personaId?: PersonaId` to both detail entities; map them in the RTK transformResponse.
2. `check-types` green.
3. Commit: `feat(web): carry insight grounding + personaId on detail entities`.

### Task 12: render persona chip + grounding block in the shared insights section

**Files:**
- Modify: `apps/web-client/src/presentation/pages/journal-detail-page.tsx` (`CollapsibleSection` ~47-145)
- Modify: `apps/web-client/src/presentation/pages/deep-chat-detail-page.tsx` (`CollapsibleSection` ~47-148) — OR extract the shared component to `presentation/components/insights/` and reuse (DRY; preferred).
- Reuse: `presentation/components/deep-chat/persona-avatar.tsx`
- Test: `tests/.../insight-grounding.test.tsx` (create)

**Steps:**
1. Write failing test: given an insights section with `personaId="minh-niem"` + one `grounding`, it renders the persona chip ("shaped by Minh Niệm") and a grounding block with the avatar, "a teaching from Hiểu Về Trái Tim", and the teaching text; given no grounding, it renders the plain list with NO chip/block (today's behavior).
2. Run → FAIL.
3. Implement per the approved mockup: persona chip at the section header; one grounding inset (avatar + "a teaching from {book}" + teaching in serif). NO quote marks (paraphrase, not verbatim). Falls back cleanly. Prefer extracting one shared component so journal + deep-chat share it.
4. Run → PASS; `check-types` green.
5. Commit: `feat(web): show persona avatar + book teaching on insights`.

### Task 13: i18n

**Files:**
- Modify: `apps/web-client/src/locales/{en,vi,ja}.json`

**Steps:** add keys `insights.shapedBy` ("shaped by {name}") and `insights.teachingFrom` ("a teaching from {book}"); vi/ja translations; NO em dashes. Wire into Task 12 component. Commit: `feat(web): localize insight grounding labels`.

---

# Phase 4 — verify + ship (staging)

### Task 14: cross-repo green check
- viasr `pytest`, murror-api `npm test`, web `pnpm --filter web-client test && check-types`. All green.

### Task 15: agent code review before deploy
- Dispatch domain agents (muse=viasr, cortex=murror-api, prism/iris=web) to QA each repo's diff. Findings first; controller applies fixes. (Mandatory pre-deploy per standing rule.)

### Task 16: deploy staging + E2E + PRs
- Deploy each repo to staging (and alpha where the deploy convention applies). E2E on staging: a journal entry + a deep chat under Minh Niệm return grounded insights (teaching + book + avatar); under default Murror they render plain. Open PRs targeting each repo's `staging`. Prod left dark.

---

## Guardrails (apply throughout)
- Paraphrase-only: never present teachings as verbatim book quotes; no quote marks implying exact text.
- Consented voices only: only personas with `source_book` set (consent/self) attribute a book.
- Zero regression: all new fields optional/defaulted; absent ⇒ today's render. Crisis/safety untouched.
- Migration SQL + code land together; never out-of-band.
