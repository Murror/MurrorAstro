# iOS production launch readiness, August 11-13, 2026

## TL;DR

Murror's iOS source became materially safer across builds 430 and 431, but there
is still no current-source production-distribution candidate.

- **Build 431 is valid on TestFlight only for Murror Beta**, bundle
  `app.murror.mobile.stg`, App Store Connect app `6741769645`.
- **The public production app is still 1.0.19 (build 5)**. Build 430 is the
  newest upload for Murror AI, bundle `app.murror.mobile`, App Store Connect app
  `6741769381`, and is attached to no version.
- **Build 431 predates two required source repairs**: the RCT-Folly lock receipt
  repair in PR #1102 and the refreshed runtime/release contracts in PR #956.
- **The next candidate must be cut from canonical
  `staging-environment-setup`**, after both repairs land, using
  `scripts/ios-next-build.sh`. It must not reuse or manually choose a number.

The correct launch verdict remains **NO-GO**. Source hardening is moving forward;
signed-artifact, physical-device, provider, production-deployment, App Store,
clinical, privacy, and product-policy evidence remain separate gates.

## What changed

### Mobile source and release lane

Between August 11 and 13, the mobile staging trunk landed the following release
work:

| Area | Evidence | Result |
|---|---|---|
| Release provenance | PRs #1080, #1081, #1085, #1101 | Added lane checks and anchored builds 430 and 431 in canonical source. |
| Widgets and Live Activities | PRs #1079, #1095 | Raised extension deployment floors and hardened media/state handling. |
| Account and credential isolation | PRs #1086, #1089 | Prevented deferred routes and shared app-group refresh tokens from crossing accounts or environments. |
| Consent and crisis safety | PRs #1094, #1099, #1100 | Added a pre-transmission AI consent gate, severe-result crisis resources, and accurate storage/provider copy. |
| Accessibility | PR #1098 | Improved Dynamic Type and large-text behavior in release-critical surfaces. |
| Android privacy and telemetry | PRs #1087, #1088 | Decoupled Sentry configuration and removed advertising-ID collection. |
| Regression and dependency controls | PRs #1074, #1092, #1096 | Added CI baselines, protected the intentional takeaway-audio removal, and pinned the accepted OSV advisory baseline. |
| App Store visibility | PR #1093 | Added a submission-state monitor, but its schedule is not active until the workflow is present on GitHub's default branch. |

Build 431 carries the consent, crisis-resource, consent-copy, and App Store
monitor source changes. It is useful staging-device evidence, but it cannot be
promoted or submitted as the production app because its bundle identifier is
different.

### Backend and privacy work

The same period also closed important server-side source and runtime risks:

- `murror-api` landed family-seat entitlement handling, a placeholder-entitlement
  safety gate, a production WebSocket authentication hotfix, source
  reconciliation, and safe organic-attribution handling.
- `viasr-api` landed authenticated private TTS, notification hardening,
  serialized deployment controls, and request/response body-log privacy
  controls.
- The backend tightened row-level access on seven personal-data tables and
  separated AI-training consent from deletion intent. Runtime checks found no
  permissive `USING(true)` policy on the scoped tables and preserved all eight
  existing consent decliners.

These are meaningful launch inputs, but source presence does not prove every
change is deployed to production. In particular, the `viasr-api` production
deployment failed closed because the kubeconfig context name did not match the
hardcoded guard. Production request/response body logging therefore remains an
open gate.

### Public content

Two new relationship guides are live in English, Vietnamese, and Japanese:

- `https://murror.app/resources/how-to-remember-what-people-tell-you`
- `https://murror.app/resources/how-to-help-a-friend-through-a-breakup`

They are public content additions, not evidence of a new app capability or a
public iOS release.

## Bugs and root causes found

### 1. The tracked CocoaPods receipt drifted

A clean production-configuration build exposed a one-line RCT-Folly checksum
drift in `ios/Podfile.lock`. The pod version did not change; the tracked receipt
was stale. The deterministic repair is PR #1102.

Why it matters: a locally repaired checkout can build while canonical source
still cannot. Any archive created before the repair lands lacks exact-source
provenance and must not be relabeled as the candidate.

### 2. A green old PR had become semantically stale

PR #956 originally passed on an August 12 merge base while still requiring a
takeaway-audio path that PR #1092 later removed intentionally. GitHub reported a
clean textual merge, but current staging plus the old contract would fail by
construction.

The refresh removed the obsolete contract, preserved the newer behavior, and
added current-base runtime contracts, a production-host guard, build-lane
checklist coverage, Metro provenance, and a fail-closed Hermes dSYM attachment
helper. The helper verifies both the official artifact SHA-256 and the archive
binary UUID, including negative tests for downloaded and cached corruption.

