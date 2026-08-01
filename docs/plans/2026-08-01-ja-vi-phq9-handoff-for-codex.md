# JA/VI PHQ-9/GAD-7 work: handoff for continuation

**Written 2026-08-01 by Claude, handing off to Codex because the current session is
out of credits.** This covers only the PHQ-9/GAD-7 + connection-insight thread from
today. It does not repeat the broader JA/VI localization history — read
[2026-07-31-vietnamese-japanese-localization.md](./2026-07-31-vietnamese-japanese-localization.md)
in this same directory for that (7 PRs, all already merged, not your concern here).

If you have file-system access to this machine, the fullest record of today's work is
in Claude's memory files at
`/Users/astro/.claude/projects/-Users-astro-Projects-murror-transfer/memory/` — every
file named below is a real markdown file at that path, not a proprietary format. Read
them directly; they're more detailed than this handoff. If you don't have access to
that path, everything you need to act is inlined below.

## The one thing that needs a human decision, not more engineering

**DEV/Alpha's Prisma migration lane is jammed.** `murror_api._prisma_migrations` on
the DEV Supabase project (`ormdzpvhrzvietlsvmro`) shows migration
`20260801190000_dedupe_wellness_goals` with `finished_at: NULL`,
`applied_steps_count: 0` — a Prisma P3009 state. **No migration can reach DEV until a
human resolves this** (`prisma migrate resolve`, after deciding what DEV's
`wellness_goals` data should actually look like). Do not run that command yourself
without Astro's explicit go-ahead — see
`incident_dev_migration_lane_jammed_2026_08_01.md` for the full root-cause writeup
(short version: the migration's own safety guard correctly detected DEV's data
doesn't match the exact shape it was written to fix, and aborted rather than guess).

This blocks murror-api PR #710 from merging (see below) and blocks literally every
other migration from any other session/repo work from reaching DEV too, until
resolved. It is NOT something this handoff asks you to fix — flag it to Astro if you
have any avenue to do so; otherwise just don't merge #710 and don't touch DEV's
migration state.

## Three murror-api PRs, all open, none merged

Repo: `Murror/murror-api`. Local worktree used this session:
`/Users/astro/Projects/murror-transfer/Murror/murror-api-ja-support` (has all three
branches available locally, or `git fetch` them from origin).

| PR | Branch | What | Blocking |
|---|---|---|---|
| [#709](https://github.com/Murror/murror-api/pull/709) | `fix/vi-phq9-item9-mistranslation` | Fixes a LIVE bug: Vietnamese `question_vi` for PHQ-9 item 9 (the suicidal-ideation screening item) asked "would your life be easier without your current challenges" instead of anything about suicidal ideation. Full 16-item audit found this as the severe outlier; replaced the whole `question_vi`/`answers_vi` set with an officially Pfizer-licensed VI translation, not just item 9. | Only needs human content review (real clinical content, deliberately not self-merged). **Not** blocked by the DEV issue — data-only `UPDATE`, no new columns. |
| [#710](https://github.com/Murror/murror-api/pull/710) | `feat/ja-phq9-gad7-questions` | Adds Japanese `question_ja`/`answers_ja` to the same table. Content independently worded (not copied) from the Muramatsu 2018 validated J-PHQ-9/J-GAD-7 translation, since that specific text is copyrighted separately from Pfizer's underlying English waiver. Full methodology in the migration file's header comment. | **Blocked by the DEV migration lane jam above** — this PR's `schema.prisma` declares the new columns, and both checkin read paths call `findMany()` with no `select`, so merging before DEV unblocks would 500 checkin for every language there, not just Japanese. Also still needs a native-Japanese-speaker fidelity check + Astro's sign-off (item 9 is crisis-adjacent, treated with the same gate as this repo's crisis-detection content). |
| [#711](https://github.com/Murror/murror-api/pull/711) | `feat/connection-insight-ja-infra` | Adds `content_ja` to `connection_insights`/`cycle_wrapups`, generalizes a hardcoded VI-only write-back method (`updateVietnameseTranslation` → `updateTranslation(id, lang, content)`) both tables shared. Infra only — `ConnectionInsightService` still deliberately degrades `ja` to English; nothing user-facing changes. | Same DEV column-mismatch exposure as #710 once merged, lower urgency since nothing reads the columns for real users yet either way. Otherwise unblocked, low-stakes, already self-reviewed. |

**All three will hit a merge conflict on the same 2 lines** of
`scripts/release/production-migration-set.json` and
`test/production-non-galaxy-migrations.contract.sh` when merged one after another —
they all branch from the same `origin/staging` tip. This already happened once today
with PRs #705/#706; the resolution pattern is: after merging one PR, `git checkout` the
next branch, `git merge origin/staging`, and in the conflicted arrays keep BOTH
migration entries, in exact lexicographic sort order (the `prepare-production-migration-set.mjs`
script's `sortedUnique` validation requires it). Verify locally with
`bash test/production-non-galaxy-migrations.contract.sh` (must exit 0) before pushing
the resolution.

Both PR #709 and #710 also got **real findings from independent adversarial review**
before you read this — don't assume the first version pushed to each branch is
current; `git log` each branch to see the fix-up commits, or just trust that what's on
`origin/<branch>` right now already has the fixes applied and re-verified (dry run +
tests + contract script, each time).

## What was in progress when the session ran out of credits

**Task: bump MurrorMobile's checkin-questions React Query cache key**, so a client
holding cached pre-#709 `answers_vi` strings doesn't fail-closed on a 400 (not silent
mis-scoring — only `"Vài ngày"` collides between old/new arrays — but the user loses
their whole check-in submission, including their item-9 answer, with a generic error).

Repo: `Murror/MurrorMobile`. Full sizing/context in
`task_3745def3`-derived work (no separate memory file was written for this yet since
it was interrupted almost immediately — the instructions below are everything that
was established).

**What to do:**
1. Do **not** work in `/Users/astro/Projects/murror-transfer/Murror/MurrorMobile`
   directly — it has uncommitted iOS build-artifact changes (pbxproj, Info.plist,
   Podfile.lock) on branch `fix/prod-bundle-phase-node-resolution` that look like
   leftover noise from a prior build, not something to disturb. Either stash them
   first (`-u` for untracked) or, cleaner, use/create a dedicated worktree — a
   `mobile-l10n` worktree already exists at
   `/Users/astro/Projects/murror-transfer/Murror/mobile-l10n` on branch
   `fix/l10n-vi-ja-readiness` and looked clean (no uncommitted changes) when last
   checked, though its relationship to `origin/staging` (ahead/behind) was not yet
   confirmed — check `git fetch origin && git log origin/staging..HEAD --oneline` and
   `git log HEAD..origin/staging --oneline` there before building on it. If it's
   stale or already merged, just create a fresh worktree off `origin/staging` instead
   (`git worktree add ../mobile-<new-name> -b fix/vi-phq9-cache-bump origin/staging`
   from any existing MurrorMobile worktree).
2. Find the React Query key for the checkin questions GET request — search for
   `GET_QUESTIONS_KEY` or similar in the mental-health/checkin hooks (grep
   `src/` for `useGetQuestions` or `mental-health` + `queryKey`).
3. Bump it (append a version suffix, e.g. `-v2`) so any client-cached response from
   before PR #709 deploys gets invalidated and the client refetches fresh
   question/answer text.
4. Confirm `persistent-cache.ts`'s `shouldDehydrateQuery` filter — the reason this
   matters at all is that this specific query key is NOT excluded from the 7-day
   persisted cache (already confirmed this session; don't re-derive it, just verify
   the filter still looks the same before you rely on it).
5. Open a PR, but **do not merge or deploy it before PR #709 actually merges and
   deploys** on the backend — a bumped mobile cache key with old server content (or
   the reverse) doesn't help. Note this explicitly in the PR description as a
   deploy-sequencing dependency.

## Also scoped but deliberately not built (don't start this without a fresh decision)

`project_phq9_item9_flag_scoping.md`: no code anywhere currently gives PHQ-9 item 9's
answer any special handling beyond summing it into the aggregate depression score, in
any language. A minimal, purely-additive signal (a new boolean column, set when item
9 scores > 0, no new alerting/notification logic) was sketched but explicitly not
implemented — this is new capability on a mental-health surface, treated with the
same clinical-review caution as crisis-detection content. Don't build it without
Astro naming this specific piece of work.

## Conventions that will save you time (established this session, don't rediscover)

- **Two Prisma schemas in murror-api**: `prisma/schema.prisma` (legacy, `public`
  schema) and `prisma/schema.murror.prisma` (primary, `murror_api` schema). Match
  which one a table lives in before writing a migration — `user_checkin_report_questions_v2`
  is legacy/`public`; `connection_insights`/`cycle_wrapups` are primary/`murror_api`.
  Legacy-schema raw SQL is double-quoted (`"public"."table_name"`); primary-schema raw
  SQL in this codebase's existing migrations is NOT quoted (`murror_api.table_name`) —
  match whichever convention the migration you're editing already uses.
- **After switching branches in a shared worktree**, always re-run `pnpm db:generate`
  before trusting `tsc`/tests — the generated Prisma client
  (`src/generated/`, gitignored) does not track branch switches, so a stale client
  from a different branch's schema will produce confusing false type errors. Hit this
  exact trap once already today.
- **commitlint footer-number trap**: never write `#<number>` inline in a commit body
  paragraph in murror-api (e.g. "fixes #710 mid-sentence") — `conventional-commits-parser`
  misparses `word #number` as a footer and fails with an unhelpful
  `footer must have leading blank line` error that doesn't point at the real cause.
  Write "PR 710" (no `#`) or put it on its own line as a real footer.
- **Migration verification pattern**: before ever committing a migration file to
  disk, wrap the exact SQL in a live `BEGIN; ... ROLLBACK;` via the Supabase MCP
  (`mcp__b27cb2fb-ed53-4e80-9e59-f50dabe14264__execute_sql`, project_id
  `sprkxmwrvgqgebajopwp` for staging), inspect the result inside the transaction, then
  separately re-query afterward to confirm the rollback actually took effect (don't
  just trust it). Used successfully ~10 times today; caught real issues before they
  ever reached a committed file.
- **Adversarial review before pushing anything mental-health-adjacent**: dispatch an
  independent review agent (this session used the `sentinel` agent type) before
  opening or updating a PR touching clinical content or live user data. Every round
  found real, fixable issues — don't skip this because a first pass looks clean.
- **Supabase project IDs**: staging `sprkxmwrvgqgebajopwp`, DEV/Alpha
  `ormdzpvhrzvietlsvmro`, production `dcftszkbpamgeivhtuzl` (surfaced by the review
  agent that found the DEV migration jam; not otherwise used today).
- **PR target branch is `staging`**, never `main`/`production` directly, per this
  repo's own CLAUDE.md. Migrations and code land together in one PR/commit, never
  separately.

## Everything else from today (already done, just context)

- murror-api PR #705 (JA checkin severity descriptions) and #706 (wellness_goals
  duplicate-row fix) — both merged and verified live on staging earlier today. #706 is
  the migration that jammed on DEV; see the blocker section above.
- viasr-api PR #600 (JA "Dive Deeper" pill title) — merged, unrelated to this thread.
- Quotes content was explicitly dropped from JA/VI scope per Astro — the feature
  isn't shown in the app anymore. Don't size or backfill it.
- Connection-insight JA generation quality (the viasr-api prompt/register work, e.g.
  fixing informal-register presumptuousness in Japanese) is a SEPARATE, larger,
  not-yet-started piece of work — PR #711 above is only the murror-api-side storage
  infra, not that generation-quality fix. See `project_ja_vi_localization.md`'s
  "connection insights JA" section for the full brainstorm findings on that if it
  becomes the next thing to pick up.
