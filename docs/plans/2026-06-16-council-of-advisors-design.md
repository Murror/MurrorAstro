# Council of Advisors — design (2026-06-16)

**One line:** Expand the single-persona insight grounding into a per-entry **council of 2-3 advisors** (RAG-chosen) whose voices appear throughout the entry summary view, so the user feels surrounded by guidance ("an army of advisors").

**Status:** design APPROVED (Astro, 2026-06-16). STAGING only, flag-gated, off by default. Extends [[project_human_insights_grounding]] (same RAG infra).

## Goal
Today the entry summary (unified `EntryDetailPage`) shows ONE selected persona's avatar + a single book teaching on the insights. Astro wants the persona presence felt clearly throughout the summary, voiced by MULTIPLE personas — not just the one the user selected — so it feels like a panel of advisors guiding them.

## Decisions (from brainstorm)
- **Roster / size:** a curated council of **2-3 advisors per entry** (usually 2, up to 3 when a 3rd book scores genuinely relevant). Drawn from the CONSENTED named personas: Astro Vinh, Minh Niệm, Thành Lộc. Thich Nhat Hanh is EXCLUDED (hidden / consent-gated). Default "Murror" is not an advisor (no book corpus).
- **Selection:** **RAG relevance across all consented corpuses.** Retrieve top teachings from every persona's book for the entry, score, and the 2-3 personas whose teachings rank highest seat the council. The wisdom that "speaks loudest" to the entry wins. No hand-maintained emotion->advisor mapping. Reuses the existing grounding RAG (`build_persona_voice_block_with_rag_grounded` / `build_insight_grounding`).
- **Section scope:** every GUIDANCE/reflective surface carries the full council:
  - a short **council reaction under the Summary** (each advisor's 1-2 sentence reaction to the whole entry),
  - **Within You** (insights),
  - **A Perspective** (perspectives),
  - **A Step Forward** (proposals / next steps).
  The factual Summary recap, Emotional Journey, and Keywords stay the entry's own neutral voice (no council take on factual/data content).
- **Presentation:** stacked short attributed takes — each section shows the topic, then per advisor a mini-row: avatar + name + 1-2 serif sentences + book attribution ("a teaching from {book}"). Visually distinct (avatar + accent), kept short so it stays scannable, not a wall.
- **Lifecycle:**
  - *Before:* on first open of the summary, auto-generate ("Gathering your council..."), mirroring today's auto-insights effect.
  - *During:* the stacked council takes per section + a council header (the advisor avatars + "X and Y are with you").
  - *After:* PERSISTED — the same council shows instantly on every later visit (stable, free after first). A **"Summon another voice"** action appends the next-most-relevant advisor (generates just their takes). No silent auto-refresh (advice stays stable).

## Architecture (3 repos; reuses grounding RAG; one generation/entry)
1. **viasr — council selection + generation:**
   - Council selection: RAG-retrieve teachings across all consented corpuses for the entry; rank; pick the top 2-3 personas.
   - ONE structured generation call: given (entry text/summary + the council + each member's retrieved teaching), return per advisor a short grounded take for each section (summary-reaction, insights, perspectives, proposals). Structured JSON. One call per entry (NOT advisors x sections calls).
   - New endpoint (mirrors the on-demand analysis pattern): `POST .../council` (entry id) -> persists/returns the council; a "summon" variant adds one more advisor.
2. **murror-api — persist + serve:**
   - Additive, nullable `council` JSON column on `journals` + `deep_chat_conversations` (Prisma migration; same pattern as `title` / `insight_grounding`). Shape: `{ advisors: [personaId], sections: { summaryReaction: [{personaId, text, book}], insights: [...], perspectives: [...], proposals: [...] } }`.
   - Persist viasr's council output; expose `council` on the entry-detail DTOs (journal + deep-chat) consumed by `EntryDetailPage`.
   - On-demand generation endpoint (auth'd), cached: if a council exists, return it; else generate. "Summon another voice" -> regenerate with the next advisor added.
3. **web — render in `EntryDetailPage`:**
   - Auto-generate the council once on first view (ref-guarded effect, like the insights auto-gen) when none exists and the entry is processed.
   - Render the council header + per-section stacked attributed takes. Reuse the persona avatar + book-attribution components from the grounding UI.
   - Fallback: when `council` is null, render today's single-grounding/plain view (ZERO regression).
   - "Summon another voice" chip -> calls the summon endpoint, appends.

## Data flow
open summary -> (no council yet) -> POST council/generate -> viasr RAG-selects 2-3 + one structured generation -> murror-api persists `council` -> web renders. Revisit -> cached council, instant. Summon -> add next advisor -> regenerate that advisor's takes -> append + persist.

## Cost & safety
- **Cost:** one RAG pass + one structured generation per entry, CACHED -> roughly today's per-entry insight cost, not N x sections. Flag-gated so off until eval'd.
- **Safety / compassion:** safety-above-persona preserved; each take short, grounded, non-clinical; council prompt gets a compassion-review + an eval run before flag-on (per the run-evals-after-prompt-changes rule). Only consented personas; TNH excluded.

## Rollout
viasr (selection + prompt + endpoint) -> murror-api (migration + persist + DTO + endpoint) -> web (`EntryDetailPage` render). Flag OFF by default; ship to staging; eval tone + Astro eyeballs council quality on real entries (Maya/thanh-loc + a 2-advisor entry) before flag-on. Backfill of existing entries optional (regenerate-with-council), like the title/grounding backfills. NEVER prod until approved.

## Testing
- viasr: council-selection unit test (ranking), generation schema test, compassion-review of the council prompt, eval run.
- murror-api: migration additive+nullable; DTO exposes `council`; persistence test; endpoint returns cached vs generates.
- web: `EntryDetailPage` renders council (stacked takes) + falls back when null; "summon" appends; typecheck + tests.
- E2E: verify on Maya (thanh-loc) — open an entry, confirm a 2-advisor council with grounded takes per section.

## Open / deferred
- Whether to backfill existing entries with councils (like titles) or forward-only — decide at rollout.
- Exact `council` JSON vs reusing/extending `insight_grounding` — finalize in the plan (leaning new `council` column to avoid disturbing the working single-grounding path).
- Mobile parity (this is web-first; mobile council is a later follow-up).
