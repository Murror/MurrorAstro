# Web conversion funnel tracking + Meta ads resumption (2026-06-22)

## Context
The Meta ads campaign was resumed to drive US traffic to murror.app (the web hard
paywall), pushing the yearly plan's 3-day free trial. While verifying the
ad -> web funnel in PostHog, found the funnel was effectively blind: the web app
tracked `$pageview`, `$identify`, and `OnboardingCompleted` only. There was NO
paywall-view event, NO trial-start event, and `CompleteRegistration` was absent
from PostHog entirely. For an ad test whose goal is yearly-trial signups, the
money step was completely untracked across PostHog, Meta Pixel, and CAPI.

## What shipped

### Meta ads (facebook-ads MCP, account 1673521989898581)
- Campaign `Murror-US-CreativeTest-01` (120246530407070507) set to CAMPAIGN-level
  (CBO) budget $40/day and un-paused. Destination: murror.app. Objective LINK_CLICKS.
- Paused 2 underperformers on June 1-22 data: b1-lit-window (4.1% CTR / 1160 impr)
  and b4-carried ($0.20 cost-per-click). 4 ads remain active (b2/b3/b5/b6).
- Account spending limit (cumulative) set to $160 by user; ~$63 already spent, so
  ~$97 new headroom (~2.4 days at $40/day).
- Scheduled task `meta-ads-funnel-monitor` (every 3h) created to read Meta delivery
  + PostHog funnel, conservatively pause clear losers, and report drop-off.

### PR #153 - StartTrial + PaywallViewed (commit 32379ba5)
- `conversions.ts`: added `StartTrial` to `ConversionName` (already a Meta standard
  event in meta-pixel.ts STANDARD_EVENTS, just never fired). Added PostHog-only
  `trackFunnelEvent` helper (production-guarded) for intermediate funnel steps.
- `subscription-page.tsx`: fire `StartTrial` via the existing 3-tool fan-out
  (`fireConversion` -> PostHog + Meta Pixel + CAPI) on every successful purchase
  (individual + family); fire `PaywallViewed` once on mount.

### PR #154 - CompleteRegistration for new Google sign-ups (commit e64f8885)
- Root cause: `loginWithGoogle` never fired `CompleteRegistration`; only the
  email-OTP path (`verifyOtp`) did. Google is the dominant US sign-in, so
  registrations were badly undercounted and the event was absent from PostHog.
- `auth-service.ts`: `loginWithGoogle` now returns `{ session, isNewUser }`.
  `isFirstSignIn` detects a new user from the gap between Supabase `created_at`
  and `last_sign_in_at` (<10s = first-ever OAuth sign-in). Fails closed: missing
  or unparseable timestamp => NOT new (never over-count).
- Fired in BOTH Google paths: the Redux `use-auth` hook AND the `AuthContext`
  provider (`auth-provider.tsx`). The provider caller was missed by the first
  grep (filtered to test/mock) and only surfaced via `tsc -b` in the pre-commit
  hook. Gated on `isNewUser`, so returning Google logins never count.
- `auth-service.test.ts` (new): new user, returning user, fail-closed cases.

## Deploy
- Both PRs merged into `feat/web-app-from-mobile` (the branch the live web app
  deploys from), merge-commit (not squash).
- Built prod images via `build-web-client.yml` (workflow_dispatch, env=production):
  `prod-4491b96a` then `prod-54f5cd47`.
- Deployed via `kubectl set image deploy/web-client` in `nsp-prod-murror`
  (NOT helm: the web-client helm release is in a `failed` state, pre-existing).
  Rolling update, reversible via `kubectl rollout undo`.
- Live image: `web-client:prod-54f5cd47`. web.murror.app returns HTTP 200.

## Funnel now instrumented end-to-end
pageview -> CompleteRegistration (email + Google) -> PaywallViewed -> StartTrial
-> OnboardingCompleted. Measurable across PostHog + Meta Pixel + CAPI. Events are
production-only and fill in from new traffic (no backfill).

## Gotchas / follow-ups
- `tsc --noEmit` from the app dir passed but MISSED the auth-provider error;
  `tsc -b --force` (what husky check-types runs) caught it. Use `tsc -b` as the
  authoritative typecheck for this monorepo.
- Commit subjects must be Conventional Commits (commitlint) e.g. `feat: ...`.
- web-client helm release is in `failed` state -> there is helm drift after the
  direct kubectl deploys. Reconcile during the proper web-app promotion.
- deploy-matrix.yml production path deploys from `main`, but the live web app
  currently ships from `feat/web-app-from-mobile` via the manual build + helm/
  kubectl path. The two will converge when the web app is promoted to main.

## Verification
- PR #153: tsc -b clean, eslint clean, 19/19 subscription-page tests, 16/16 analytics tests.
- PR #154: tsc -b clean, eslint clean, 3/3 new auth-service tests + existing suites green.
- Prod rollouts: rollout status success, pod 1/1 Running, web.murror.app HTTP 200.
