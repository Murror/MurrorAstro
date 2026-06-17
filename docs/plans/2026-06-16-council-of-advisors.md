# Council of Advisors Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement this plan task-by-task.

**Goal:** On the entry summary (`EntryDetailPage`), replace the single-persona insight grounding with a per-entry **council of 2-3 RAG-selected advisors** whose short, book-grounded takes appear under the Summary and on each guidance section, so the user feels a panel of advisors guiding them.

**Architecture:** RAG selects the 2-3 most-relevant consented personas (Astro Vinh, Minh Niệm, Thành Lộc) per entry; ONE structured viasr generation produces each advisor's short grounded take per section; murror-api persists a nullable `council` JSON column and serves it on the entry-detail DTOs; web auto-generates on first summary open, renders stacked attributed takes, and offers "Summon another voice". Flag-gated OFF, staging only, fallback to today's view when `council` is null (zero regression).

**Tech Stack:** viasr-api (FastAPI/Celery/Pydantic, persona RAG corpus in `app/personas/corpus/`), murror-api (NestJS/Prisma, `schema.murror.prisma`), web-client (React/TS/RTK Query, `EntryDetailPage`). Repos under `/Users/astro/Projects/murror-transfer/Murror/`.

**Reference (reuse, do not rebuild):** [[project_human_insights_grounding]] (the single-persona grounding this extends): viasr `app/services/journal_analysis/` + `build_persona_voice_block_with_rag_grounded` / `build_insight_grounding`; the `generate-title` endpoint shape (`app/services/generate_title/` + `app/api/controller/generate_title/`) for the new endpoint; murror-api `insight_grounding` persistence + `toInsightGroundingDto`; web `InsightsSection` (renders persona avatar + teaching) + the auto-insights `useEffect` in `entry-detail-page.tsx`.

**Cross-cutting rules:** flag `COUNCIL_ENABLED` default OFF (viasr feature flag + a web/config gate). Safety-above-persona preserved. NO em dashes in copy. Migration additive + nullable, lands WITH code via PR. Run the eval harness + compassion-review the council prompt before flag-on. STAGING only, NEVER prod.

---

## Phase A — viasr: council selection + generation

### Task A1: Council selection (RAG ranking across all consented corpuses)

**Files:**
- Create: `viasr-api/app/services/council/__init__.py`
- Create: `viasr-api/app/services/council/selection.py`
- Test: `viasr-api/tests/services/council/test_selection.py`

**Step 1 — failing test:** `select_council(entry_text, max_advisors=3)` returns a list of `(persona_id, top_teaching)` for the 2-3 consented personas (`astrovinh`, `minh-niem`, `thanh-loc`) whose RAG-retrieved teaching scores highest; excludes `thich-nhat-hanh` and the default voice; returns at least 1, at most `max_advisors`; a 3rd only if its score clears a relevance threshold.
**Step 2 — run, expect fail (module missing).**
**Step 3 — implement:** reuse the existing per-persona RAG retrieval (the function behind `build_persona_voice_block_with_rag_grounded`). For each consented persona, retrieve the top teaching + score for `entry_text`; rank personas by best score; take top 2, add a 3rd if `score >= COUNCIL_THIRD_THRESHOLD`. Read the consented roster from `app/personas/registry.py` (those with a `source_book` + corpus, excluding hidden TNH).
**Step 4 — run, expect pass.**
**Step 5 — commit:** `feat(council): RAG-rank the 2-3 most relevant advisors`.

### Task A2: Structured council generation (one call per entry)

**Files:**
- Create: `viasr-api/app/services/council/schema.py` (Pydantic: `CouncilTake{personaId, text, book?}`, `CouncilSection = list[CouncilTake]`, `CouncilResponse{advisors: list[str], summaryReaction, insights, perspectives, proposals}`)
- Create: `viasr-api/app/services/council/prompt.py` (the council system prompt)
- Create: `viasr-api/app/services/council/service.py` (`generate_council(entry_text, summary, council)` -> `CouncilResponse`)
- Test: `viasr-api/tests/services/council/test_service.py`

