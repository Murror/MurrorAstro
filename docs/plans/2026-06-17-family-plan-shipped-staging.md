# Family Plan — shipped to staging (2026-06-17 PDT)

## Context
Web-first, invite-driven Family Plan: one organizer buys a flat plan (up to 5 seats),
invites family, each member claims a seat for their own private premium account and is
auto-connected to the organizer. Minors 13-17 join via FTC email-plus verifiable
parental consent (under-13 hard-blocked, 18+ unrestricted). Design + de-risk +
implementation plan: `murror-platform/docs/plans/2026-06-16-family-plan*.md`. Legal
mechanism + attorney-gated drafts: `2026-06-16-family-plan-minor-consent-legal-draft.md`.

Built subagent-driven (cortex/iris), reviewed + committed per diff. Additive + fully
dormant until a RevenueCat family product exists, so flag-off behavior is byte-identical.

## What shipped (all merged + deployed to staging, dormant)

### murror-api (backend) — PR #471 (merge 412e23b) + hotfix #477 (merge 2bcf52c)
- Phase 1 (53524bd): `FamilyPlan` + `FamilySeat` Prisma models + idempotent migration.
- Phase 2 (743bf92): entitlement union — premium = own active sub OR active claimed seat
  (one-function change in `RevenueCatService.checkUserSubscription`; inherited by
  `/subscription/status`, `/check-entitlements`, `/freemium/user-plan`).
- Phase 3 (79d9c27): RevenueCat webhook family-product branch (INITIAL_PURCHASE/
  PRODUCT_CHANGE upsert ACTIVE, RENEWAL/UNCANCELLATION bump period, CANCELLATION keeps
  period end, EXPIRATION expires); own out-of-order guard. Dormant unless
  `REVENUECAT_FAMILY_PRODUCT_ID` matches the event product id.
- Task 4.0/4.1 (554d755): `FamilyMinorConsent` consent-record table + idempotent FK-free
  migration; repository seat + consent methods. (Found `User.birthDate` already exists.)
- Task 4.2 (71747a8): claim-seat use-case w/ DOB age gate (under-13 block / 13-17 require
  granted consent / 18+ proceed); persists DOB once; invalidates no-sub cache; Phase-5
  auto-connect seam. forwardRef cycle SubscriptionModule<->FamilyPlanModule.
- Task 4.3 (cd8ac94): parental-consent email-plus use-cases (request/grant/withdraw),
  idempotent grant. ARCH FINDINGS: murror-api has NO transactional email provider
  (invites are OneSignal push = app users only) -> `ParentalConsentEmailPort` + logging
  stub; no in-process event bus -> `MinorConsentWithdrawalNotifier` stub for the
  Vault/Cortex per-minor hard-delete handoff.
- Task 4.4/4.5 (0f2dfeb): organizer use-cases (get/invite/revoke/remove, ownership-guarded,
  seat cap) + `FamilyPlanController` (`/api/v1/family-plan/*`, AuthGuard organizer/member
  routes, public throttled consent grant/withdraw); privacy-safe view never reads
  FamilyMinorConsent (tested); mounted in app.module.
- Phase 5 (3579b15): auto-connect member<->organizer on claim (2-DB, idempotent,
  best-effort). "Connect with the rest" behind `FamilySuggestionPort` seam (global
  SuggestedConnection would leak; friend_invitations pushes) -> logging stub, needs a
  per-recipient table.
- Hotfix (35c6658): import `AuthModule` into FamilyPlanModule (the controller's AuthGuard
  needs SupabaseService resolvable in-module). See gotchas.
- Tests: 137 family-plan, full suite 1039 green. 2 migrations (family_plan/family_seat,
  family_minor_consent).

### web-client (murror-platform) — PR #82 (merge 475523e1), 5 of 5 web tasks
- 6.1 (c1a67f17): `freemiumApi` (GET /v1/freemium/user-plan) unioned into
  `useSubscription().isSubscribed` so claimed members read premium (additive, fail-safe).
- 6.4 (c8e1ce93): `/family/join?token=` claim flow + neutral DOB gate (under-13 /
  13-17 parent-consent / success branches) + `familyPlanApi` slice + `getApiErrorCode`.
- 6.5 (3d12158b): PUBLIC parent web-consent pages `/family/consent` + `/consent/withdraw`
  (logged-out parent; createAuthenticatedBaseQuery is session-tolerant).
- 6.3 (d6eb1263): organizer "Your family" `/family` seat-management (invite/copy-link/
  revoke/remove, tag-based refetch); privacy-safe (only seat status + invite email).
- 6.2 (2b732d09): family offering card on the web paywall (dormant until an RC offering
  whose id contains "family" exists; reuses individual purchase flow; -> /family after).
- Tests: web-client suite 916 green. EN/VI/JA copy, black-pill CTAs.

### viasr-api — PR #491 (fix/care-tips-flag-default-tests)
- Fixed 2 stale feature-flag tests after the care_tips default flip (#486):
  `test_care_tips_flag.py` + `test_feature_flag_unrecognized.py` now assert default ON +
  env-conditional UNRECOGNIZED_USES_DEFAULT membership. 10 tests green, ruff clean.

## Deploy + verification (staging)
- Web: built `staging-475523e1` via build-web-client.yml, `kubectl set image` on
  `web-client` in nsp-staging-murror; rolled out 1/1.
- Backend: #471 merge auto-deployed. First pod CrashLoopBackOff at bootstrap; hotfix #477
  resolved; pod recovered via mutable-tag image pull. VERIFIED: pod 1/1 Running clean
  ("Nest application successfully started", no UnknownDependencies); `GET /api/v1/family-plan`
  -> HTTP 401 (routes registered); `family_plan`/`family_seat`/`family_minor_consent`
  exist + queryable (count 0).

## Gotchas (captured in memory)
- **NestJS AuthGuard + module imports**: a controller using `@UseGuards(AuthGuard)` makes
  Nest instantiate AuthGuard in THAT module's context, so the module MUST import AuthModule
  (exports AuthGuard + SupabaseService). Missed by tsc/unit tests/scoped DI probe; only a
  real full-app bootstrap (deploy) catches it. -> `reference_nest_authguard_module_import`.
- **murror-api mutable-tag deploy**: `0.x.0-staging` + imagePullPolicy Always -> a
  crash-looping pod auto-recovers when the fixed image is repushed, but the Deploy CI job
  may report "failure" because its rollout-wait times out before recovery. Check the pod,
  not just CI.
- **Merge conflicts**: staging advanced under both branches (redemption-codes backend +
  posthog/locale web from other sessions). Resolved unions by hand, validated.

## NOT done — activation gated on Astro (2 steps)
1. RevenueCat: create the family product (offering id containing `family` + annual
   package) + set price; set `REVENUECAT_FAMILY_PRODUCT_ID` on staging. Lights up the
   paywall card + webhook + seats.
2. Email provider (rec Resend): wire a real adapter behind `ParentalConsentEmailPort` so
   parents actually receive the consent email (today a logged stub; staging E2E can read
   the link from pod logs).
Plus pre-prod: attorney finalizes ToS/Privacy + the C1/C2/C3 live-site fixes; Vault/Cortex/
Shield handoffs (per-minor hard-delete on withdrawal, suppress analytics SDKs for minor
accounts, MHMD determination); the per-recipient suggestion table for "connect with the rest";
prod Statsig/RevenueCat config.
