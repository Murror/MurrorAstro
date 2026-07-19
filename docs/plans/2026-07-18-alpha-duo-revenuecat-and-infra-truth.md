# Alpha Duo: RevenueCat purchases live + the "Alpha = dev" infra truth (2026-07-17 → 2026-07-18)

Continues `2026-07-16-together-plans-and-cost-truth.md` (Duo backend PR #605 + cost pipeline).
This doc covers the **mobile Duo Milestone B builds**, the **RevenueCat store setup**, and a
**material infrastructure correction** that cost ~an hour and is now guarded in memory.

## What shipped

### Mobile Duo Milestone B (MurrorMobile, dev scheme, flag-dark)
Sequence of Alpha TestFlight builds off `staging-environment-setup`:
- **174** (2026-07-17, PR #755) — first Duo UI: picker, invite screen, joined pop-up, Settings stop-sharing.
- **338** (2026-07-17, PR #758, `d4f46774`) — crash fix: `getFamilyPlan` returned the murror-api
  `{status,data,meta}` envelope typed as `FamilyPlanView`, so the joined-popup's `plan?.seats.find()`
  threw on Home under the navigation error boundary (alpha-only; Duo resolves ON only when
  `Config.ENV==='development'`). Fix unwraps `.data` in the family-plan client + guards `Array.isArray`.
- **340** (2026-07-17) — stale plan card: cold-start refresh skipped under the hard-paywall gate;
  added `useFocusEffect` refresh so Settings reflects the server truth.
- Device-feedback rounds (PRs #761/#764/#768): joined pop-up restyled to the visual language;
  Settings subscription card redesigned (night-sky backdrop, no stock photo, no butterfly left icon);
  "Stop sharing" moved to the right of the row, avatar removed; Manage Subscription made honest on
  alpha and when not sharing.
- **346** (2026-07-18, PR #778 + bump #779) — **real RevenueCat sandbox purchases on Alpha**:
  - `config/purchases.ts`: dropped the blanket `development` skip in `initializePurchases`
    (emulator skip stays), so dev devices configure RC against the MurrorDev project.
  - `subscription-purchase-policy.ts`: dev returns `'purchase'` when an offering loaded,
    `'development_bypass'` only without one (simulator / no sandbox login).
  - `subscription-screen.tsx` + `use-subscription-prices.ts`: offerings load in dev; a failed dev
    load stays silent (placeholders + bypass), staging/prod alerting unchanged.
  - **Duo matcher fix** (`use-subscription-prices.ts`): real RC custom packages report
    `packageType: 'CUSTOM'` with identifiers `$rc_custom_duo_{monthly,yearly}`; the old
    `packageType === 'ANNUAL'` matcher could NEVER find them in a live offering. New
    `isDuoYearlyPackage` accepts `ANNUAL|CUSTOM` and takes yearly-ness from the identifier.
  - `upgrade-sheet-host.tsx`: owns the Duo BUY step — `Purchases.purchasePackage` →
    `handleSuccessfulPurchase` → `planState.refresh()` → invite screen `{awaitPlan:true}`. Cancel is
    a quiet no-op; failure alerts; the invite screen never opens for an unbought plan.
  - `together-duo-invite-screen.tsx`: `awaitPlan` param polls the webhook-born plan into view
    (2.5s, bounded 30s) instead of showing a fresh buyer the no-plan state.
  - Verified: tsc + eslint clean, **53 tests green / 9 suites** (4 new host purchase-path tests,
    2 new CUSTOM-matcher tests, 1 policy test). Sentinel adversarial review = SHIP.

### murror-api (Together plan payload)
- `feat/plan-kind-payload` (`b8b107c9`, deployed to dev as `staging-effdd8a`): adds
  `planKind`/`planRole`/`planCompanions`/`cancelAtPeriodEnd` to the freemium plan payload via
  `PlanMembershipResolver`, which the Settings card selector consumes.

### RevenueCat store setup (project MurrorDev `projb32bb370`)
- Two iOS Duo products created — `prodb07985e104` (`app.murror.premium.duo.monthly`),
  `prod38d9a0a191` (`app.murror.premium.duo.yearly`) — attached to the Premium entitlement
  `entl3387fa201b` and to custom packages `$rc_custom_duo_monthly` (`pkgebd920b0beb`) /
  `$rc_custom_duo_yearly` (`pkgedf767e2e32`) in the current offering `ofrng0dae26ae69`.
- App Store Connect subscriptions for the same IDs reached `READY_TO_SUBMIT` (localizations, USA
  prices $12.99/$89.99/$19.99/$149.99, availability, review screenshots) via the ASC API.
- **Earlier RC work in the PROD project `proj80c909dc` was the WRONG project and is orphaned.** Its
  `$rc_custom_duo_yearly` still sits in the live prod offering — a launch-gate risk (see below).

### Seat map corrected on the real dev backend
- The dev deployment (`nsp-dev-murror`, sfo2) carried a seat-map env with **phantom** ids
  (`app.murror.mobile.duo.*`). Corrected via `kubectl set env deployment/murror-api` to
  `app.murror.premium.duo.monthly:2,app.murror.premium.duo.yearly:2` and rolled out. Image
  `staging-effdd8a` carries the `resolveFamilySeatCount` code. `REVENUECAT_PROJECT_ID=projb32bb370`
  confirmed on dev.

## 🚨 Infrastructure correction ("Alpha" is not sg3)

Chasing a "seat map deploy" hit a broken kubectl cert on cluster `sg3` and burned time. Root cause:
the `alpha-testing-guide` skill doc describes a **dead** environment.

- The mobile Alpha app (dev scheme, `.env.development`) talks to **`dev.api.murror.app`** =
  namespace **`nsp-dev-murror`** on **`do-sfo2-murror-cluster`** (DigitalOcean, alive, HTTP 200).
- **`sg3`** (self-managed OVH, `15.235.211.39`), its `nsp-alpha-murror` namespace, and
  `alpha.murror.api.ambercare.app` (**HTTP 000**) are **retired since 2026-03-20**. The sg3
  kubeconfig CA cert on this Mac is also malformed (`unmarshal elliptic curve point`).
- RC project `projb32bb370` is **shared by dev AND staging** (`nsp-staging-murror` also sets it).
- Captured in memory: new `reference_alpha_env_decoder.md`, plus corrections to
  `reference_infra_key_facts.md`, `reference_environment_urls.md`, `feedback_subscription_bypass.md`.

## Open items / gates
1. **RC webhook points at the dead `ambercare.app` host** → real purchases reconcile nowhere. Fix =
   ADD a webhook → `https://dev.api.murror.app/api/v1/subscription/webhooks/revenuecat` (dev has its
   own `REVENUECAT_WEBHOOK_SECRET`); additive since `projb32bb370` is shared with staging. Astro-gated.
2. **Prod launch gate**: `startDuoPurchase` is not env-gated; the orphaned `$rc_custom_duo_yearly` in
   the PROD offering means flipping `ENABLE_TOGETHER_DUO` in prod would charge real users before the
   prod webhook→FamilyPlan pipeline exists. Never flip the prod Duo gate until that is verified.
3. **`alpha-testing-guide` skill file** still documents the dead sg3 env — needs correcting at source.
4. Astro: create a Sandbox Apple ID + sign in on device to test the sandbox purchase.

## Verification
- Mobile: tsc/eslint clean, 53 targeted tests, sentinel review, archive content gates (bundle
  `app.murror.mobile.dev`, dev API present, zero staging leakage, RC key baked, build# 346 across app
  + both extensions), `Uploaded MurrorMobileDevelopment`.
- Backend: seat map read back from the deployment spec after rollout; `REVENUECAT_PROJECT_ID` +
  liveness of `dev.api.murror.app` (200) vs `alpha.murror.api.ambercare.app` (000) confirmed by curl.
