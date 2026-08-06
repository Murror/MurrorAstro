# Murror iOS 2.0 core-first production promotion design

**Status:** Approved direction, execution not yet authorized
**Decision date:** 2026-08-06
**Decision owner:** Astro
**Detailed execution plan:** [`../superpowers/plans/2026-08-06-ios-core-first-production-promotion.md`](../superpowers/plans/2026-08-06-ios-core-first-production-promotion.md)

## Decision

Launch Murror 2.0 on **iPhone first** with a deliberately narrow, core product surface. Do not promote build 418 as-is. Build 418 is the current staging defect-discovery build, not a production release candidate.

The production release becomes eligible only after:

1. Every in-scope P0 and P1 gate has objective evidence against one frozen candidate.
2. Existing backend reconciliation candidates preserve production-only history and produce the approved staging trees without overwriting either side.
3. The production non-Galaxy Prisma set and AI Flyway set are rehearsed against a restorable production snapshot, then the exact production-built migration digests are rehearsed again before runtime mutation.
4. A fresh `MurrorMobile` production-scheme binary is built from the same accepted mobile logic tree through the collision-safe build lane.
5. Astro explicitly approves each production-changing gate and the final App Store release.

This is a continuation of the approved incremental release lifecycle in [`2026-07-19-staging-to-production-readiness-design.md`](./2026-07-19-staging-to-production-readiness-design.md), narrowed to the launchable iPhone core.

## Why the current state is no-go

The following snapshot was refreshed from the owning repositories on 2026-08-06.

| Area | Current evidence | Release meaning |
|---|---|---|
| Mobile source | `origin/staging-environment-setup` = `fb0d8091115ad4f220539aecc7dbb57d9eb40ff1`, build 418 | Canonical staging source is known and bisectable. |
| Build 418 | Staging App Store Connect record is `VALID` | Upload processing passed. This is not functional release proof. |
| Premium entitlement | Paying subscriber can see locked content after navigation | **P0 blocker.** Core monetization cannot launch in this state. |
| Exact-candidate QA | Targeted tests and archive proof exist, but the full device, account, StoreKit, notification, and accessibility matrices do not | **Blocker.** Earlier or partial evidence cannot certify a new candidate. |
| Mobile E2E | No current successful exact-candidate E2E run | **Blocker.** A green PR check with skipped native smoke is not native lifecycle proof. |
| API branches | staging `74e2dd3c74537b70c396c8467863826cd3b4511e`; production `c554e893f884f5d456fd76ed90f6cc4c7aaa4647`; production-only 7, staging-only 417 | **Reconciliation gate.** A blind promotion could remove production hotfixes. |
| AI branches | staging `f12b63bcbf7e105a4c59e92c5e393b54e7112efe`; production `7cf2a11ee04c85c42a528b98f60def0d73495777`; production-only 10, staging-only 88 | **Reconciliation gate.** Production-only reliability fixes must survive. |
| API migrations | 28 staging-only migration files: 23 currently included and 5 Galaxy migrations excluded; one included JA clinical-content migration still carries an explicit fidelity/sign-off gate | **Database gate.** Astro must approve the JA migration or the fail-closed manifest must defer it before rehearsal. |
| Production runtime | API is live in SGP1; AI API, worker, beat, and daily cron use mutable short tags and are not proven on one immutable digest | **Provenance gate.** Branch names and tags do not prove what production is executing. |
| Production control plane | API/AI production environments lack enforced reviewers; required SGP1 identity inputs are missing; scheduled health monitoring is stale/disabled on the default branch | **Operations blocker.** Protected approval and read-only monitoring must work before production dispatch. |
| Production app record | 1.0.19 is live; 1.1.0 was rejected; older 2.0.0 builds are expired | A fresh 2.0.0 production binary and a resolved App Review packet are required. |
| Production configuration | Production env files are intentionally untracked; the current local production host needs an explicit canonical-host decision; app and extension deployment targets differ | **Archive gate.** The final binary must prove its baked environment, provider configuration, entitlements, and supported iOS range. |
| Notifications | Some physical APNs evidence exists, but the larger notification and Live Activity release contract is not fully closed | Transactional notifications require candidate-specific proof. Optional callbacks, daily-care paths, and all Live Activities stay dark. |
| Privacy and safety | Staging privacy hardening exists; production credential rotation, authenticated deletion proof, and fresh crisis evaluation remain open | **Approval gate.** These cannot be inferred from source or health checks. |

## Core-first release contract

### Included in 2.0 launch

