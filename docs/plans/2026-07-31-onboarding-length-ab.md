# Onboarding length A/B (full vs short v2 Act 2/3)

Date: 2026-07-31
Author: Claude (Astro's session)

## Context

Users reported the v2 orbital onboarding felt long. Astro asked for a launch A/B:
the existing full V2 flow vs a shorter variant, designed to feed the new soft
paywall ("Continue free" skip, freemium locked cards) so users feel product
value as fast as possible.

A four-agent panel (forge/heart/prism/oracle) brainstormed the cut before any
code was touched. Consensus: Act 1 (the orbital hook -> chip pick -> Share ->
AI "their side" Merge reveal) is untouchable, it is the entire value
demonstration. The founder's letter stays full screen in both arms (Astro's
explicit call). Only Act 2/3 (the 15-beat question/identity block) gets
shortened, using Heart's framing as the cut rule: keep beats that GIVE the user
something (the personalization payoff), cut beats that only TAKE (pure survey
questions with no visible payoff).

A visual storyboard was built and shown to Astro before any implementation
(screen-by-screen phone mockups in the app's dark orbital language, the flag
switch diagram, the experiment design) and approved as-is.

## What shipped

### MurrorMobile PR #976 (`feature/onboarding-v2-length-ab` -> `staging-environment-setup`, merged 2026-07-31)

- `src/screens/onboarding/v2/act23-steps-short.ts` — `ACT23_STEPS_SHORT`, a pure
  4-beat subset (`identity`, `hearUs`, `relImprovement`, `insightPreview`) of
  the canonical 15-beat `ACT23_STEPS`, following the exact pattern already
  established by `profile-edit-steps.ts` for the in-app profile-edit surface.
- `src/screens/onboarding/v2/act23-sequence.tsx` — additive `steps` prop,
  defaulting to the full list (control byte-identical). Progress dots,
  back/next bounds, and per-beat analytics all derive from the array, so no
  other rewiring was needed. Added a bounds clamp + empty-list early-complete
  guard (latent black-screen trap a future caller could hit).
- `src/screens/onboarding/v2/onboarding-length.ts` — the resolver, modeled
  line-for-line on `use-hard-paywall-gate.ts` (the soft-paywall PostHog kill
  switch). Key properties:
  - Fail-safe **full**: only the exact PostHog variant string `'short'`
    activates the short list.
  - **Sticky per install**: the first resolution is persisted
    (`StorageKeys.onboardingV2LengthAssigned`, device-level) and every later
    funnel run (including an app kill + relaunch) restores it instead of
    re-resolving. Without this, a fresh install could fail-safe to `full`
    before its first PostHog flag fetch completes, then flip to `short` on
    relaunch: two conflicting exposure events and a visible arm switch mid
    experiment.
  - Dev/Alpha scheme defaults to `short` (no PostHog key ships there, mirroring
    the existing soft-paywall dev carve-out), with a persisted override to
    force `full` for QA.
- `src/screens/onboarding/v2/onboarding-v2-host.tsx` — resolves-and-freezes the
  arm exactly once, at the letter -> Act 2/3 transition (both arms are
  byte-identical before that point, which gives PostHog the whole Act 1
  runtime to resolve flags on a fresh install). Fires the deduped exposure
  event `onboarding.v2_variant_assigned` with `length_variant` +
  `flag_resolved` (the latter distinguishes a real PostHog answer from the
  fail-safe of an unresolved flag, so analysis can exclude the never-assigned
  population from control).
- `src/config/user-identifier-service.ts` — re-tags the RevenueCat subscriber
  with `onboarding_length_variant` after BOTH `Purchases.logIn` call sites.
  RevenueCat does not merge anonymous-subscriber attributes into the
  identified subscriber on login, so the pre-signup tag alone would have
  landed on an orphaned anonymous record; the post-login re-tag is what makes
  trial/paid revenue attributable to the arm.
- Analytics (`services/types.ts`, `services/analytics.ts`): new
  `onboarding_variant_assigned` funnel event; every v2 event after assignment
  now carries `length_variant` (events before assignment, i.e. Act 1 + the
  letter, deliberately carry none, since both arms are identical there).
- Tests: 9 v2 onboarding suites / 52 cases green, including dedicated coverage
  for the fail-safe truth table, the dev-override carve-out, sticky-assignment
  restoration across a simulated relaunch, and exposure-event ordering.

Two adversarial (sentinel) review rounds ran against the diff before merge.
Round 1 found the sticky-assignment gap, the RevenueCat orphan-attribute bug,
and the dead dev-override carve-out; all three were fixed and re-verified.

### murror-api PR #687 (`feat/onboarding-optional-gender-goals` -> `staging`, merged + deployed 2026-07-31)

