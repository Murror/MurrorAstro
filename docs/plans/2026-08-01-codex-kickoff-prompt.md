Continuing JA/VI PHQ-9/GAD-7 localization work in murror-api and MurrorMobile,
handed off from a Claude Code session that ran out of credits mid-task.

Read the full handoff first:
`Murror/docs/plans/2026-08-01-ja-vi-phq9-handoff-for-codex.md`

It covers everything below in detail — root causes, exact file paths, verification
methods already used, and gotchas already hit. Don't rediscover what's already
written there.

## Priority order

1. **Read the handoff doc in full before touching anything.**
2. **Surface the DEV/Alpha migration-lane jam to Astro before doing anything else.**
   It's a P3009 state on the DEV Supabase project blocking every future migration
   there, caused by PR #706 (already merged) hitting real data drift. Root cause and
   evidence are in the handoff doc. This needs Astro's decision, not an engineering
   fix — do not run `prisma migrate resolve` against DEV yourself under any
   circumstances.
3. **Finish the interrupted task**: bump MurrorMobile's checkin-questions React Query
   cache key so a client holding a pre-PR-#709 cached response doesn't fail-closed on
   submission. Exact steps, including which worktree to use (not the dirty default
   one), are in the handoff doc's "What was in progress" section.
4. **Do not merge murror-api PR #710** (Japanese PHQ-9/GAD-7 questions) until BOTH:
   the DEV migration lane is confirmed clear, AND a native Japanese speaker plus
   Astro have signed off on the content (item 9 is the suicidal-ideation screen,
   treated with the same review bar as this repo's crisis-detection content).
5. PR #709 (Vietnamese fix) and PR #711 (connection-insight infra) are otherwise
   ready — they just need human review, not further engineering from you unless
   review surfaces something.

## Working expectations, carried over from the prior session

- Read each repo's own CLAUDE.md/AGENTS.md before making changes — murror-api's has
  hard rules on migration/code co-landing, PR target branch (`staging`, never
  `main`), and no-em-dash locale copy.
- Before committing any migration touching real data, verify it live against staging
  wrapped in a transaction you roll back, and re-query afterward to confirm the
  rollback actually took effect. Don't trust a migration file you haven't run.
- Before opening or updating a PR that touches mental-health-adjacent content or live
  user data, get an independent adversarial review, not a self-review. Every round
  this session found real issues worth fixing.
- After switching branches in a shared worktree, regenerate the Prisma client before
  trusting type-checks or tests.
- Never write `#<number>` inline mid-sentence in a murror-api commit body
  (commitlint misparses it as a footer and fails with a misleading error).

Ask Astro directly if anything here is ambiguous — this is real clinical-adjacent
content and a shared database, not a place to guess.