### 3. "Staging branch" and "production app" were being conflated

`staging-environment-setup` is the canonical source branch for the iOS release
lane. The production scheme inside that branch is `MurrorMobile`, bundle
`app.murror.mobile`. The existing Build 431 archive and TestFlight upload used
`MurrorMobileStaging`, bundle `app.murror.mobile.stg`.

The branch name describes the source-integration lane; the scheme and bundle
identify the product artifact. All three must be recorded separately.

### 4. The App Store monitor is configured but not scheduled

The four App Store Connect repository secrets now exist. However, GitHub's
default branch is `main`, and `asc-submission-monitor.yaml` exists only on
`staging-environment-setup`. Scheduled workflows register from the default
branch, so the monitor is available as source but is not watching automatically.

### 5. Build-number collision protection had a silent dependency failure

The App Store query inside the build-number path previously lacked its Python
dependencies and fell back to git-only numbering. Before Build 431 was bumped,
the environment was repaired and the number was checked against live App Store
Connect. Future cuts must continue to prove both canonical-git and live-Apple
inputs before changing any of the 30 version sites.

## Verification approach

The audit deliberately kept each proof tier separate:

| Proof tier | Current evidence | What it does not prove |
|---|---|---|
| Source | Canonical merge SHAs, current-base PR diffs, lock receipt, runtime contracts | A signed artifact or deployment |
| Automation | Unit, contract, JS bundle, Android, and hosted iOS jobs | Physical-device behavior or App Review acceptance |
| Staging artifact | Build 431 is TestFlight `VALID` for Murror Beta | Production bundle, distribution candidate, or submission |
| Production App Store | Live 1.0.19 build 5; newest production upload 430 unattached; 1.1.0 rejected | Readiness of the next source candidate |
| Runtime | Production health and scoped database-policy checks | Exact deployment SHA, rollback, every user flow, or provider delivery |

For the next candidate, the minimum evidence chain is:

1. Merge PR #1102 after its hosted iOS check passes.
2. Merge current staging into refreshed PR #956 and rerun all required checks.
3. Merge PR #956 only on exact-current-base green evidence.
4. Run `scripts/ios-next-build.sh` from a clean isolated worktree.
5. Land the generated bump by PR before any archive work.
6. Verify the bump commit is present on remote
   `staging-environment-setup`, then run `scripts/verify-build-lane.sh`.
7. Attach the verified Hermes dSYM to the archive.
8. Treat distribution signing, upload, physical-device testing, and submission
   as explicit later gates.

## Launch gates still open

### Engineering and artifact gates

- Production-distribution signing identity and production IPA.
- Exact final-candidate physical iPhone install and 1.0.19 upgrade path.
- StoreKit and RevenueCat subscriber-state matrix.
- APNs and OneSignal delivery across foreground, background, terminated, denied,
  and revoked states.
- Provider-side Hermes symbol ingestion and one symbolicated crash.
- Exact production deployment provenance and rollback for all required services.
- VoiceOver, Dynamic Type, and supported-locale device passes.

### App Store, safety, and owner gates

- Resolve the 127-day `UNRESOLVED_ISSUES` submission and the 1.1.0 rejection in
  Resolution Center.
- Create and populate the 2.0.0 App Store version, screenshots, release notes,
  privacy labels, age rating, and review credentials.
- Reconcile privacy-policy statements and add an in-app consent-withdrawal path.
- Obtain clinical approval for PHQ-9 severity bands, item 9 crisis signaling, and
  localized crisis resources before reopening Vietnamese or Japanese app UI.
- Decide how to handle 2,813 placeholder premium entitlements.
- Keep English-only launch and Duo delay unless Astro explicitly reopens scope.

## Tracking-page reconciliation

The two Claude artifacts represent the same launch objective at different zoom
levels:

- The production launch artifact is the cross-stack dependency map.
- The iOS launch board is the detailed evidence ledger for mobile source,
  artifact, device, provider, and App Store gates.

They should remain separate views but share one set of facts. The production
artifact should say that Build 431 is valid for the staging/Beta app, not the
production app, and that the App Store monitor has credentials but no active
schedule. The iOS board should link the broader clinical, privacy, entitlement,
and backend owner gates rather than silently treating them as green.

## Public-progress decision

No investor-facing progress-timeline entry should be added for this period.
Build 431 is not public and predates current required source repairs. The privacy
and infrastructure changes are intentionally excluded from the public timeline,
and the two relationship guides are content additions rather than a new product
capability.
