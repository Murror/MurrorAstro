# Vietnamese and Japanese PHQ-9/GAD-7 staging release

**Date:** 2026-08-02 PDT
**Status:** Staging release complete. Production and DEV/Alpha were not changed.

## Context

This is the completion record for the JA/VI PHQ-9/GAD-7 handoff in
[`2026-08-01-ja-vi-phq9-handoff-for-codex.md`](./2026-08-01-ja-vi-phq9-handoff-for-codex.md).
The external expert content review was confirmed by Astro before the staging
merge. No named reviewer identity was recorded in GitHub, so this document does
not invent one.

## What shipped

### API

- murror-api PR [#710](https://github.com/Murror/murror-api/pull/710) merged
  cleanly into `staging` at `75ddb94d6272b36473f7cf63b49fa41d4c932921`.
- Vietnamese PHQ-9/GAD-7 content was corrected, including the suicidal-ideation
  screen, with the complete 16-question and four-answer-set payload.
- Japanese PHQ-9/GAD-7 question and answer fields, Japanese severity labels,
  and Japanese response handling were added.
- Connection-insight Japanese content infrastructure was included in the same
  coordinated staging merge.
- PRs #709 and #711 were closed as superseded by the coordinated merge, keeping
  the review surface small and avoiding duplicate release paths.

### Mobile

- MurrorMobile PR [#996](https://github.com/Murror/MurrorMobile/pull/996)
  merged cleanly into `staging-environment-setup` at
  `bba7bddf3d9a16b4c8e08d7a31f3ebb8f5a65eba`.
- The check-in React Query cache key is versioned and scoped by normalized
  locale, preventing an old English response from being reused for Vietnamese
  or Japanese submissions.
- The two-week questionnaire timeframe is shown before launch in English,
  Vietnamese, and Japanese from both entry points.
- The sensitive question query remains excluded from persistent storage.

## Staging deployment evidence

- The single staging deploy run [#30727859628](https://github.com/Murror/murror-api/actions/runs/30727859628)
  passed versioning, matrix preparation, migration image build, Kubernetes
  setup, migration, application rollout, smoke test, release gate, and summary.
- The deploy matrix contained only `staging / nsp-staging-murror`; Alpha/DEV was
  not included.
- These migrations applied successfully in staging:
  - `20260801200000_fix_vi_phq9_gad7_translation`
  - `20260801210000_add_checkin_question_ja`
  - `20260801220000_add_connection_insight_content_ja`
- `https://staging.api.murror.app/api/health/ready` and
  `https://staging.api.murror.app/api/health` returned HTTP 200 with both
  databases and Redis healthy.
- A read-only query through the deployed legacy Prisma client, the same data
  path used by the mental-health controller, returned 16 rows, 16 Vietnamese
  questions and answer sets, and 16 Japanese questions and answer sets. Item 9
  contained the reviewed self-harm wording in both locales.
- The authenticated public route was not called with a bearer token because no
  current staging token was available in the local environment. Unit coverage
  and the deployed Prisma data-path check supplied the equivalent non-mutating
  verification without creating a test report.

## Verification already passed

- API local checks: Prisma client generation for both schemas, type-check,
  check-in tests, lint, format, migration contracts, staging-only deploy
  contract, YAML validation, and `git diff --check`.
- API PR CI run `30723354768`: validation, integration tests, code quality and
  coverage, and PR summary gate passed.
- Mobile PR CI run `30723293661`: unit tests and coverage, fast Ubuntu checks,
  native smoke-build detection, and summary gate passed. Native build was
  correctly skipped because the change had no native files.

## Guardrails and cleanup

- The DEV/Alpha P3009 migration-lane jam remains untouched. No
  `prisma migrate resolve` command was run against DEV/Alpha.
- No manual workflow rerun or dispatch was used. Merging the mobile PR did not
  start an additional GitHub Actions run.
- The temporary API integration worktree and temporary health-check file were
  removed. Existing dirty API and mobile checkouts were preserved unchanged.
- Final storage audit showed approximately 181 GiB available on the data
  volume.

## Follow-up boundary

This record establishes staging readiness only. Any production promotion,
native-device QA sign-off, or DEV/Alpha migration repair is a separate action
requiring the appropriate explicit authorization.