**Step 1 — failing test:** given an entry + a 2-advisor council (each with their retrieved teaching), `generate_council` returns a `CouncilResponse` with `advisors` == the council ids and, for EACH of `summaryReaction/insights/perspectives/proposals`, one `CouncilTake` per advisor; each take's `text` is 1-2 sentences; book attribution present where the persona has a `source_book`. (Mock the LLM to return a fixture JSON; assert parsing + per-section per-advisor shape.)
**Step 2 — run, expect fail.**
**Step 3 — implement:** ONE structured LLM call. Prompt: given the entry + summary + each council member's persona voice block + retrieved teaching, produce for each member a SHORT take (2-6 sentence cap, warm, non-clinical, grounded in their teaching) for each section. Output strict JSON matching `CouncilResponse`. Reuse the persona voice-block builder + the structured->lenient JSON parse from `generate_title`. Localize to the entry's language (mirror journal grounding).
**Step 4 — run, expect pass.**
**Step 5 — commit:** `feat(council): one structured generation of per-advisor section takes`.

### Task A3: Endpoint + flag

**Files:**
- Create: `viasr-api/app/api/controller/council/__init__.py`, `.../council/route.py`
- Modify: `viasr-api/app/api/controller/router.py` (register, mirror `/generate-title`)
- Modify: viasr feature-flags (add `COUNCIL_ENABLED`, default False)
- Test: `viasr-api/tests/api/test_council_route.py`

**Step 1 — failing test:** `POST /council` with `{text, summary, language?, exclude?: [personaId]}` (auth via `verify_combined_auth`) returns `{advisors, sections{...}}`; when `COUNCIL_ENABLED` is false it returns an empty council `{advisors: [], sections: {}}` (so murror-api stores null -> web falls back). `exclude` lets "summon another voice" avoid re-seating current advisors when picking the next.
**Step 2 — run, expect fail.**
**Step 3 — implement:** route calls `select_council` (honoring `exclude` for summon: pick the next-best NOT already seated) then `generate_council`; returns JSON. Mirror `generate_title` controller (class_router + auth). Gate on `COUNCIL_ENABLED`.
**Step 4 — run, expect pass; ruff + py_compile.**
**Step 5 — commit:** `feat(council): POST /council endpoint (flag-gated)`.

### Task A4: Compassion-review + eval the council prompt

- Run `/compassion-review` on `app/services/council/prompt.py` (safety-above-persona, non-clinical, no em dashes; each take short + grounded).
- Run the journal eval harness (`viasr-api/evals/`) to sanity-check tone/no-regression (per the run-evals rule).
- Fix any findings. Commit: `chore(council): compassion-review + eval pass`.

---

## Phase B — murror-api: persist + serve

### Task B1: Migration — nullable `council` column

**Files:**
- Modify: `murror-api/prisma/schema.murror.prisma` (add `council Json?` to `Journal` + `DeepChatConversation`)
- Create: `murror-api/prisma/migrations/<ts>_add_council_to_journal_and_deep_chat/migration.sql` (two additive `ADD COLUMN "council" JSONB` statements; mirror the prior `add_entry_title` / `add_insight_grounding` migrations exactly — unqualified table names, nullable, no default, no backfill)

**Steps:** add fields; hand-author the migration mirroring the prior additive ones; `npx prisma validate` PASS; confirm generated client includes `council`. Commit: `feat(council): nullable council column (additive migration)`.

### Task B2: Council DTO + mapper

**Files:**
- Create: `murror-api/src/log/dtos/council.dto.ts` (`CouncilTakeDto{personaId, text, book?}`, `CouncilDto{advisors, summaryReaction, insights, perspectives, proposals}`) + a `toCouncilDto(json)` mapper (null-safe, snake/camel as stored).
- Test: `murror-api/src/log/dtos/council.dto.spec.ts`

**Steps:** TDD the mapper (null -> undefined; valid JSON -> typed DTO). Commit: `feat(council): CouncilDto + mapper`.

### Task B3: AIServiceClient.generateCouncil + persistence

**Files:**
- Modify: `murror-api/src/connections/services/ai-service.client.ts` (add `generateCouncil(text, summary, language?, exclude?)` calling viasr `POST /council`, mirroring `generateTitle`/`generateCareTips`)
- Modify: the journal + deep-chat persistence/use-cases to store the returned council into the `council` column.
- Test: spec for `generateCouncil` + persistence.

**Steps:** TDD the client + that a generated council persists to the row. Commit: `feat(council): generateCouncil client + persist`.

### Task B4: On-demand endpoint (generate/cached + summon) + expose on detail DTOs

