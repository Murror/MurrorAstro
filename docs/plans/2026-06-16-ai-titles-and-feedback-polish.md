# 2026-06-16 — AI entry titles + 3 rounds of deep-chat/diary polish (staging)

**Scope:** STAGING only (`nsp-staging-murror` + `nsp-staging-murror-ai`). Alpha (`nsp-dev-murror`) intentionally left as-is (running a WIP feature-branch murror-api, no web-client, separate DB `ormdzpvhrzvietlsvmro`).

## Theme 1 — Deploy discipline (the bug behind "I don't see the changes")
- `build-web-client.yml` is **BUILD-ONLY** (no rollout). The 4 prior web feedbacks had images built + pushed to GHCR but were never deployed, so staging kept serving the old bundle.
- Fix: deployed the parked image `staging-eccd74e0` via `kubectl set image deployment/web-client web-client=... -n nsp-staging-murror` (context `do-sfo2-murror-cluster`); verified live (fresh bundle hash + 200).
- Memory hardened: build ≠ deploy (always `kubectl set image` after the build); squash-merge breaks `git merge-base --is-ancestor` checks (verify by file CONTENT, not commit ancestry).

## Theme 2 — AI short titles (cross-repo feature)
Each journal + deep-chat entry now gets an AI-generated short title, shown on the cards (title prominent + faint 1-line summary preview, graceful summary fallback when null).
- **viasr** (#492): `title` added to journal generation (`ComprehensiveJournalResponse` + `JOURNAL_SYSTEM_PROMPT`) and deep-chat wrapup (`conversation_wrapup.yaml`), emitted as top-level camelCase `title` on the RMQ responses. New reusable `POST /generate-title` ({text, language?} -> {title}, cheapest model tier) for backfill.
- **murror-api** (#472): nullable Prisma migration `20260617020000_add_entry_title_to_journal_and_deep_chat` (`ADD COLUMN title TEXT` on `journals` + `deep_chat_conversations`, additive/zero-risk); stores viasr's title; exposes `title` on `/v2/diaries` + journal/conversation detail DTOs; `AIServiceClient.generateTitle` + `scripts/backfill-entry-titles.ts`.
- **web** (#79): `title` on `DiaryEntry`/`JournalDetail`; diary-card renders title + faint preview with summary fallback.
- **Backfill** ran on staging via `kubectl port-forward svc/murror-ai` + the script (DIRECT 5432 DB URL with `?schema=murror_api`): **59/59 journals + 65/65 deep-chats-with-summary titled**. 127 summary-less conversations are genuinely un-titleable.
- **Backfill loop bug** (#474): both drain loops paged `where:{title:null}` in `while(true)` and relied on UPDATED rows leaving the filter; an all-skipped page (no source text) re-read forever (hit live on the 127 summary-less convos). Fixed with a monotonic `id > lastId` walk + `summary:{not:null}` filter for conversations. Dry-run confirmed termination.

### Migration verification (staging DB `sprkxmwrvgqgebajopwp`)
- Confirmed via `information_schema`: `murror_api.journals.title` + `murror_api.deep_chat_conversations.title` exist, `text`, nullable. (Note the DB has BOTH `public.journals` (legacy, no title) and `murror_api.journals` (live, has title); Prisma resolves via `?schema=murror_api`.)

## Theme 3 — Web UI polish (3 feedback rounds)
- **Round 1** — #76 composer declutter (optional starter prompt with "Add a prompt" chip, persona + connection collapsed to pills, `<Overline>` section titles, send/voice 40px parity, `overflow-hidden` textarea); #77 persona-detail-sheet test fixes (retired "Speak as" CTA -> "Select").
- **Round 2** — #78: thin composer divider, Moments-to-Care paged carousel -> `HorizontalScroll` rail (multi-card desktop + `[touch-action:pan-x]` mobile passthrough) with a balanced care-tips/insight interleave capped at 5, journal compact card `h-[280px]` to match article cards, roomier diary list rows, `<Overline>` dates.
- **Round 3** — #81: removed the duplicate top divider (the `SuggestionCard` `border-b`), default connection pill now shows the user's avatar + "Me" (`web.writer.me`), diary title bumped to 24px (`text-2xl`) to match article cards.

## Theme 4 — AI correctness / compassion
- **#493** removed a non-existent "Panic Mode" feature the assistant recommended with a fake nav path (`conversation_chat.yaml`).
- **#473** fixed bug #4: `POST /v1/log/:id/insights` returned a bare `string[]`, dropping persona grounding (avatar + book teaching) + `personaId`, so it never showed on the journal summary view. Now returns `{insights, grounding?, personaId?}` (sourced from the journal row via `toInsightGroundingDto`, mirroring the detail + deep-chat reads). Persona was already wired to generation; only the read endpoint dropped the fields.

### Flagged follow-ups (NOT fixed)
- The app-feature-tour prompt (`MURROR_APP_FEATURES_PROMPT`) over-triggers on emotional messages (keyword false-positive on terms like "navigate" in `adetect_app_feature_question`), pulling the persona out of its compassionate voice into a dry feature list. Recommend tightening detection (explicit how-do-I/where-is intent, exclude high-emotion/crisis).
- That same prompt's nav paths are mobile-only ("at the bottom", "above keyboard", "tab") but it also serves the web app, where they are inaccurate.

## PRs
- viasr: #492 (titles), #493 (Panic Mode).
- murror-api: #472 (titles + migration + backfill), #473 (insights grounding), #474 (backfill loop fix).
- web: #76, #77, #78, #79, #81.

## Verification
- All three repos: typecheck/build + tests green per PR. Cross-repo `title` contract grep-confirmed camelCase end-to-end. Migration additive/nullable + confirmed applied on staging. Web bundles confirmed live (`staging-fac6118d` then `staging-35c104ef`). Backfill counts verified in DB. `/generate-title` smoke-tested (EN + VI titles).
- #4 persona grounding: code path unit-tested + deployed; visual confirmation pending (needs a fresh insights generation with a persona, since no existing entry had grounding).
