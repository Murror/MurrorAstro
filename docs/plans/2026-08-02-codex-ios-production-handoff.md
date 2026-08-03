# Codex iPhone staging handoff: auth, paywall, subscriptions, and release evidence

**Date:** 2026-08-02 PDT  
**Scope:** Murror iOS staging, iPhone only. Android, iPad, and Apple Watch work are explicitly out of scope.  
**Source:** Codex worktree `/Users/astro/Projects/murror-transfer/Murror/MurrorMobile-worktrees/codex-ios-production-hardening-20260801` and the Murror documentation checkout.

## Status at handoff

Build 409 was archived, exported, uploaded to App Store Connect, and later returned
`processingState: VALID` for `app.murror.mobile.stg` version 2.1.0. That proves the
staging release artifact is accepted by App Store Connect; it does not prove the
Google-auth flow works on a physical iPhone. Astro's latest device report still
shows login failing immediately after Google authentication, so the release gate is
open and another speculative TestFlight build should not be created yet.

The isolated Codex iOS worktree is intentionally dirty. The latest checked-in commit
is `8924a795ae00cfd0cc7e19f8c2db354e654834d3` (`fix(ios): reconcile duo entitlement
flows`); the current auth, soft-paywall, subscription-management, and regression-test
changes remain uncommitted so Claude can inspect and reconcile them without a blind
merge or file overwrite.

## What shipped or was verified across the recent work

### iOS release and runtime hardening

- `1873ce55` added the staging release contract and verifier, environment-safe
  storage/deep-link handling, and CI contract coverage.
- `9b25fd98` hardened runtime recovery and release configuration: privacy shielding,
  offline state, query network status, StoreKit timeout/recovery, journal draft
  persistence, and Duo purchase state.
- `f11c42a5` removed the unused Firebase Analytics SDK and its plist/pod baggage.
- `64e80d83` restored PostHog environment-flag targeting after identify/reset.
- `ios/MurrorMobile.xcodeproj/project.pbxproj` was mechanically advanced from build
  408 to 409 for the staging release. This was shared Xcode version metadata only;
  no Android, iPad, or Watch behavior was worked on.

### Auth, onboarding, and soft paywall

The current Codex changes are targeted at the failures reported from fresh and
returning accounts:

- account cleanup now preserves the newly issued Supabase session during an account
  switch (`a66d8b03` is the checked-in predecessor); secure-storage and cache
  isolation have regression coverage;
- OAuth session establishment now reconciles/restores the returned session and
  retries provider synchronization once when the session is transiently missing;
- a new OAuth identity is allowed to complete onboarding without immediately
  refetching a profile that does not exist yet, avoiding the 404/profile race;
- new-account sign-in errors are sanitized for users instead of exposing raw
  `Auth session missing!` details; the no-account path remains a visible state to
  validate on device;
- staging/development no longer forces the hard-paywall gate, and the soft-paywall
  path is covered for fresh onboarding and returning users in English, Japanese,
  and Vietnamese.

These changes are not yet proven by the latest real-device report: the user still
sees a generic login failure after Google authentication. The next diagnostic must
capture the exact device log and authenticated backend request/response before any
additional code or build-number change.

### Solo/Duo subscription correctness

- `cb59a84b` made Manage Subscription use the same entitlement source as Settings,
  preventing premium/Duo labels from disagreeing.
- `8924a795` reconciled Duo entitlement refresh, purchase recovery, plan syncing,
  membership/sharing, and invite behavior with focused tests.
- The current dirty changes add backend-key validation, plan-state routing, and Duo
  member/owner fallback coverage in subscription management.

### Questionnaire, localization, and staging documentation

- The onboarding-length A/B work and short-arm flag were recorded in
  `docs/plans/2026-07-31-onboarding-length-ab.md`.
- JA/VI PHQ-9/GAD-7 staging work was recorded in
  `docs/plans/2026-08-02-ja-vi-staging-release.md`; API PR #710 and mobile PR #996
  were deployed to staging by run `30727859628`.
- Privacy and release-hardening context is recorded in
  `docs/plans/2026-08-02-privacy-release-hardening.md`.
- Clinical sign-off, production promotion, and the DEV/Alpha Prisma P3009 lane
  remain separate gates. No DEV/Alpha migration repair or production promotion was
  attempted.

## Verification evidence

- Focused iOS auth/account/onboarding suite: **9 suites, 67 tests passed**.
- Targeted ESLint, Prettier, i18n validation, and `git diff --check`: **passed**.
- Full TypeScript check: attempted twice, but Node terminated with an out-of-memory
  condition and produced no source diagnostic; this is not release evidence.
- Staging release contract: **12/12 checks passed** for build 409.
- Archive/export/upload: completed; App Store Connect later reported build 409
  **VALID**.
- A missing Hermes framework dSYM UUID appeared in export output as a non-blocking
  symbolication warning and should be closed before a production crash-reporting
  claim.
- The connected iPhone was unavailable to Xcode during the archive validation, so
  physical-device auth and StoreKit behavior remain human/device gates.

## Storage and CI hygiene

The task-owned TestFlight dependencies, CocoaPods directory, iOS build/archive
outputs, and temporary altool stderr file were moved to the scoped Trash location
`/Users/astro/.Trash/murror-ios-testflight-409-20260802/` and removed only after
App Store Connect returned `VALID`. The cleanup reclaimed approximately 6.7 GB;
the home volume moved from roughly 205 GB to 211 GB available. Shared Xcode
DerivedData, Claude transcripts, the active source worktree, and unrelated dirty
Murror worktrees were preserved.

No GitHub Actions workflow was manually dispatched for this handoff, and no extra
TestFlight cycle was started after build 409. The public progress page was not
updated because the latest Codex work is internal release hardening with an
unresolved device-auth gate; publishing it as a completed user-facing milestone
would overstate readiness.

## Claude continuation checklist

1. Inspect the current dirty iOS worktree without resetting or overwriting it.
2. Reproduce the Google-auth failure on the connected iPhone, collecting the exact
   Supabase/API request, status, response body, and native log boundary after OAuth.
3. Compare the device evidence with the fresh-profile `/onboarding/complete` path
   and session reconciliation; fix the backend/client contract at the root cause.
4. Run the focused suites and release contract once after the fix. Do not increment
   the build or create another Actions/TestFlight run until the device flow passes.
5. Re-test fresh sign-up, existing-account sign-in, non-existent-account sign-in,
   soft-paywall dismissal, Solo, Duo owner, Duo invitee, restore, and manage
   subscription from both sides on iPhone staging.

## Chronological token accounting

The `/document` accounting covered five relevant Claude Code transcripts and their
subagents; cache reads are included by design. The exact total is **7,459,460,847**
tokens:

- Launch hardening and onboarding through the 2026-07-31 handoff: 2,201,822,011
  (`~2,201.8M`).
- Security, privacy, iOS release, subscriptions, and JA/VI handoffs through the
  2026-08-02 staging documentation: 5,145,777,764 (`~5,145.8M`).
- Build 409 validation, storage cleanup, and the current device-auth handoff:
  111,861,072 (`~111.9M`).