- iPhone app only.
- English user experience only.
- Every authentication method visible in the final candidate, including logout, password recovery, account switching, and reinstall recovery.
- Onboarding from first launch to a usable home state.
- Text journal capture, processing, reflection, and AI/deep-chat continuation.
- Positive production proof that text AI/deep chat and Astro's chosen Solo hard-paywall or soft-paywall mode are active.
- Connection creation, invitation, two-account reflection, correct identity/pronouns, and removal behavior.
- Solo subscription purchase, entitlement refresh, restore, reinstall, account switch, manage subscription, and cancellation-state truthfulness.
- Account deletion, privacy controls, crisis-support behavior, and required legal/support links.
- Transactional notifications only when the exact production-equivalent candidate passes consent, foreground, background, killed-app, deep-link, duplicate, and cross-account tests.
- Accessibility for the included flows: VoiceOver, Dynamic Type, keyboard avoidance, contrast, reduce motion, and tap targets.

### Deliberately deferred and dark

- Duo sales and family-seat activation. Duo remains unavailable for the 2.0 core-first launch and gets a separate future release gate.
- Galaxy and its five excluded database migrations.
- Spots and experiments that are not required by the core journey.
- Moments quick share, Memory Room/callback-memory destinations, Orbital experiments, Council of Advisors, Relationship Next Steps, voice input/voice insights, and optional rating prompts.
- Japanese and Vietnamese user-facing launch. Additive localization data may be present only through the reviewed non-Galaxy migration manifest; the UI remains English-only.
- Callback pings, daily-care notifications, optional notification families, and notification settings actions without end-to-end proof.
- Every Live Activity and Dynamic Island/lock-screen surface, including chat progress, moment arrival, and private-photo variants.
- Web, Android, iPad, Apple Watch, and other platform launches.

Dark means the production candidate exposes no misleading control, upsell, deep link, notification, scheduler/provider, native entitlement, lock-screen surface, or App Store claim for the deferred capability. Release-scoping controls must have an owner and exit criterion. They cannot be used to conceal a broken in-scope feature.

## Release unit

A release is not just an IPA. The immutable release unit is one evidence packet containing:

| Component | Required frozen identity |
|---|---|
| Mobile | Frozen logic SHA, staging packaging SHA, production packaging SHA, and both globally unique build numbers; packaging diffs contain only the five script-owned build-number files |
| API | Locked staging content SHA, reconciled production merge SHA with the same tree, plus resolved runtime and migration GHCR digests |
| AI | Locked staging content SHA, reconciled production merge SHA with the same tree, one runtime digest pinned across API/worker/beat and any explicitly retained cron, plus one exact Flyway digest |
| Database | Snapshot identifier, checksum, Prisma and Flyway baselines/ledgers, exact Astro-signed include/exclusion manifest, clinical approval or deferral record, exact-digest rehearsal log, and recovery proof |
| Configuration | Separate secret-free staging and production archive contracts, canonical hosts, bundle IDs, provider app IDs, entitlements, minimum OS, feature availability, and rendered backend resource hashes |
| App Store | Version record, build, review notes, privacy/nutrition declarations, screenshots, support/legal URLs, manual release selection, and phased-release state |
| QA | Exact-candidate automated, simulator, physical-device, two-account, StoreKit, notification, accessibility, privacy, and crisis evidence |

If any frozen identity changes, the affected evidence is stale and must be rerun. A source health check, successful archive, or valid App Store upload proves only its own layer.

## Promotion lifecycle

```text
Scope lock
  -> blocker repair on staging trunks
  -> refresh backend reconciliation candidates
  -> staging source freeze
  -> snapshot rehearsal + automated/simulator proof
  -> staging TestFlight RC + physical-device proof
  -> backend Approval B1: merge/build while production is held
  -> exact production-digest rehearsal
  -> backend Approval B2: AI then API rollout
  -> production-scheme archive from the same mobile source
  -> App Review with manual release
  -> 7-day phased release
  -> post-launch closeout
```

### Gate A: Scope and safety approval

Astro signs the included/deferred surface, positive text-AI/deep-chat availability, Solo hard-versus-soft paywall mode, production host, supported iOS range, launch stop conditions, named on-call coverage, and credential-rotation completion. No production mutation is allowed before this record is complete.

### Gate B: Release-candidate approval

All mobile changes land by PR on `staging-environment-setup`. The build number is then selected only by `./scripts/ios-next-build.sh`, which must fail closed if App Store Connect cannot be checked. The generated five-file bump is committed on `chore/bump-build-${RELEASE_BUILD}` and merged only through a required compare-and-swap merge queue so concurrent reservations cannot both land. It is then verified on the remote trunk and archived as `MurrorMobileStaging`. The exact packaging SHA and staging archive contract must pass the complete release matrix.

Never hand-pick or hand-edit a build number. Never use `VERIFY_BUILD_LANE_ALLOW_DIRTY=1` for a release archive.

### Gate C: Backend and database approval

