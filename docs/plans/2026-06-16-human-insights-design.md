# 2026-06-16 — Human insights: grounding journal + deep-chat insights in the persona's books

**Status:** design approved (Astro, 2026-06-16). Scope: journal AND deep-chat insights together. Staging only.

**Goal:** make AI insights on the journal-detail and deep-chat-detail pages feel human by
surfacing, next to each insight, the persona's avatar plus the real book teaching that the
RAG step already retrieved to ground that insight, attributed to its source
(e.g. "a teaching from Hiểu Về Trái Tim").

---

## Why

Today the "Within you" insights are plain blocks of text. Behind the scenes, journal
insight generation already retrieves the most relevant teaching from the selected persona's
book corpus and uses it to shape the prompt, then discards the passage. We surface none of
that human grounding. The design move is simply: stop discarding the retrieved teaching,
carry it out to the screen with the persona's face and the book it came from.

This is Path A of three explored options (A = enrich the existing card; B = a signed letter
from the persona; C = a paired "your moment / their wisdom" dialogue). Path A was chosen
because it is purely additive, reuses the existing insight component, and its data shape is
exactly what Path C needs later — so A is a foundation that evolves into C with no new
backend plumbing.

## What the user sees

The "Within you" section keeps every insight it shows today. Each insight can now carry a
**grounding block**: the persona's portrait, the book it came from, and the teaching that
shaped that insight, in the persona's own voice. A small persona chip at the section header
signals whose wisdom is speaking. See the approved mockup (chat, 2026-06-16): persona chip
top-right of "Within you"; per-insight inset with avatar + "a teaching from {book}" + the
paraphrased teaching in a quiet serif; plain insights render unchanged when no teaching
clears the bar.

## Scope

- **Journal insights** (`journal-detail-page.tsx`, `/v1/log/{id}/insights`) — RAG already runs.
- **Deep-chat conversation insights** (`deep-chat-detail-page.tsx`,
  `/v1/deep-chat/conversations/{id}/insights`) — currently NO persona/RAG; this build wires
  RAG into `conversation_insights` so it matches the journal path.
- Both pages render insights through the same `CollapsibleSection` pattern, so the web card
  is built once and serves both.

Out of scope (future): voice summary page, connection/takeaway cards, Path B letters,
Path C paired layout.

## Architecture — the data thread

The retrieved teaching is captured at generation time and carried, as an optional parallel
array, all the way to the web card. Every new field is optional/defaulted so absence renders
exactly as today (zero regression).

### viasr-api (AI)

- `app/personas/registry.py` — add `source_book: Optional[str] = None` to the frozen
  `Persona` dataclass. Populate: `minh-niem` → "Hiểu Về Trái Tim", `thanh-loc` →
  "Tâm Thành và Lộc Đời", `astrovinh` → his own writing label. TNH stays `None` (no corpus,
  hidden). Default/unknown personas → `None`.
- `app/personas/retrieval.py` — `retrieve_persona_teachings` currently returns `list[str]`.
  Add a sibling/return that also yields the matched teaching text so callers can keep it
  (do not break the existing string-only callers; additive).
- `app/personas/registry.py` `build_persona_voice_block_with_rag` — return the retrieved
  teaching(s) alongside the voice block (e.g. `(voice_block, retrieved: list[str])`) instead
  of only inlining them into the prompt string.
- `app/services/journal_analysis/generation.py` + `prompts.py` — capture the retrieved
  teaching where RAG is called (`prompts.py:202`); `generate()` returns insights PLUS a
  parallel `grounding: list[{teaching, book, persona_id}]` (book from `persona.source_book`).
- `app/services/murror_chat/chat.py` `conversation_insights` (chat.py:850) — wire persona
  lookup + `build_persona_voice_block_with_rag` in (mirroring the journal path), then return
  the same `grounding` shape in `ConversationInsightsResponse`.

### murror-api (NestJS/Prisma)

- Prisma: add a nullable column to carry grounding alongside `journal.insights` and
  `deepChatConversation.insights` (JSON array of `{teaching, book, personaId}`), plus store
  the resolved `personaId` on the insight result. Migration SQL + code land together (never
  out-of-band).
- Journal: `log.controller.ts` / `journal-analysis.service.ts` — persist + return grounding;
  `personaId` already resolved from `User.personaId` at journal-analysis.service.ts:100.
- Deep-chat: `deep-chat.controller.ts` / `DeepChatAnalysisService` — persist + return
  grounding; resolve `User.personaId` on this path too.
- Response DTOs extended with optional `grounding[]` + `personaId`.

### murror-platform (web-client)

- `domain/entities/journal.ts` `JournalDetail` and `domain/entities/deep-chat.ts`
  `DeepChatDetail` — add optional `grounding?: InsightGrounding[]` and `personaId?: PersonaId`.
- The shared `CollapsibleSection` (journal-detail-page.tsx:47, deep-chat-detail-page.tsx:47)
  — render the persona chip at the header and the per-insight grounding block (avatar via the
  existing `PersonaAvatar`, "a teaching from {book}", the teaching in a quiet serif). Falls
  back to today's plain list when `grounding`/`personaId` absent.

## Guardrails

- **Paraphrase, never verbatim.** The corpus is paraphrase-only by license. UI copy says
  "a teaching from {book}" and presents the teaching as the persona's distilled wisdom — never
  as a quotation in the book's exact words, never in quote marks implying verbatim text.
- **Only consented voices get a book.** Minh Niệm, Thành Lộc, Astro (self) have documented
  consent. TNH has no corpus + is hidden. Default Murror = no persona = no block. We never
  imply a source we lack rights to. (Mirrors the LEGAL RULE in the persona identity reframe.)
- **Zero regression.** Every new field optional/defaulted; absent grounding → renders as today.
  Crisis/safety handling is untouched (this is insight rendering, not the chat turn).

## Evolve to C

The grounding object — *your moment* (insight) + *their teaching* + *book* + *avatar* — is the
exact raw material Path C ("Your moment, their wisdom") needs. Evolving later is a presentation
change (re-lay-out the same data as the paired dialogue), no new data thread.

## Testing

- viasr: unit tests that `source_book` resolves per persona; that journal `generate()` and
  `conversation_insights` return grounding when a persona is set and `[]` otherwise; paraphrase
  framing (no verbatim) preserved.
- murror-api: grounding persists + round-trips in the DTO for both surfaces; personaId resolves;
  absent persona → empty grounding.
- web: `CollapsibleSection` renders the grounding block when present, the plain list when not;
  default Murror shows no block.
- E2E on staging: a journal entry + a deep chat under Minh Niệm return insights with a grounded
  teaching + book; under default Murror they render plain.

## Rollout

Staging first (both alpha + staging per deploy convention where applicable). Cross-repo, so
multiple PRs targeting `staging`. Agent-reviewed before deploy. Prod left dark; promotion is a
separate founder-call.

## Open questions

- Grounding column type: JSON vs. parallel `String[]` arrays. Lean JSON object array for
  `{teaching, book, personaId}` to keep it one column and Path-C-ready.
- How many teachings to surface per insight section: start with the single top match (k=1 for
  display) even though retrieval may fetch k=2 for the prompt.