**Files:**
- Modify: `murror-api/src/log/log.controller.ts` (journal) + `src/deep-chat/presentation/controllers/...` (deep-chat): add `POST :id/council` (auth'd) -> if `council` exists return it; else resolve the entry text/summary, call `generateCouncil`, persist, return. A `?summon=true` variant passes `exclude = current advisors` to add the next advisor and merges.
- Modify: journal-detail + conversation-detail DTOs to expose `council?: CouncilDto` (so `EntryDetailPage` receives it).
- Test: endpoint specs (cached vs generate; summon appends).

**Steps:** TDD; `tsc --noEmit` + build + jest. Commit: `feat(council): on-demand council endpoint + summon + detail DTO`.

---

## Phase C — web: render in EntryDetailPage

### Task C1: Types + RTK endpoints

**Files:**
- Modify: `web-client/src/domain/entities/...` (add `Council` type: `{advisors: PersonaId[], summaryReaction: CouncilTake[], insights: CouncilTake[], perspectives: CouncilTake[], proposals: CouncilTake[]}`, `CouncilTake{personaId, text, book?}`; add `council?: Council | null` to the entry-detail entities)
- Modify: the diary/deep-chat API services: add `generateCouncil` (POST `:id/council`) + `summonAdvisor` (`?summon=true`) mutations, invalidating the entry tag.
- Test: api test (shape + tag invalidation).

**Steps:** TDD types/endpoints. Commit: `feat(web/council): types + RTK endpoints`.

### Task C2: CouncilSection render component

**Files:**
- Create: `web-client/src/presentation/components/insights/council-section.tsx` (props: `title`, `takes: CouncilTake[]`) — renders the section title (Overline) + stacked attributed mini-rows (reuse `StaticPersonaAvatar` + the book-attribution markup from the grounding UI: avatar + name + serif take + "a teaching from {book}").
- Test: `council-section.test.tsx` (renders one row per take; avatar + name + text + book; empty -> nothing).

**Steps:** TDD. Commit: `feat(web/council): CouncilSection component`.

### Task C3: Wire council into EntryDetailPage + auto-generate + summon + fallback

**Files:**
- Modify: `web-client/src/presentation/pages/entry-detail-page.tsx`
  - Auto-generate effect (ref-guarded, mirror the auto-insights one): when flag on AND entry processed AND `entry.council == null` -> call `generateCouncil(id)` once, refetch.
  - Render: a council header (advisor avatars + "X and Y are with you") + a `CouncilSection` under the Summary (`summaryReaction`) and one in each guidance section (insights/perspectives/proposals). When `council` is present, the council takes are the persona voice for those sections; when null, fall back to today's single-grounding `InsightsSection` view (ZERO regression).
  - "Summon another voice" chip -> `summonAdvisor(id)` -> refetch.
  - Flag gate (web config `COUNCIL_ENABLED`, default off).
- Test: update `entry-detail-page` coverage — council present renders stacked takes per section; council null renders the existing view; summon calls the mutation.

**Steps:** TDD; `pnpm run check-types` + vitest + prettier. Commit: `feat(web/council): render council in EntryDetailPage + auto-gen + summon`.

---

## Phase D — verify + ship (staging, flag OFF)

1. Cross-repo green: viasr (ruff + tests + import), murror-api (prisma validate + tsc + jest), web (check-types + vitest). 
2. Agent code review of the diff (per the pre-deploy review rule).
3. Merge in order: murror-api (migration runs on deploy; VERIFY `council` column exists on staging DB) -> viasr (deploys) -> web (build + `kubectl set image`). Confirm fresh bundle.
4. Flip `COUNCIL_ENABLED` ON for staging only. Verify on Maya (thanh-loc) + a 2-advisor entry: open an entry -> "Gathering your council" -> 2-3 advisors with grounded takes under Summary + each guidance section; "Summon another voice" appends; revisit is cached. Eval tone + Astro eyeballs quality.
5. Keep prod dark. Decide backfill (regenerate councils for existing entries) vs forward-only at rollout.

---

## Notes
- DRY: reuse the persona RAG retrieval, the persona voice-block builder, the `generate_title` endpoint shape, `InsightsSection`/`StaticPersonaAvatar`, the auto-insights effect, and the additive-migration pattern. Do not rebuild any of these.
- YAGNI: 2-3 advisors, 4 sections, one generation call, one cache column. No per-advisor settings, no live refresh, no mobile (later).
- The single-persona grounding path stays intact as the fallback; council is purely additive behind a flag.