Hard prerequisite, found by verifying the backend instead of assuming: without
this, every short-arm completion would 400 ("Gender must be one of..." /
"At least one goal ID is required"), because the short arm defers those two
questions to the in-app profile edit and never sends them on
`POST /onboarding/complete`.

- `gender` and `goalIds` are now optional on `CompleteOnboardingDto`.
- Absent gender/goals mean "leave untouched," symmetrically across BOTH the
  legacy and murror databases. Round-2 review caught an asymmetry: the murror
  write was setting an explicit `null` while the legacy upsert silently
  dropped the `undefined` key on update (Prisma drops undefined keys), so a
  redo without gender would have wiped murror while leaving legacy stale. Fixed
  by omitting the murror key entirely when the field is absent (same pattern
  already used for `avatar`); an explicit `gender: null` now clears both DBs
  consistently.
- `goalIds` accepts `[]` without a 400 (dropped `@ArrayMinSize(1)`). Round-2
  review found that the selections-mirror endpoint (`GET` onboarding
  selections) returns `goalIds: []` for a goal-less user, and the mobile
  profile-edit round-trips that payload verbatim on save, so rejecting `[]`
  would have 400'd every short-arm user's first profile save. Tri-state
  contract: absent / `null` / `[]` all mean "untouched"; a non-empty array
  still runs the full deactivate-and-rewrite churn.
- Deployed to BOTH `nsp-staging-murror` and `nsp-dev-murror` per repo
  convention (deploy run 30650090862; staging pod verified running the new
  image within minutes of merge). Note: the run's "Deployment Summary" gate
  reports failure on every staging deploy right now because it treats a
  skipped smoke-test/release job as a failure, a pre-existing evaluator bug
  unrelated to this change; the actual `deploy` jobs for both namespaces
  succeeded.

### PostHog flag `onboarding_v2_length` (project 474013, flag id 792796)

Multivariate (`full` / `short`, 50/50 base split), created **disabled** first
(the known PostHog gotcha where creating an experiment can auto-activate its
flag was deliberately avoided), `ensure_experience_continuity: true`.

Astro's ask this session was narrower than the eventual 50/50 launch: staging
only, 100% short. The flag's single release condition is now
`env exact 'staging'` -> serves `short`; anything else (production, no `env`
property) does not match and the client's fail-safe returns `full`. Verified
against the live `/decide` endpoint for all three cases (staging -> `short`,
production -> unset, no-env -> unset) before calling it done.

One operational gotcha discovered live: `evaluation_runtime: 'client'`
(the default the create call used) excludes a flag from the `/decide` API
response entirely, which made verification return nothing until it was
switched to `'all'`. Worth remembering for any future flag work through this
MCP.

## Current state / what's next

- Staging: short arm live for any NEW staging TestFlight build cut from
  `staging-environment-setup` from this point forward (existing builds predate
  the merged code and ignore the flag). Alpha/dev: short by default already
  (no flag needed there).
- Production: untouched two ways over. The flag condition excludes it, and no
  production build contains this code yet (App Store release is still 2.0.0
  per [[project_mobile_prod_release_v200]]).
- For the real 50/50 launch A/B: replace the flag's single `env=staging`
  condition with the launch targeting (new mobile installs) and drop the
  forced `variant` override so it reverts to the natural 50/50 multivariate
  split.
- Kill switches, no build required either direction: flip the flag's condition
  to serve 100% `full`, or disable the flag entirely (fail-safe is always
  `full`).
- Not yet done: an end-to-end signup-without-gender/goals proof against a live
  staging harness account. The permission classifier blocked the
  password-grant curl call twice this session; the contract is covered by the
  2,753 passing murror-api tests plus the verified-deployed image, but the
  true end-to-end confirmation will come from the first staging TestFlight
  walkthrough of the short arm.

## Verification evidence

- Mobile: `yarn tsc --noEmit` clean, `yarn eslint` clean on all touched files,
  47-52 tests green across two verification passes (9 suites).
- API: `pnpm type-check` clean, `pnpm test -- --testPathPattern=onboarding`
  293 suites / 2,753 tests green (17 in the specific onboarding.service suite,
  including 5 new contract-locking cases).
- Flag: live `/decide` API calls confirmed the three-way routing
  (staging/production/no-env) after arming.
- Deploy: `kubectl get deployment` + pod image tag confirmed the new murror-api
  image running in `nsp-staging-murror` within minutes of the PR merge.

## Related memory

[[project_onboarding_length_ab]] (living reference, current state),
[[project_orbital_onboarding_funnel]] (the v2 funnel this extends),
[[project_freemium_soft_paywall]] (the paywall the funnel lands on),
[[feedback_guards_must_fail_closed]] (the fail-safe pattern this follows),
[[reference_posthog_shared_project_flags]] (staging+prod share one PostHog
project, why the `env` condition matters).
