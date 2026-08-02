# Privacy release hardening, 2026-08-02

## Outcome

The API privacy work is merged into `staging`. The mobile privacy work is ready in PR #1006 but remains open because the required Android build is still queued and has not started. The marketing session-replay masking fix is live on `murror.app`. The rewritten privacy policy remains a draft and is not published.

## Repository and release evidence

### API

- PR #713, [Privacy deletion pipeline and release guards](https://github.com/Murror/murror-api/pull/713), targeted `staging` as required.
- Reviewed head: `10d5cf73313fcd05c9d0ba4e6bc66cc817cccf8d`.
- Merge commit: `8cb65b31e0ddcacc1c7e2d7a1915787d4fa49cb1`.
- Verification: fetched `origin/staging` and confirmed the reviewed head is an ancestor of the fetched ref. `gh pr view` reports `MERGED`.
- Hosted checks passed: validation, integration tests, code quality and coverage, and the PR summary. Production-only and preview-only jobs were skipped by workflow conditions.

### Mobile

- PR #1006, [Harden mobile privacy and deletion release checks](https://github.com/Murror/MurrorMobile/pull/1006), targets `staging-environment-setup` as required.
- Reviewed head: `24e6a5271df3d01cafc353b618f18d30c8e85eaf`.
- Current state: open and `UNSTABLE` because Android Build run `30763605235`, job `91538386250`, is `QUEUED` with no steps started.
- Passing checks: CI summary, iOS build, unit tests and coverage, fast Ubuntu checks, and native smoke-build change detection.
- Release decision: do not bypass the Android gate. Merge after the original Android run completes successfully, then fetch `origin/staging-environment-setup` and verify the reviewed head is an ancestor.

### Marketing

- Commit `0cef5f8c9a217500b44735c2273fbafd45ef6bc9` added full PostHog text and element-attribute masking for the marketing site and was deployed to the live Pages project.
- Local verification: the marketing build passed before deployment.
- Live verification: `https://murror.app/` returned HTTP 200. Bundle scans of `murror.app` and `web.murror.app` found the active masking settings `mask_all_text:!0`, `mask_all_element_attributes:!0`, and `maskTextSelector:"*"`.
- Browser-level inspection of an actual replay payload is UNKNOWN because no browser runtime was available.
- Draft privacy documentation is in local commit `9d0031ecf83bb23a982930ccd6ea07ddb8a189c7`. Its branch is two commits ahead and fourteen commits behind the remote branch, so it was not pushed or merged. This avoids reconciling unrelated remote history.

## What shipped in the API change

- New connections default to the detailed share level, while AI sharing defaults to off until explicit opt-in. Missing legacy values fail closed.
- AI-derived features reject requests unless the relevant sharing consent is present.
- Account deletion now has a fourteen-day grace period, durable work steps, stale-lease recovery, auth revocation retries, provider receipts, storage purge and verification, vector and app-storage cleanup, WebSocket tombstones, and log redaction.
- Shared relationship content is redacted at the column and JSON level. `relationship_messages` uses nullable sender and receiver references with `ON DELETE SET NULL`, preserving the remaining person's messages while clearing the departing person's identity and content.
- The deletion registry drives the public purge list and includes external auth deletion, profile cascades, and relationship-message redaction.
- Production migration startup now runs a read-only schema preflight after Prisma deployment. The preflight checks the soft-delete columns, nullable relationship-message references, and the required foreign-key actions.
- The CI cascade guard landed before the schema prerequisite. It rejects new user or connection cascades unless the migration contains an explicit reviewed allow marker.
- The StepCI configuration no longer contains the obfuscated dynamic-loader payload. A contract test rejects long lines and dynamic-loader patterns and verifies the expected StepCI shape.
- The deletion worker environment flag now accepts case-insensitive `true`, with a focused regression test.

## What shipped in the mobile change

- Auth credentials use secure Keychain or Keystore storage before the Supabase client is created, with migration and cleanup coverage.
- Mixpanel and PostHog events pass through a structured privacy boundary that drops identifiers, credentials, free text, birth data, and health-sensitive values.
- Crisis, emotion, mental-health, and reflection events are suppressed from analytics.
- Sentry payloads and development logs are sanitized, and production console output is guarded.
- Account deletion disables analytics identity before the request and prevents stale identity restoration.
- Firebase SDK and provider configuration were removed from the mobile targets.
- Tracked environment files and the mobile release workflows have privacy guards.

## Verification record

- API local Jest: 316 suites passed, 8 skipped; 2,986 tests passed, 84 skipped. Type checking, build, and lint passed.
- Mobile local Jest: 344 suites passed, 1 skipped; 2,783 tests passed, 3 skipped. Type checking passed. ESLint reported zero errors and 131 pre-existing warnings.
- Mutation tests confirmed the cascade guard, survivor-safe `SET NULL` behavior, deletion worker behavior, production migration URL contract, uppercase environment flag handling, mobile immutable-install guard, and StepCI integrity guard all fail when their original bug is reintroduced.
- Production database access remained read-only. No production write or DDL was performed.
- Production schema parity is UNKNOWN until the read-only preflight runs against the production connection. The production migration remains gated on that evidence.

## Remaining gates

1. Let the original Android build run complete and pass, merge PR #1006, and verify `origin/staging-environment-setup`.
2. Run the production read-only schema preflight and record its result before any production migration action.
3. Complete authenticated deletion end-to-end evidence across every registered data surface and external provider receipt.
4. Resolve the remaining policy decision and counsel markers. Publish the rewritten policy only after deletion is working and the legal review is complete.

## Safety boundaries

- No direct push was made to `main`, `staging`, or `staging-environment-setup`.
- No production database mutation was authorized or attempted.
- The policy draft was not published.
- The mobile PR was not force-merged around a queued required check.
