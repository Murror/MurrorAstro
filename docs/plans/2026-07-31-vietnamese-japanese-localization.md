# Vietnamese + Japanese localization — 2026-07-31

## Context

Goal: get Vietnamese and Japanese, the two languages required to launch, into a
production-ready state, with a hard constraint from Astro that strings be
**natively authored, not machine-translated**. Vietnamese was already a mature,
live-supported language before this session; Japanese was disabled in
production (`MURROR_SUPPORTED_LANGUAGES.JA` commented out) and had to be stood
up from close to zero across all three backends plus mobile.

Standing directive partway through: "proceed and continue until I can review
directly on a TF build" — TestFlight build 402 was the concrete deliverable
checkpoint, cut and verified mid-session, independent of the backend work that
continued after it.

Four PRs across three repos + one TestFlight build. Three PRs merged, one
(murror-api #702) open at time of writing.

## What shipped

### 1. Mobile — MurrorMobile [PR #987](https://github.com/Murror/MurrorMobile/pull/987) (merged)

Branch `fix/l10n-vi-ja-readiness`, worktree `mobile-l10n`. 8 commits.

- **Copy-lint infra extended**: `scripts/copy-lint.js` gained `CROSS_RULES`
  (untranslated-fallback, placeholder-parity, ascii-punct-cjk), mirrored into
  Jest (`product-copy-rules.spec.ts`) since CI runs Jest, never the CLI
  directly. Locale-scoped allowlist entries (`locales: ['vi']` /
  `locales: ['ja']`) so an exemption for one locale doesn't silently mask a
  regression in another. Fail-closed guard on a missing `en.json`.
- **44 missing strings authored natively** in `vi.json`/`ja.json` — not
  translated from the English source. Notable case: `quiz.counter` states
  total-first in Japanese (`{{total}}問中{{current}}問目`), which is not
  reachable by translating the English "X of Y" pattern word-for-word.
- **Three real rendering bugs fixed**, all pre-existing and specific to
  non-English scripts:
  - `privacy-page.tsx` concatenated translated fragments with a raw ASCII
    space, which is wrong for Japanese (no space between clauses) and just
    looks off in Vietnamese. Fixed with a new `joinLocalizedParts()` utility.
  - `test-result-screen.tsx`: `lineHeight: 40` on the PHQ-9/GAD-7 severity
    label clipped ascenders/descenders on Vietnamese diacritics. Bumped to 52.
  - Same screen: a stray literal space was being injected before a
    translated link.
- **iOS permission dialogs localized**: new
  `ios/{en,vi,ja}.lproj/InfoPlist.strings`, natively authored, with "journal"
  removed from the mic/speech-recognition permission text per the project's
  banned-terminology rule.
- **Deliberately NOT touched**: `project.pbxproj`. Another session had live
  uncommitted build-number edits there at the time; wiring the new
  `.lproj` files into the Xcode target is documented as follow-up in
  `ios/MurrorMobile/NOTES-l10n.md`. `CFBundleLocalizations` additions were
  added then reverted after review flagged shipping the claim ahead of the
  actual pbxproj wiring.
- 2 rounds of adversarial review, all findings addressed before merge.

### 2. TestFlight build 402 (verified, not a PR)

Worktree `mobile-tf-build`, pinned to `origin/staging-environment-setup`, no
branch changes. Build number 402 was already reserved (bumped 2 hours earlier
by Astro per `git log` authorship) but never archived — confirmed via direct
ASC API query that no 402 build existed before this session started, so
`ios-next-build.sh` was deliberately NOT re-run (that would have produced 403
and orphaned 402 permanently).

- `pod install` needed an explicit `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`
  (the shell's `LANG` was unset, causing
  `Encoding::CompatibilityError: Unicode Normalization not appropriate for
  ASCII-8BIT`).
- Verified build-number consistency BEFORE archiving: 26 pbxproj occurrences
  of `CURRENT_PROJECT_VERSION`, all 4 Info.plists via `plistlib`, all == 402.
- `xcodebuild archive` → `** ARCHIVE SUCCEEDED **`. Post-archive, verified via
  `PlistBuddy` that the app and both extensions
  (`AppWidgetsExtensionStg.appex`, `OneSignalNotificationServiceExtensionStg.appex`)
  all carried 402 — the exact check that would have caught the historical
  build-241 incident.
- Export + upload succeeded. Direct ASC API query confirmed
  `processingState: VALID`.
- **Anomaly, not resolved**: build 403 also appeared in ASC, uploaded 4
  minutes after 402, also `VALID`, with no corresponding bump commit anywhere
  in git history and no CI workflow in the repo that uploads to TestFlight.
  Flagged to Astro; not investigated further (no destructive action taken).
  Astro needs to confirm which build they're reviewing.

### 3. Backend — murror-api [PR #698](https://github.com/Murror/murror-api/pull/698) (merged)

Branch `fix/ja-language-support`, worktree `murror-api-ja-support`. 3 commits.

- `LanguageQueryParamsDto` widened from `@IsEnum(['vi','en'])` to include
  `'ja'` — this one DTO gated 21 endpoints (9 onboarding option lists, GET
  `/user-profile/me`, 7 connections endpoints, articles, daily-mood-checkin,
  relationship-detail-bundle). Mobile seeds i18n from OS locale with no
  opt-in, so any Japanese-locale device sent `?lang=ja` on every request from
  first launch and got HTTP 400 across all of them, from onboarding onward.
  Most service-layer logic behind these endpoints already had a `ja` branch
  and was simply unreachable.
- `onboarding.service.ts`: `getActiveRelationshipImprovements` was the one
  method (of 9 similar ones) that PR #306 missed a `ja` branch for.
- `connections.service.ts`: `getRelationshipTypeInfo` — widened the param
  type to `string` (defense-in-depth: 2 controller endpoints bypass DTO
  validation via a bare `@Query('lang')`) and added a `labels[key] ??
  labels.en` fallback. This was a live crash risk
  (`TypeError: Cannot read properties of undefined`) once `ja` became
  reachable, found by adversarial review, not by the original ticket.
  Natively authored the Japanese relationship-type labels/descriptions.
- ~12 downstream signatures widened across
  `daily-mood-checkin.service.ts`, `relationship-progress.service.ts`,
  `connection-insight.service.ts`, `cycle-wrapup.service.ts`,
  `get-relationship-detail-bundle.use-case.ts`.
- Full suite: 295/295 test suites passed. 2 adversarial review rounds (one
  review agent stalled mid-run on an API error and was re-dispatched).
- Deployed to `nsp-staging-murror`, confirmed via `kubectl rollout status`
  (CI reported a false failure from an unrelated, pre-existing gate-script
  issue; the actual `Deploy to Kubernetes` step succeeded).

### 4. Backend — viasr-api [PR #599](https://github.com/Murror/viasr-api/pull/599) (merged)

Branch `fix/ja-language-enum`, worktree `viasr-api-ja-enum`. 10 commits. This
is where most of the session's iteration happened.

**Enum + message helpers** (`app/consts.py`): uncommented `JA` in
`MURROR_SUPPORTED_LANGUAGES`; added native Japanese branches to every
message-generation helper that only had `en`/`vi`
(`get_unsupported_lang_message`, `get_spam_message`, `get_meaningless_message`,
`get_sensitive_message`, `get_language_fullname_*`, `get_language_canhear` —
the last one rewritten natively rather than uncommenting a stale stub, since
the stub used "あなた" awkwardly); widened `CONTENT_FILTERING_LANGUAGES`.

**`preferred_language.py`**: widened `SUPPORTED_LANGUAGES` — this was
hard-raising `InvalidLanguageException` on profile READ for any user with
`preferred_language='JA'`, which murror-api's Prisma schema already allowed.
Live crash risk for any such user, independent of anything else in this PR.

**Chat language detection, two separate but structurally identical bugs**:

- `detect_text_lang.py`: both `detect_text_lang` and `adetect_text_lang`
  system prompts said "Return en if English, vi if Vietnamese, otherwise
  other" — literally could never return `ja`.
- `chat.py` (`stream_chat_sse`) and `stream_chat.py` (`execute`): each had a
  hardcoded two-way `asyncio.gather` over
  `adetect_meaningless(text, "en", ...)` and `adetect_meaningless(text, "vi",
  ...)`. Japanese text scores meaningless against BOTH English and
  Vietnamese dictionaries, so the gate never even reached real language
  detection for a non-ja-default user typing Japanese — they'd get an
  English reply regardless of what they wrote. Widened to a three-way gather
  plus a `detected or default_lang` None-guard that `stream_chat_sse` was
  missing (its sibling in `stream_chat.py` already had it).

**The Japanese "meaningless" content-filter, six attempts**: this is the
core unsolved-until-now problem — distinguishing real Japanese text from
gibberish tagged as Japanese, with no real tokenizer (MeCab/fugashi) in the
codebase. Every attempt was adversarially reviewed and every review round
found something real:

1. Bare presence (`.search()`) — too permissive (punctuation-only strings, a
   single stray kanji in English gibberish, both passed).
2. 0.3 density threshold, no stripping — too strict for ordinary mixed-script
   Japanese (URLs, brand names, times routinely stay Latin-script inside a
   real sentence); four real messages landed at 21.9%-28.0%, just under 0.3.
3. 0.15 threshold + URL/ASCII-word stripping — stripping every ASCII token
   out of gibberish left one stray kanji as 100% of what remained, so the
   check passed on pure gibberish.
4. 0.15 threshold + URL-only stripping — three new bugs: numerator/
   denominator mismatch (numerator computed pre-strip, denominator
   post-strip); an unbounded `\S+` with no space after a URL (natural in
   Japanese) could swallow the entire rest of a sentence; the stripping
   itself was attacker-controlled (gluing a URL onto gibberish reproduced
   attempt 3's exploit by a different route).
5. 0.06 density + `MIN_COUNT=2` absolute floor, no stripping — the floor
   only bound messages under ~34 non-space characters; above that,
   proportional kanji-padding bypassed it at any length. Also broke
   legitimate single-character replies (草, え？, は？) and long real URLs
   (the 17-char test fixtures passed; realistic 60-90 char URLs failed).
6. **Final mechanism, shipped**: stop scoring density entirely.
   - Strip URL-shaped tokens (their legitimacy can't be determined by regex
     either way — accepted, documented tradeoff: a URL-shaped token glued to
     gibberish can still slip through, backstopped by the separate LLM-based
     `detect_spam` check).
   - Replace each maximal run of Japanese characters with a placeholder
     token that counts as real content in the SAME dictionary-ratio check
     already proven for en/vi — not delete the Japanese characters, which
     was tried first and found to remove them from the ratio's denominator
     entirely (an ordinary sentence with one date/brand-name/loanword
     scored 100% non-dictionary because there was nothing Japanese left to
     dilute it).
   - Treat purely numeric tokens as neutral (excluded from the ratio
     entirely) — without this, a message with two separate digit groups
     (a date AND a time) had more non-dictionary tokens than Japanese runs
     to dilute them.
   - This closes the length-dependent bypass with no new constant: gibberish
     tokens are never stripped, so padding with more kanji at any length
     doesn't dilute anything, as long as the kanji stays clustered. (It is
     defeatable by interleaving one kanji per gibberish word — accepted,
     matches how interleaving "the" between English gibberish words already
     defeats the en/vi path today; not a new hole.)
   - Every fix mutation-tested: revert, confirm the new test fails against
     the prior version, restore, confirm it passes. The final round tested
     against the FULL corpus from all six prior attempts, not just the
     immediately preceding one.

**Vietnamese, audited for parity after Japanese took six rounds**:

- `SpamFilteringService`'s short-circuit allowlist (`"hi","ok","ko","uh",
  "uhm"` bypass the dictionary-ratio check entirely) was English-only. A
  one-word Vietnamese reply has nothing to dilute it against, so "ừ" (a
  casual "yeah"/"mhm", one of the most common one-word Vietnamese chat
  replies) scored 100% non-dictionary and was rejected — `vi_wiktionary.txt`
  is a formal dictionary corpus that doesn't reliably cover spoken-only
  interjections or chat-speak spellings. Added `ừ, ừm, ừa, ừh, oke, okie,
  oki, kk` to a newly-extracted `SHORT_CIRCUIT_REPLIES` constant.
- Found by the following adversarial review round: a Vietnamese IME in
  decomposed ("Unicode tổ hợp") mode emits "ừ" as 3 codepoints (u +
  combining horn + combining grave) instead of the 1 precomposed codepoint
  the allowlist literal is written in, so the exact word the fix just added
  could still fall through and fail. Fixed with an NFC-normalize before the
  membership check, scoped to that check only.
- Not fixed, flagged separately: `detect_text_lang_ml`'s general-purpose ML
  language detector misclassifies some short Vietnamese chat-speak tokens
  ("ừm" → "da" Danish, "oke" → "es" Spanish). Different problem shape (model
  accuracy on short strings, not a missing allowlist entry) — needs its own
  investigation.

Full suite: 1415 passed, 2 skipped (pre-existing, unrelated), clean at every
commit. Ruff clean throughout.

### 5. Backend — murror-api [PR #702](https://github.com/Murror/murror-api/pull/702) (open)

Branch `fix/ja-remaining-locked-dtos`, worktree `murror-api-ja-support`
(reused, fast-forwarded to current staging first). 1 commit.

`LanguageQueryParamsDto`'s widening in #698 explicitly left 4 other DTOs
alone, each with its own separate `@IsIn`/`@IsEnum(['en','vi'])` validator:
`GetQuotesQueryDto`, `GetScoresQueryDto`, `GetJournalByIdQueryDto`,
`GetConnectionInsightDto`.

**Important distinction from #698**: an investigation before touching any of
them found that 3 of the 4 have NO `_ja` content column in the database at
all (`quote_ja`, `description_ja`, `contentJa` don't exist). Widening the
validator alone is an honest degrade — `lang=ja` now gets HTTP 200 with
English content instead of HTTP 400, not real Japanese output. Real Japanese
quotes / checkin severity copy / connection-insight content needs new
columns, migrations, and natively-authored (not machine-translated) content,
which is separate, larger work, not started here.

- `GetJournalByIdQueryDto` is the one exception: `log.controller.ts` never
  reads `query.lang` downstream at all, so widening it is a genuine no-op
  fix, not a degrade.
- `quotes.service.ts` got one real behavior fix beyond the validator: an
  explicit `?lang=ja` was previously silently overridden by the user's
  profile-language lookup, which could return `vi` and serve Vietnamese
  quotes to someone who explicitly asked for Japanese. Now the explicit
  param wins (falls back to English content, not the wrong OTHER language).
- `ensureFollowUpQuestions` in `connections.controller.ts` got genuinely
  new, natively-authored Japanese fallback copy (not a degrade) — the
  hardcoded warm fallback pair shown when the AI returns fewer than 2
  follow-up question pills, matching the existing en/vi pair's register:
  - 最近、二人の距離が縮まったと感じた出来事はありますか？
  - 相手についてもっと知りたいと思うことは何ですか？
- Adversarial review before commit found and fixed 2 real issues, both
  documentation drift: 2 controller methods carried stale `@ApiQuery` enum
  annotations still declaring only `en`/`vi`, contradicting their own DTO's
  widened Swagger enum (misleading generated API docs); 1 stale JSDoc
  comment.
- 68 tests across 9 spec files (4 new), all mutation-tested. `pnpm
  type-check` clean, `eslint` clean (0 errors; 2 pre-existing warnings on
  untouched lines).

## What's explicitly NOT done

Deferred, not started this session, each needing its own gate before work
can begin:

- **Crisis-detection Japanese content**: `app/services/crisis_detection/` —
  safety-critical, `viasr-api/CLAUDE.md` requires explicit review before any
  change to this path. Separately: the hardcoded crisis response text is 988
  / Crisis Text Line, both US-only numbers, with no region branching —
  **this predates Japanese work and already affects Vietnamese users today**,
  not a new gap. Worth a deliberate product decision regardless of language
  rollout timing.
- **Journal-analysis prompt authorship for Japanese**: needs new content,
  compassion-review (mental-health-adjacent).
- **Real Japanese content for quotes / checkin severity / connection
  insights**: needs `quote_ja`/`description_ja`/`contentJa` columns +
  migrations + authored content (see PR #702 above).
- **Onboarding Japanese seed data**: 0 rows as of last check.
- Email localization, emotion-label i18n layer: not investigated this
  session.

## Verification

- Mobile: `yarn copy-lint` clean (untranslated, placeholder-parity,
  ascii-punct-cjk all pass); Jest suite green; TestFlight build 402 archived,
  exported, uploaded, confirmed `VALID` via direct ASC API query.
- murror-api: `pnpm type-check` clean, `eslint` clean, targeted Jest suites
  green (full suite is known to hang — see
  `project_jest_bootstrap_fix.md` in memory — targeted runs only).
- viasr-api: `poetry run pytest` full suite green throughout (1415 passed at
  final commit), `ruff check` clean at every commit.
- Every fix in every repo mutation-tested: revert the source, confirm the
  new test fails against the prior code, restore, confirm it passes again.
- Every PR went through at least one adversarial review round before commit;
  viasr-api's content-filtering mechanism went through six.

## Gotchas for future sessions

- **`\b\w+\b` in the en/vi dictionary-ratio check treats Japanese as one
  giant "word" per contiguous script run** (no space-delimited word
  boundaries), which is the root cause of the entire viasr-api saga above.
  The comment block above `URL_PATTERN` in `spam_filtering.py` documents the
  full failure history — read it before touching that function again.
- **A test suite that only pins a wide-enough range for a threshold is not
  a real regression guard.** One review round found the prior version's
  fixtures only constrained a density threshold to (0.0435, 0.2188] — moving
  it to 0.15 or 0.21 would not have failed any test. Pin the tightest known
  real and adversarial examples directly, not just "somewhere in this
  range."
- **`getUserPreferredLanguage()` in murror-api collapses a JA profile
  language to `'en'`** (`connections.service.ts`) — a Japanese-profile user
  who doesn't explicitly pass `?lang=ja` on a request gets English, not
  Japanese, from anything that resolves language via profile fallback. The
  newly-authored `ensureFollowUpQuestions` Japanese content only fires when
  the client passes the param explicitly.
- **The commit message linter in murror-api (`commitlint.config.mjs`) treats
  any `word #number` pattern in the body as a footer-style issue reference**
  (via `conventional-commits-parser`'s default footer regex), which requires
  a blank line before it — referencing a PR like `"widened in #698"` inline
  in a paragraph will fail `footer-leading-blank` with no useful error
  pointing at the real cause. Avoid `#<number>` in commit body prose; spell
  out "PR 698" or reference it differently.
- **`mobile-l10n`, `murror-api-ja-support` worktrees**: both had their
  branches fast-forwarded past their own merged PR mid-session before
  starting new work on them, since staging moved on. Always check
  `git rev-list --count HEAD..origin/<base>` before reusing a worktree
  whose PR already merged — a stale worktree gives a false read on current
  file state (confirmed via `git diff` against `origin/staging` before
  trusting any "already covered" claim).
