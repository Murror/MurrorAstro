# 2026-06-16 (PM) — Human insights shipped to staging + 2 fixes + persona eval

Cross-repo session. Shipped the human-insights grounding feature (Path A) to
staging, caught + fixed a latent persona-voice bug, cleaned up dead code, fixed
the care-tips quality gate, and ran the persona/compassion eval. Staging only;
prod dark. Design + plan: `docs/plans/2026-06-16-human-insights-design.md` +
`-implementation.md`.

---

## 1. Human insights grounding (Path A) — SHIPPED to staging

Journal-detail + deep-chat-detail insight cards now surface the persona's avatar
+ the RAG-retrieved book teaching that grounded the insight, attributed to its
source. Paraphrase-only, consented-voices-only, zero-regression.

- **viasr #487** (`f7db115`, merged): `source_book` on consented personas
  (minh-niem "Hiểu Về Trái Tim", thanh-loc "Tâm Thành và Lộc Đời", astrovinh);
  RAG retrieval exposes the matched teaching; journal `generate()` +
  `conversation_insights` return per-entry `persona_id` + `grounding`
  `[{teaching, book, persona_id}]` (snake, top-1, `[]` when none). Deep-chat
  grounding rides the existing RMQ insights response.
- **murror-api #466** (`d31c340`, merged): additive migration `insight_grounding`
  (jsonb) + `insight_persona_id` (text) on `journals` + `deep_chat_conversations`;
  one shared `InsightGroundingDto` + snake→camel mapper; journal writes grounding
  from the RMQ response, deep-chat writes from the analysis RESPONSE handler;
  GET log/deep-chat detail serve `personaId` + `grounding` (camel).
- **web #68** (`31c4922b`, merged): `InsightGrounding` type + optional
  `grounding`/`personaId` on detail entities; one shared `InsightsSection`
  (both pages): persona chip + a grounding block after the first insight (avatar
  + "a teaching from {book}" + teaching in serif). NO quote marks (paraphrase).
  Falls back to today's plain list when absent. i18n en/vi/ja. Deployed via
  `build-web-client.yml` (image `staging-31c4922b`).

Data contract per hop: viasr emits snake `persona_id` + `grounding` →
murror-api stores untransformed snake, maps to camel only at the DTO boundary
→ web renders camel. Per-entry (not per-insight); top-1 teaching for display.

## 2. Latent bug fixed — persona voice was silently inert (camelCase request key)

A cross-boundary review caught it: murror-api sent the analysis REQUEST persona
key as snake `persona_id`, but viasr reads camelCase `personaId` (every other
wire field is camel). So persona never reached viasr — persona VOICE + grounding
were inert on the journal + deep-chat analysis paths. Fixed at the source: send
`personaId` on all four request emit sites (journal analysis, journal generation,
deep-chat analysis, deep-chat learning) + renamed the three REQUEST event fields.
RESPONSE events stay snake (correct). Journal grounding write gated to insights.
Regression-guard tests assert the emitted key is camel. (Part of murror-api #466.)

> This activated journal/deep-chat persona voice for the first time. Intended
> (GLOBAL persona scope) but a behavior change — eval before prod promotion.

## 3. Deep-chat architecture correction (during the build)

A trace proved viasr's `_save_analysis_to_db` direct DB write has been DEAD since
deploy (imports a non-existent `AsyncSessionFactory` → ImportError, swallowed);
the real, sole writer of the deep_chat_conversations analysis columns is
murror-api via the RMQ response (`producer.send_completed_status` →
`DeepChatAnalysisResponseController`). So deep-chat grounding was re-routed onto
that RMQ response (mirroring journal) rather than enabling the dead direct write
(which would race murror-api).

## 4. Dead-code cleanup — viasr #488 (OPEN)

Removed the dead `_save_analysis_to_db` + its always-failing call + the try/except
that only caught its ImportError. RMQ response is the single explicit writer.
`_save_learning_to_db` (correct `DatabaseSessionFactory`, live) untouched; the
human-insights grounding untouched. 6 deep_chat_analysis tests pass, ruff clean.

## 5. Care-tips spec fix — murror-api #468 (MERGED)

3 `connections.controller.care-tips.spec.ts` tests had been failing on staging
(pre-existing, from the care-tips merge), reddening the PR-only Code Quality &
Coverage gate. Two root causes, both in the spec (controller correct):
(a) the `Object.create(prototype)` constructor-bypass skipped the
`logger = new Logger(...)` class-field initializer → `this.logger` undefined →
`getCareTips` threw at its log call. Stubbed the logger.
(b) test 1 + the docstring asserted the OLD gating behavior; the controller now
reads the murror-api Statsig gate for observability only and ALWAYS defers to the
use case + viasr's per-env `care_tips_enabled` gate (an undefined Statsig gate was
hiding the feature on staging). Corrected the assertion. 19/19 controller specs
green. Gate restored.

## 6. Verification

- Migration: confirmed directly in staging DB (psql) — all 4 columns exist.
- Deep-chat grounding: PROVEN live — a real minh-niem row:
  book "Hiểu Về Trái Tim", teaching "You are not a separate, solitary self. You
  are made of everyone who has loved you... in this way you are never truly alone."
- Journal grounding: code-verified + same proven RMQ→murror-api machinery; no live
  triggered row yet (no persona-user has triggered journal insights post-deploy).
- Persona/compassion eval: PASS (Deep Listening, Loving Speech, Present Moment,
  Interbeing, Build Capacity all strong; crisis escalation intact). One finding:
  the "friend"/"dear friend" vocative is over-modeled in the persona example
  phrases/exchanges → reads as a scripted signature (-> follow-up fix).

## Gotchas logged
- murror-api↔viasr REQUEST wire is camelCase; the persona key was the lone snake
  typo, inert + invisible because every test stayed within one repo. Add a
  cross-boundary test when wiring a new request field.
- Supabase PostgREST exposes only public/graphql_public/private — query murror_api
  schema via direct psql (PGPASSWORD avoids URI percent-encoding of `!`).
- viasr image build flaked 2x on a transient Debian apt mirror (Connection reset);
  re-run cleared it. Not a code issue.

## Follow-ups (from Astro feedback this session, not yet done)
- Remove the "friend" vocative from persona English voice (set the rule).
- Composer send-button placement (desktop next to voice; mobile right, no overlap).
- Journal/diary entries → serif typography cards (design-first).
- Research tab desktop → list view.