The existing API and AI reconciliation candidates must contain both production and staging ancestries while producing the exact approved staging trees. Reviewers prove they preserve Stripe billing portal behavior, onboarding pass-through, AI reliability fixes, and every other production-only change. Production merges and later ancestry-restoring back-merges use merge commits.

The API production migration image must select `production-non-galaxy`, use the exact signed manifest in `scripts/release/production-migration-set.json`, exclude the five Galaxy migrations plus only an explicitly signed JA deferral, run privacy deletion preflight after Prisma migration, and fail closed on any unknown migration. The AI Flyway image must validate checksums and never silently run or ignore `repair`.

Approval B1 permits merge/build only while all production environments remain held. Reviewers resolve full runtime and migration digests, rehearse those exact bytes, and confirm current/candidate compatibility on pre- and post-migration schemas. Approval B2 then permits the already-held non-cancellable workflows to deploy AI first and API second. Runtime specs use digests, not mutable short tags. Direct production SQL, out-of-band Prisma/Flyway migration, direct image mutation, and branch fast-forward shortcuts are forbidden.

### Gate D: Production binary and App Review approval

The final binary is a fresh `MurrorMobile` production-scheme archive made from the accepted staging RC logic. The production packaging SHA may differ from the staging packaging SHA only in the five script-owned build-number files. The production archive gets its own collision-safe build number through the full shared build lane and is checked against the separate production archive contract.

Before upload, verify:

- app and every embedded extension share the build number and marketing version;
- baked API/AI/web hosts match the approved manifest;
- no staging, alpha, localhost, placeholder OAuth, or debug provider value remains;
- bundle IDs, associated domains, push entitlements, RevenueCat, OneSignal/APNs, signing team, privacy manifest, and deployment targets match production;
- archive source and dependency lockfiles match the frozen release manifest;
- Hermes symbolication is working, or Astro has explicitly accepted a documented crash-triage alternative.

App Store submission uses **manual release**. The prior 1.1.0 rejection reason must be explicitly resolved in review notes or metadata before submission.

### Gate E: Release approval

After App Review approval, Astro performs one production smoke pass while the version remains held for manual release. The release starts only with on-call coverage, live dashboards, support macros, known-issue ownership, and tested pause/hotfix paths.

Use Apple's seven-day phased release percentages: **1%, 2%, 5%, 10%, 20%, 50%, 100%**. Hold each phase until its evidence window is complete. Apple permits pausing a phased release for up to 30 cumulative days, while manual downloads can still receive the update. See [Release a version update in phases](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases) and [Select an App Store version release option](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/select-an-app-store-version-release-option).

## Rollback model

| Layer | Recovery model |
|---|---|
| iOS binary | Pause phased release, disable only pre-approved optional capabilities, publish support guidance, and cut a new build through the full lane. Apple does not provide binary rollback. |
| API and AI images | Roll back only to pre-recorded immutable digests when the deployed schema is backward-compatible. Use protected workflows, restore AI API/worker/beat/cron together, and reapply the prior digest-pinned CronJob manifest because a CronJob has no rollout revision. |
| Database | Fix forward from a verified snapshot and migration ledger. Do not automatically reverse DDL or restore over new user writes. A restore is a separately approved incident action. |
| Remote configuration | Change only pre-approved release-scoping controls with an audit record. Do not mask a broken core feature. |
| CodePush | Use only for a rehearsed JavaScript-only incident whose native contract is unchanged. It is not the default recovery path. |

Any authentication loop, paid-user lockout, charge without entitlement, cross-account data exposure, privacy/deletion failure, crisis-safety failure, or data corruption triggers an immediate release pause and incident response. Numeric alert thresholds must be approved from the pre-launch baseline before Gate E; the plan does not invent them.

## Completion criteria

The core-first iOS launch is complete only when:

- the 2.0 production version reaches 100% phased release or Astro explicitly ends the rollout at a recorded decision;
- release and rollback manifests identify every deployed source, image, build, migration, public configuration hash, and restricted secret-version attestation;
- no P0/P1 launch incident remains open;
- entitlement, auth, journal/AI, connection, deletion, crisis, and notification evidence is retained with the exact build;
- support and analytics confirm the launch cohort is observable without exposing sensitive wellness content;
- deferred features remain truthfully unavailable and have separate future release plans;
- the production-to-staging ancestry and post-release handoff are updated so the next session continues from reality.

## Non-goals

- This design does not authorize a production deploy, database write, TestFlight upload, App Review submission, or App Store release.
- It does not declare staging ready because source checks, health endpoints, CI, archive, or App Store processing passed independently.
- It does not expand the launch to web, Android, Galaxy, localization, Duo, voice, experimental surfaces, or the full notification/Live Activity program.
- It does not replace existing code or release machinery. It extends the current trunks, workflows, manifests, runbooks, and evidence model.
