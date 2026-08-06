# Murror iOS 2.0 Core-first Production Promotion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Use fresh specialist agents for independent workstreams and require review before every high-cost build or production gate.

**Goal:** Promote one evidence-backed, English, iPhone-only Murror 2.0 core release from staging to production without losing production-only fixes, exposing deferred features, colliding iOS build numbers, or treating partial staging proof as launch proof.

**Architecture:** Continue the existing MurrorMobile, murror-api, and viasr-api trunks and protected workflows. Refresh the existing backend reconciliation candidates until each retains production and staging history while producing the exact tested staging tree. Then freeze one source/configuration manifest, cut a staging TestFlight release candidate through the single iOS build lane, prove it on physical devices, deploy backward-compatible production services through approved workflows, create a fresh production-scheme binary from the same approved mobile content, submit with manual App Store release, and advance through Apple's seven-day phased rollout.

**Tech Stack:** React Native, TypeScript, Swift, Jest, Appium/WebdriverIO, Xcode, TestFlight, App Store Connect, RevenueCat/StoreKit, OneSignal/APNs, NestJS, Prisma, PostgreSQL, FastAPI, Celery, GitHub Actions, GHCR, Kubernetes, Sentry, PostHog, and privacy-safe support telemetry.

## Global Constraints

- This document is an execution plan, not authorization to mutate production, rotate credentials, upload a production binary, submit to App Review, or release the app.
- Preserve the ship order: **iOS first, then web, then mobile/Android**. Web and Android remain outside this launch.
- Work only in isolated worktrees cut from freshly fetched owning remote trunks. Never switch branches inside a shared checkout.
- Continue existing code and release machinery. Make small reviewed changes; do not replace working subsystems.
- MurrorMobile changes target `staging-environment-setup`; murror-api and viasr-api changes target `staging`.
- Fetch and compare the owning remote trunk, `origin/staging-environment-setup` for mobile and `origin/staging` for API/AI, before every claim, review, PR, build, or promotion. Local branch state is not release truth.
- Never hand-pick, hand-edit, or `sed` an iOS build number. Use `./scripts/ios-next-build.sh`, merge the bump PR, fetch the remote trunk, run `./scripts/verify-build-lane.sh`, then archive.
- Never use `VERIFY_BUILD_LANE_ALLOW_DIRTY=1` for a release artifact.
- Never run a production migration, SQL patch, seed, secret change, feature activation, image mutation, or workflow dispatch without Astro's explicit gate approval.
- Prisma migrations run only through the protected API workflow with `MURROR_MIGRATION_PROFILE=production-non-galaxy`; Flyway migrations run only through the protected AI workflow. Direct `prisma migrate deploy`, direct Flyway invocation against production, `psql`, or Supabase Studio changes are forbidden.
- Do not print, copy into docs, commit, or expose secret values. Evidence records key names, non-secret configuration hashes, resource versions, and redacted identifiers only.
- A health endpoint, source check, CI pass, simulator run, archive, upload, or App Store `VALID` state proves only its own layer.
- Any mobile, backend, migration, environment, provider, entitlement, notification, privacy, or safety change invalidates the affected candidate evidence. Rerun the gate rather than carrying evidence forward.
- Deferred features must be dark in UI, paywall copy, onboarding, schedulers, providers, deep links, screenshots, metadata, and App Review notes. A release flag cannot conceal a broken in-scope feature.
- Before every TestFlight archive, production PR merge, production workflow dispatch, and App Store release, dispatch parallel domain reviewers and resolve their findings first.

---

## Current Release State

**Decision:** `NO-GO` as of the 2026-08-06 evidence refresh.

| ID | Gate | Current state | Exit condition |
|---|---|---|---|
| MOB-01 | Paid entitlement and locks agree | **BLOCKED:** build 418 can show Premium while content is locked | One canonical paid derivation passes cross-surface tests and exact-device recovery scenarios |
| MOB-02 | Auth and account isolation | **NOT RUN on exact candidate** | Every visible provider plus logout, reinstall, recovery, and account switch passes |
| MOB-03 | Keyboard and composer stability | **BLOCKED:** note/composer can be hidden or dismissed | Cursor, typed text, focus, and composer remain usable through rerenders and keyboard transitions |
| MOB-04 | Connection role and pronoun correctness | **BLOCKED:** wrong pronoun/stored prompt behavior reported | Server source and client rendering agree for both roles, with two-account proof |
| MOB-05 | Accessibility and visual legibility | **BLOCKED:** zodiac contrast and exact-candidate accessibility are open | VoiceOver, Dynamic Type, Reduce Motion, contrast, keyboard, safe area, and target checks pass |
| MOB-06 | Production archive configuration | **BLOCKED:** untracked env must be sealed; OAuth/placeholders and deployment-target compatibility are unproven | Secret-free production manifest and archive inspection pass |
| QA-01 | Hosted current-candidate E2E | **BLOCKED:** no current green release run | `e2e.yaml` passes after harness failures are fixed, never skipped |
| QA-02 | Physical-device matrix | **NOT RUN** | Two physical iPhones and five test accounts, one existing paid plus four disposable, pass the core matrix |
| PAY-01 | Solo StoreKit/RevenueCat | **NOT RUN on exact candidate** | Purchase, restore, reinstall, manage, cancellation, double-tap, and account switching converge |
| NOTIF-01 | Transactional notifications | **PARTIAL** | Consent, delivery, dedupe, routing, and cross-account privacy pass on the exact build, or notifications are removed from launch scope |
| SAFE-01 | Crisis safety | **BLOCKED:** fresh eval absent | Current eval and physical-flow evidence pass with correct resources |
| PRIV-01 | Account deletion and privacy | **PARTIAL staging evidence** | Authenticated candidate request, local cleanup, server receipt, and backend completion evidence pass |
| API-01 | API reconciliation | **BLOCKED:** production-only 7, staging-only 417 at refresh | PR #689 contains both ancestries, produces the exact tested staging tree, and preserves Stripe/onboarding behavior |
| AI-01 | AI reconciliation and provenance | **BLOCKED:** production-only 10, staging-only 88; live workloads use split tags | Reconciliation contains both ancestries, produces the tested staging tree, compatibility passes, and API/worker/beat/cron use one approved digest |
| DB-01 | Non-Galaxy migration rehearsal | **BLOCKED:** exact production-snapshot rehearsal absent | The exact Astro-signed include/exclusion manifest passes clone rehearsal and recovery checks |
| SEC-01 | Exposed production DB credential | **BLOCKED unless a current rotation receipt proves closure** | Astro-approved rotation updates every consumer and passes canary; old credential is unusable |
| ASC-01 | App Store readiness | **BLOCKED:** prior 1.1.0 rejection unresolved; no fresh production 2.0 binary | Review packet, agreements, Solo IAP, privacy data, production build, manual release, and phased release are ready |
| OPS-01 | Monitoring, support, and rollback | **BLOCKED:** thresholds and launch coverage not signed | Alerts are test-fired; thresholds, support paths, immutable rollback digests, and owners are approved |

### Current Frozen Observations

These values are starting evidence, not values to assume later:

| Component | 2026-08-06 observation |
|---|---|
| Mobile | `origin/staging-environment-setup` = `fb0d8091115ad4f220539aecc7dbb57d9eb40ff1`, build 418 |
| API staging | `74e2dd3c74537b70c396c8467863826cd3b4511e` |
| API production | `c554e893f884f5d456fd76ed90f6cc4c7aaa4647` |
| AI staging | `f12b63bcbf7e105a4c59e92c5e393b54e7112efe` |
| AI production | `7cf2a11ee04c85c42a528b98f60def0d73495777` |
| API migrations | 28 staging-only files: 23 production-included, 5 Galaxy-excluded |
| App Store | Staging build 418 is valid; production 1.0.19 is live; 1.1.0 is rejected; old 2.0.0 builds are expired |
| Production ingress | Public probes were green at inspection; current SGP1 DNS resolved to `129.212.209.109`; scheduled monitoring was still stale/disabled |

If any value changes, refresh the dossier before continuing.

---

## Master Gate Checklist

- [ ] Gate 0: Astro signs the core-first scope, dark-surface matrix, positive text-AI/deep-chat contract, Solo hard-versus-soft paywall mode, target iOS range, canonical production hosts, launch owners, threshold-setting method, and zero-tolerance conditions.
- [ ] Gate 1: Release tooling fails closed on the real branch, env, build lane, and archive rules.
- [ ] Gate 2: All in-scope P0/P1 fixes merge to staging trunks with regression tests and specialist review.
- [ ] Gate 3: Existing API and AI reconciliation candidates preserve both ancestries, produce the exact tested staging trees, and staging runs those tested sources.
- [ ] Gate 4: The signed Prisma/Flyway sets pass protected clone rehearsal, then the exact production-built migration digests pass again between B1 and B2; Galaxy and any unapproved JA migration remain excluded.
- [ ] Gate 5: One frozen staging backend and mobile source pass automated, hosted, simulator, and archive gates.
- [ ] Gate 6: One processed staging TestFlight RC passes the complete physical-device, account, StoreKit, notification, accessibility, privacy, and crisis matrix.
- [ ] Gate 7: Astro approves and the production database credential rotation is completed and soaked, if not already proven complete.
- [ ] Gate 8: Astro Approval B1 permits merge/build while production stays held; exact digests rehearse green; Approval B2 permits AI then API rollout; old app 1.0.19 remains compatible after each layer.
- [ ] Gate 9: A fresh production-scheme binary passes the build lane, archive audit, and production TestFlight smoke matrix.
- [ ] Gate 10: App Review packet is complete; Astro approves submission with manual release and phased rollout selected.
- [ ] Gate 11: Sentinel, Atlas, and Astro sign `GO`; Astro manually releases; daily evidence stays green through 100%.
- [ ] Gate 12: Post-launch records, back-merges, deferred scope, and handoffs are closed without starting web or Android promotion.

---

### Task 1: Open the immutable release dossier

**Files:**

- Create: `docs/releases/ios-2.0.0/release-manifest.md`
- Create: `docs/releases/ios-2.0.0/release-lock.json`
- Create: `docs/releases/ios-2.0.0/archive-contract.staging.json`
- Create: `docs/releases/ios-2.0.0/archive-contract.production.json`
- Create: `docs/releases/ios-2.0.0/scope-matrix.md`
- Create: `docs/releases/ios-2.0.0/qa-matrix.md`
- Create: `docs/releases/ios-2.0.0/launch-thresholds.md`
- Create: `docs/releases/ios-2.0.0/rollback-manifest.md`
- Create: `docs/releases/ios-2.0.0/go-no-go.md`
- Create: `docs/releases/ios-2.0.0/launch-log.md`
- Update at milestones in the shared Murror checkout, after reconciling concurrent edits: `docs/CODEX-HANDOFF.md`

**Step 1: Refresh each owning remote, read-only**

```bash
cd /Users/astro/Projects/murror-transfer/Murror/MurrorMobile
git fetch origin staging-environment-setup
git log -1 --format='%H %s %cI' origin/staging-environment-setup

cd /Users/astro/Projects/murror-transfer/Murror/murror-api
git fetch origin staging production
git rev-parse origin/staging origin/production
git rev-list --left-right --count origin/production...origin/staging

cd /Users/astro/Projects/murror-transfer/Murror/viasr-api
git fetch origin staging production
git rev-parse origin/staging origin/production
git rev-list --left-right --count origin/production...origin/staging
```

Expected: commands succeed and the newly observed values replace the starting snapshot in the dossier. A changed value is not a failure; continuing with stale evidence is.

**Step 2: Record immutable and privacy-safe evidence fields**

Each dossier row records `NOT RUN`, `PASS`, `FAIL`, `BLOCKED`, `DEFERRED`, or `ACCEPTED WATCH ITEM`, plus owner, PDT timestamp, exact source/build/image, command or flow, evidence link, and expiry rule. Never paste secrets, raw journal text, names, email addresses, or production row content.

`release-lock.json` is the machine-readable source of truth for the mobile logic SHA; staging/production build-bump PRs, merge SHAs, and packaging SHAs; API/AI staging-content SHAs, logic-tree SHAs, production-merge/workflow SHAs, and resolved build-source SHAs; runtime and migration image digests; migration-set checksum; staging AI eval base URL; configuration hashes; and evidence run IDs. The dossier records the Git commit and externally computed SHA-256 of each signed lock revision.

The schema predeclares later fields as null. Gate 5 freezes all content/configuration fields. The two packaging tasks may fill only their packaging/App Store fields; Approval B1 may fill only production-merge SHAs, workflow SHAs, resolved build-source SHAs, held run IDs, resolved digests, and rendered-resource attestations. Filling an authorized null creates a new signed lock revision; changing any already populated field invalidates affected evidence.

The two environment-specific archive contracts contain final, non-secret values for schema version, release version, exact environment identity, app and extension bundle IDs, marketing version, allowed hosts, forbidden host patterns, provider public identifiers, signing team, entitlements, supported iOS range, and required archive members. Every key must be populated and Astro-signed. A staging archive is checked only against `archive-contract.staging.json`; a production archive is checked only against `archive-contract.production.json`.

**Step 3: Commit the dossier skeleton**

```bash
cd /Users/astro/Projects/murror-transfer/Murror/worktrees/codex-docs-unblock-20260805
git add docs/releases/ios-2.0.0
git commit -m "docs(release): open iOS 2.0 core-first dossier"
```

The live `docs/CODEX-HANDOFF.md` is currently an untracked shared coordination file, so update it in place without copying it into this worktree or overwriting concurrent content. Do not mark a gate `PASS` until its evidence exists.

---

### Task 2: Make the existing iOS release helper fail closed

The current helper still allows `main`, describes hand-edited versions, and points to legacy Fastlane commands. Correct it before any new archive.

**MurrorMobile files:**

- Create: `scripts/release/ios-release-contract.mjs`
- Create: `scripts/release/ios-release-contract.test.mjs`
- Create: `scripts/ios-next-build.contract.test.sh`
- Create: `scripts/ci/check-ios-build-reservation.mjs`
- Create: `scripts/ci/check-ios-build-reservation.test.mjs`
- Create: `.github/workflows/ios-build-lane.yml`
- Modify: `scripts/release/release-checklist.js`
- Modify: `scripts/ios-next-build.sh`
- Modify: `scripts/verify-build-lane.sh`
- Modify: `package.json`
- Modify: `docs/release/RELEASE_PROCESS.md`

**Umbrella documentation file:**

- Modify: `docs/runbooks/ios-build.md`

**Step 1: Write failing contract tests**

Cover these cases with fixture directories and injected command results:

- `staging-environment-setup` with a clean canonical tree is accepted.
- `main`, `master`, detached off-trunk content, a dirty release tree, or a tree that differs from the fetched canonical trunk is rejected by the script itself before any write; a warning is insufficient.
- Missing `.env.staging` or `.env.production`, `ios/ExportOptions.plist`, `ios/Pods`, or required environment key names is rejected without printing values.
- A build number not present on `origin/staging-environment-setup` is rejected.
- Any app/extension build-number disagreement is rejected.
- The next-build script queries all three App Store app records, follows pagination, and chooses `max(canonical git, local, App Store Connect) + 1`.
- Missing App Store credentials/dependencies, network/API failure, malformed responses, or an incomplete query make both dry-run and mutation modes fail closed; `asc=unchecked` is never release-eligible.
- Two concurrent bump PRs that select the same predecessor/next number cannot both pass the merge-group check; the second fails after the first reservation enters the target branch.
- A merge-group candidate must change exactly the five build-number files, advance from the target branch's current predecessor, remain greater than every App Store claim at check time, and contain no other source change.
- `verify-build-lane.sh` has no dirty-tree escape hatch or text advertising one. No code path offers manual build-number editing, `VERIFY_BUILD_LANE_ALLOW_DIRTY`, or legacy Fastlane as the release path.

Run:

```bash
yarn node --test scripts/release/ios-release-contract.test.mjs
yarn node --test scripts/ci/check-ios-build-reservation.test.mjs
bash scripts/ios-next-build.contract.test.sh
```

Expected: FAIL because the new contract module does not exist yet.

**Step 2: Implement the smallest integration**

Add `release:ios:preflight` to `package.json`. Make `release-checklist.js` call the pure contract and the build-lane verifier. Incrementally change `ios-next-build.sh` so non-canonical/dirty content and an unavailable App Store query fail before mutation, with the query testable through injected fixture responses. Remove the verifier's `VERIFY_BUILD_LANE_ALLOW_DIRTY` branch.

Add a required `pull_request` plus `merge_group` workflow with one non-cancelling iOS-reservation concurrency group. Its merge-group check performs compare-and-swap against the queue's current target-branch predecessor and rechecks App Store Connect. With Astro's approval, enable the merge queue and require this check for build-bump PRs; if the repository plan cannot enforce merge-time validation, Gate 1 remains blocked. Preserve `ios-next-build.sh` as the single writer of all build-number locations. Keep the existing CodePush decision path intact.

**Step 3: Remove contradictory documentation**

Both release docs must state the one authorized lane:

1. Land code on `staging-environment-setup` by PR.
2. Run `./scripts/ios-next-build.sh` from canonical content.
3. Commit the generated change on `chore/bump-build-${RELEASE_BUILD}`, PR it, and merge it only through the required compare-and-swap merge queue.
4. Fetch the remote trunk and run `./scripts/verify-build-lane.sh`.
5. Archive the intended scheme.

Remove instructions to hand-edit plist/pbxproj versions, release from `main`, or use `VERIFY_BUILD_LANE_ALLOW_DIRTY`.

**Step 4: Run focused and repository gates**

```bash
yarn node --test scripts/release/ios-release-contract.test.mjs
yarn node --test scripts/ci/check-ios-build-reservation.test.mjs
bash scripts/ios-next-build.contract.test.sh
yarn release:ios:preflight
yarn privacy:check-files
yarn lint
yarn type-check
```

Expected: tests pass; preflight fails safely until executed from a fully provisioned clean release worktree.

**Step 5: Review and commit by repository**

```bash
git add .github/workflows/ios-build-lane.yml scripts/ci/check-ios-build-reservation.mjs scripts/ci/check-ios-build-reservation.test.mjs scripts/release/ios-release-contract.mjs scripts/release/ios-release-contract.test.mjs scripts/ios-next-build.contract.test.sh scripts/ios-next-build.sh scripts/verify-build-lane.sh scripts/release/release-checklist.js package.json docs/release/RELEASE_PROCESS.md
git commit -m "fix(ios): enforce the canonical release lane"
```

Commit the umbrella runbook correction separately as `docs(ios): align the production build runbook`.

---

### Task 3: Freeze the core-first capability and promise matrix

**MurrorMobile files to inspect and extend, not replace:**

- `src/constants/feature-flags.ts`
- `src/utils/galaxy-variant.ts`
- `src/utils/galaxy-variant.spec.ts`
- `src/utils/together-duo-variant.ts`
- `src/utils/together-duo-variant.spec.ts`
- `src/utils/moments-variant.ts`
- `src/utils/moments-variant.spec.ts`
- `src/common/paywall-env.ts`
- `src/common/paywall-env.spec.ts`
- `src/components/upgrade-sheet-host.tsx`
- `src/components/upgrade-sheet-host.spec.tsx`
- `src/screens/setting/subscription-screen.tsx`
- `src/screens/setting/subscription-screen.spec.tsx`
- `src/config/one-signal.ts`
- `src/config/one-signal.spec.ts`
- `src/common/linking.ts`
- `src/common/linking.spec.ts`

**Live Activity owners that must be covered by the dark-surface contract:**

- `src/services/moment-live-activity.ts`
- `src/services/moment-live-activity.spec.ts`
- `src/screens/main/Journal/add-log-screen.tsx`
- `src/screens/main/Journal/input-accessory-view.tsx`
- `src/components/feed/use-pinned-feed.ts`
- `src/queries/memories-wall/use-memories-wall.ts`
- `ios/MurrorMobile/Info.plist`
- `ios/MurrorMobileStaging-Info.plist`
- `ios/AppWidgets/AppWidgetsBundle.swift`
- `ios/AppWidgets/MomentLiveActivity.swift`
- `ios/RNLiveActivityBridge.swift`
- `ios/RNLiveActivityBridge.m`
- `ios/MurrorLiveActivity/LiveActivityPhotoStore.swift`
- `ios/MurrorLiveActivity/MurrorMomentAttributes.swift`
- `ios/MurrorMobile.xcodeproj/project.pbxproj`

**Step 1: Write production-mode truthfulness tests first**

In production-mode fixtures, assert that Galaxy, Spots, Moments quick share, Memory Room/callback-memory destinations, Together Duo, Orbital experimental variants, Council of Advisors, Relationship Next Steps, voice input/voice insights, optional Live Activities, and non-transactional engagement pushes are unavailable.

Also assert:

- paywall and subscription screens advertise Solo only;
- the Astro-signed Solo hard-paywall or soft-paywall mode is active and consistent across mobile, API, and AI;
- primary text journal AI and deep chat are active in the production fixture even if a code default is off;
- hidden routes and notification types fail closed rather than opening a fallback private surface;
- no scheduler or provider registration remains active for a deferred feature;
- no chat, moment, or arrival Live Activity can start, update, or expose a lock-screen/Dynamic Island surface;
- English is the only launch language exposed;
- no production feature activation is required during the seven-day launch.

Run the focused tests and confirm at least one new assertion fails before implementation.

```bash
yarn jest --runInBand --runTestsByPath \
  src/utils/galaxy-variant.spec.ts \
  src/utils/together-duo-variant.spec.ts \
  src/utils/moments-variant.spec.ts \
  src/common/paywall-env.spec.ts \
  src/components/upgrade-sheet-host.spec.tsx \
  src/screens/setting/subscription-screen.spec.tsx \
  src/config/one-signal.spec.ts \
  src/common/linking.spec.ts
```

**Step 2: Apply minimal release-scoping changes**

Reuse existing production variant and environment patterns. Disable deferred Live Activities at both the JavaScript trigger and native capability/bridge boundaries while preserving account-cleanup behavior. Do not delete future feature code and do not hide MOB-01 or another in-scope defect behind a flag.

**Step 3: Capture external configuration without mutating it**

Export a key-and-variant-only snapshot of Statsig/PostHog/RevenueCat/OneSignal/App Store configuration into `scope-matrix.md`. Redact values that are secrets. The snapshot must positively prove text AI/deep chat and the signed Solo paywall mode are active, while every deferred surface is inactive. Source defaults alone are insufficient.

**Step 4: Run tests, review visible copy, and commit**

```bash
yarn jest --runInBand --runTestsByPath \
  src/utils/galaxy-variant.spec.ts \
  src/utils/together-duo-variant.spec.ts \
  src/utils/moments-variant.spec.ts \
  src/common/paywall-env.spec.ts \
  src/components/upgrade-sheet-host.spec.tsx \
  src/screens/setting/subscription-screen.spec.tsx \
  src/config/one-signal.spec.ts \
  src/common/linking.spec.ts
yarn copy-lint
yarn i18n-check
```

Expected: all focused tests pass and every visible production promise maps to an enabled, in-scope capability.

---

### Task 4: Close the mobile P0/P1 blockers with focused tests

Use separate small PRs when ownership differs. Each fix lands on `staging-environment-setup` before any release build-number bump.

#### Task 4A: Make paid entitlement one cross-surface truth

**Primary files:**

- `src/hooks/use-info-subscription.tsx`
- `src/config/subscription-service.ts`
- `src/screens/setting/settings-screen.tsx`
- `src/utils/subscription-card-state.ts`
- `src/store/plan-state.ts`
- `src/hooks/use-sync-plan-state.ts`
- `src/hooks/use-entitlement.ts`
- `src/common/plan-entitlement.ts`
- Create: `src/hooks/use-info-subscription.cross-surface.spec.tsx`

**Lock consumers to include in the regression:**

- `src/screens/main/Diary/diary-screen.tsx`
- `src/screens/main/Home/research-view.tsx`
- `src/screens/main/knowledge/knowledge-screen.tsx`
- `src/screens/main/knowledge/knowledge-screen-detail.tsx`
- `src/screens/main/Diary/relationship-detail-screen.tsx`
- `src/screens/main/Diary/orbital-reflection-detail.tsx`

**Backend invariants to preserve:**

- `murror-api/src/subscription/services/revenuecat.service.ts`
- `murror-api/src/subscription/services/revenuecat.service.spec.ts`
- `murror-api/src/subscription/subscription-access.ts`
- `murror-api/src/subscription/subscription-access.spec.ts`

1. Write a failing cross-surface test that starts with stale `FREE` plan projection, applies a positive RevenueCat/backend answer, then exercises focus, foreground, restore, and account switch. Settings and every in-scope lock must resolve paid without relaunch.
2. Trace the existing positive entitlement through the current stores and hooks. Extend `plan-entitlement.ts` or the existing canonical derivation; do not create a third entitlement source.
3. Do not widen backend `isSubscriptionPaidThrough`. Preserve the transfer propagation guard already merged on API staging.
4. Run:

```bash
yarn jest --runInBand --forceExit --runTestsByPath \
  src/hooks/use-info-subscription.cross-surface.spec.tsx \
  src/common/plan-entitlement.spec.ts \
  src/store/plan-state.spec.ts \
  src/hooks/use-sync-plan-state.spec.tsx \
  src/hooks/use-info-subscription.spec.tsx \
  src/hooks/use-info-subscription-routing.spec.tsx \
  src/config/subscription-plan-refresh.spec.ts \
  src/config/subscription-cache-freshness.spec.ts \
  src/config/subscription-service-account-race.spec.ts \
  src/utils/subscription-card-state.spec.ts \
  src/screens/setting/subscription-management-screen.spec.tsx \
  src/screens/setting/subscription-screen.spec.tsx \
  src/components/locked-card.spec.tsx \
  src/utils/freemium-lock-rules.spec.ts

cd /Users/astro/Projects/murror-transfer/Murror/murror-api
pnpm exec jest src/subscription/services/revenuecat.service.spec.ts src/subscription/subscription-access.spec.ts --runInBand
```

5. Pass criterion: the exact paid account agrees across Settings, History/Diary, Research, Connection Insights, and every other visible core lock before and after force-quit, foreground, logout/login, reinstall, and restore.

#### Task 4B: Keep the composer visible and stable

**Files:**

- `src/screens/main/Journal/add-log-screen.tsx`
- `src/screens/main/Journal/input-accessory-view.tsx`
- `src/screens/main/Diary/personal-note-letter-screen.tsx`
- `src/screens/main/Journal/add-log-keyboard-focus.spec.ts`
- `src/screens/main/Journal/input-accessory-view.spec.tsx`
- Create if needed: `src/screens/main/Diary/personal-note-letter-screen.keyboard.spec.tsx`

1. Write a failing test that keeps focus, typed text, selection/cursor, and the send action visible through query/realtime rerenders and keyboard height changes.
2. Fix only the owning layout/focus path. Do not add timing retries or globally change navigation keyboard behavior.
3. Verify keyboard dismissal occurs only on intentional send, back, or dismiss actions; submission remains single-fire.
4. Run focused tests, then validate on smallest and largest simulator layouts with maximum Dynamic Type.

#### Task 4C: Fix Connection role and pronoun behavior at the source

**API files:**

- `src/connections/services/connection-insight.service.ts`
- `src/connections/services/connection-insight.service.relationship-type.spec.ts`
- `src/connections/utils/relationship-reflection.helpers.ts`
- `src/connections/utils/relationship-reflection.helpers.spec.ts`
- `src/log/services/journal-prompt.service.ts`
- `src/log/services/journal-prompt.service.spec.ts`

1. Reproduce both sender and receiver prompt payloads, including the stored prompt pool.
2. Write failing tests for role identity, preferred name/pronoun input, cache/storage refresh, and the exact client-facing payload.
3. Fix the persisted or generated source. Do not patch one display label while leaving stale server prompts intact.
4. Run the focused API tests plus the mobile relationship/reflection pack.
5. Pass criterion: both accounts see correct identity, pronouns, CTA copy, waiting/completed states, and the same final shared insight, while private reflection text never crosses accounts.

#### Task 4D: Close accessibility blockers and classify polish honestly

**Files:**

- `src/components/mu-text.tsx`
- `src/components/mu-button.tsx`
- `src/screens/main/Diary/daily-zodiac-insight.tsx`
- `src/components/orbital/home-orbital-view.tsx`
- `src/components/orbital/home-orbital-view.spec.tsx`
- `src/components/accessibility-primitives.spec.tsx`
- `src/screens/main/voiceover-release-contract.spec.ts`
- `src/utils/feed/moment-to-care-accessibility.spec.ts`

1. Add failing assertions for text/background contrast, VoiceOver label/order, 44-point targets, Reduce Motion, and bounded orbital placement on small and large layouts.
2. Fix contrast or obstructed controls before release. Orbit drift or MTC overlap may be an accepted watch item only if it is non-obstructive, non-interactive, non-accessibility-impacting, irreproducible on the exact build, and Astro signs the acceptance.
3. Run the focused accessibility and geometry tests.

#### Task 4E: Close auth, privacy, crisis, and transactional notification contracts

**Highest-value existing tests:**

- Auth: `src/config/auth-service-account-isolation.spec.ts`, `src/config/auth-service-third-party-identity.spec.ts`, `src/config/session-account-gate.spec.ts`, `src/config/account-identity-session.spec.ts`
- Privacy: `src/config/react-query/persistent-cache-account-isolation.spec.ts`, `src/common/analytics/analytics-privacy.spec.ts`, `src/utils/comlete-account-clean-up.spec.ts`
- Crisis: `src/constants/crisis-resources.spec.ts`, `src/screens/panic/emergency-contacts-fallback.spec.ts`
- Push: `src/config/one-signal.spec.ts`, `src/store/notification-state.spec.ts`, `src/utils/notification-routing.spec.ts`, `src/utils/notification-route-allowlist.spec.ts`, `src/utils/notification-silent-noop.spec.ts`

Add tests only where a release requirement lacks coverage. In particular, add a direct unit test for `src/config/confirm-purchase.ts`; `purchase-recovery.spec.ts` currently mocks it.

All fixes require red test, minimal implementation, green focused test, relevant full suite, specialist review, normal PR, and staging runtime proof.

---

### Task 5: Refresh the existing backend reconciliation candidates

Do this before freezing the final staging backend. Continue the current reconciliation work instead of opening competing branches. Do not merge either production PR until Task 13 and Astro Approval B1.

#### Task 5A: Refresh murror-api PR #689

PR #689 already preserves both ancestries and the seven production-only commits, including Stripe billing portal commits `e9388f8` and `876ece3` plus onboarding pass-through `ba51768`. Its branch was 51 staging commits behind during the 2026-08-06 inspection.

**Step 1: Refresh the existing isolated worktree**

```bash
cd /Users/astro/Projects/murror-transfer/Murror/murror-api-worktrees/reconcile-prod-2026-07-31
git fetch origin --prune
git status --short --untracked-files=all
git merge --no-ff origin/staging
```

Expected: the worktree is clean before merge. It currently contains untracked `.watchman-cookie-*` artifacts, so first verify they are untracked tooling files and move them recoverably into a scoped temporary directory; do not delete or overwrite them. If any other change remains, stop for its owner or create a fresh isolated continuation worktree for the existing reconciliation branch. If merge conflicts occur, review all seven affected files individually. Never use a blanket `ours` or `theirs` resolution.

**Step 2: Prove the candidate tree and both ancestries**

```bash
git diff --exit-code origin/staging..HEAD
git merge-base --is-ancestor origin/production HEAD
git merge-base --is-ancestor origin/staging HEAD
```

Expected: every command exits 0. The candidate tree is byte-equivalent to approved staging content while retaining production history.

**Step 3: Prove preserved behavior and release contracts**

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm lint
pnpm type-check
pnpm format-check
pnpm test:integration
pnpm test -- --runInBand
bash test/production-non-galaxy-migrations.contract.sh
bash test/privacy-deletion-migrations.contract.sh
bash test/privacy-schema-preflight.contract.sh
node .github/scripts/check-fk-cascade-guard.js
node --test .github/scripts/check-fk-cascade-guard.test.js
```

Add or refresh focused tests for the named production-only behaviors if the current suites do not exercise the reconciled tree. Push only the existing reconciliation branch and rerun PR #689 checks:

```bash
git push origin HEAD:reconcile/staging-to-production-2026-07-31
gh pr checks 689 -R Murror/murror-api --watch
```

Keep the PR unmerged.

#### Task 5B: Prepare the viasr-api reconciliation PR

The content-aware merge of current production and staging was clean and produced the staging tree at inspection time. Preserve all ten production-only commits, including beat memory headroom, graceful deep-chat summary behavior, schema-tolerant wrapup, voice defaults, message classification, enum binding, and the production artwork manifest.

```bash
cd /Users/astro/Projects/murror-transfer/Murror/viasr-api
git fetch origin --prune
git merge-tree --write-tree origin/staging origin/production
git rev-parse 'origin/staging^{tree}'
poetry install --no-interaction --no-root
poetry run ruff check app tests
poetry run pytest -q
poetry run pip-audit --local --strict --skip-editable
```

The merge-tree SHA must equal the staging tree SHA. Prepare one reviewed staging-to-production PR with a merge commit plan, then leave it unmerged until Task 13.

**Step 4: Freeze staging runtime evidence**

Normal staging workflows must already have deployed the tested staging sources. Do not patch staging images by hand. Record workflow run IDs, source SHAs, image tags/digests, namespaces, migration results, and authenticated smoke evidence in `release-manifest.md`.

---

### Task 6: Repair the production control plane before trusting it

Read-only inspection found that production workflow prose and live GitHub settings disagree. The API and AI `production` environments have no enforced reviewer rules, required SGP1 identity inputs are missing, and scheduled health monitoring is stale/disabled on the default branch. These are launch blockers.

**API files:**

- `.github/actions/build-image/action.yml`
- `.github/actions/build-migration-image/action.yml`
- `.github/actions/deploy/action.yml`
- `.github/workflows/deploy-matrix.yml`
- `.github/workflows/deploy-doks.yml`
- `.github/workflows/prod-health-check.yml`
- `.github/scripts/prod-health-check.sh`
- `.github/workflows/prod-staging-drift-guard.yml`
- `.github/workflows/setup-kubernetes-config.yml`
- `test/deploy-release-traceability.contract.sh`

**Umbrella runbook:**

- `docs/runbooks/prod-health-check.md`

**AI files:**

- `.github/workflows/ci.yaml`
- Create: `.github/workflows/rollback-production.yml`
- `scripts/ci/resolve-release-source.sh`
- `scripts/ci/verify-kubeconfig-identity.sh`
- Create: `scripts/ci/rollback-production.sh`
- `scripts/ci/run-flyway-migration.sh`
- `app/sql/flyway.conf`
- `k8s/migration-job.yaml`
- `k8s/beat-deployment.yaml`
- `k8s/daily-voice-summary-cronjob.yaml`
- `tests/ci/test_production_release_gate_contract.py`
- `tests/ci/test_release_gate_scripts.py`
- `docs/deployment/production.md`

**Step 1: Inventory names and protection only**

```bash
gh secret list --env production -R Murror/murror-api --json name,updatedAt
gh variable list --env production -R Murror/murror-api --json name,updatedAt
gh secret list --env production -R Murror/viasr-api --json name,updatedAt
gh variable list --env production -R Murror/viasr-api --json name,updatedAt
gh api repos/Murror/murror-api/environments/production
gh api repos/Murror/viasr-api/environments/production
gh api repos/Murror/murror-api/environments/production-health
```

Record presence/absence and timestamps, never values. For each environment, inspect `protection_rules`, `deployment_branch_policy`, reviewer identities, and self-review prevention. Confirm the authoritative live cluster is SGP1 before writing any configuration.

**Step 2: Astro approves the governance model**

The approved model must resolve all of these facts in writing:

- SGP1 is authoritative for current production.
- The deprovisioned US/SFO2 path is not a secret-mirroring target unless it is intentionally restored.
- The API production environment requires `KUBE_CONFIG_SGP1`, `SGP1_KUBE_API_SERVER`, and `SGP1_KUBE_CA_SHA256`.
- The AI production environment requires the SGP1 server and CA identity inputs used by its verification script.
- Astro signs a separate dossier gate, and a different designated technical reviewer approves the GitHub production environment. GitHub's native reviewer list is normally a one-of list, not a two-approval rule; use a custom protection rule if the separate-signoff model is insufficient, and fail closed if the repository plan cannot enforce the approved control.
- Self-review is prevented and only the protected `production` branch can invoke a mutating production environment.
- A separate `production-health` environment has read-only credentials, no mutation permission, and no reviewer wait that would strand scheduled runs.

Creating environments, protection rules, secrets, or variables is an external production-control change and needs Astro's explicit approval.

**Step 3: Make both production lanes immutable, and make AI non-cancellable and reversible**

Write failing workflow-contract tests first, then make the smallest changes that prove:

- the API image-build actions emit full digests, and the production workflow resolves/checks them before environment approval; both the migration Job and API Deployment use `@sha256:` references and verify live `imageID` values;
- pull requests targeting `production` receive CI, or a required build-only run is pinned to the reviewed candidate's exact `headSha`;
- a production dispatch has its own concurrency lane with `cancel-in-progress: false`;
- one full `sha256` application digest is resolved after build and pinned into AI API, worker, beat, and any Astro-approved retained CronJob; otherwise the CronJob is provably disabled;
- the separate full migration-image digest is pinned into Flyway;
- `run-flyway-migration.sh` accepts an exact `IMAGE_REF`, renders that `@sha256:` reference into the Job, and rejects tag-only references for production and rehearsal;
- mutable seven-character tags remain labels only and are never deployment identity;
- API `.github/workflows/deploy-doks.yml` accepts a pre-recorded exact `@sha256:` runtime image for code-only rollback, rejects tag-only or unapproved digests, and cannot rebuild or rerun Prisma;
- automatic `flyway repair || true` is removed from the production path; checksum drift fails closed unless a separately reviewed one-off repair is approved;
- `app/sql/flyway.conf` enforces `flyway.cleanDisabled=true`, and workflow contracts reject any production path that permits `clean`;
- `outOfOrder=true` is disabled unless the signed Flyway inventory and clone rehearsal prove a specific intentional need; an unexplained out-of-order migration blocks release;
- a protected image-only rollback workflow restores the prior API, worker, beat, and CronJob digests without rerunning migrations;
- the prior CronJob rendered manifest, worker arguments, authoritative ConfigMap hashes, and secret resource versions are retained as secure rollback evidence because CronJobs and workflow patches have no Deployment rollback revision.

Freeze and compare rendered specs for every AI mutation: authoritative ConfigMaps, Flyway job, worker arguments, beat, and CronJob. For Secrets, record only key names and resource versions, never rendered values or value-derived hashes. Remove or production-scope unused legacy `app-config-map`/`app-secret` writes. Astro must classify Daily Voice Summary as required compatibility for live app 1.0.19 or disable its scheduler for this launch; deferred voice UI is not permission to silently reapply a voice job.

Run the focused source contracts before any environment-setting change:

```bash
cd /Users/astro/Projects/murror-transfer/Murror/murror-api
bash test/deploy-release-traceability.contract.sh

cd /Users/astro/Projects/murror-transfer/Murror/viasr-api
poetry run pytest -q \
  tests/ci/test_production_release_gate_contract.py \
  tests/ci/test_release_gate_scripts.py
```

Expected: both backends require digest-pinned production/rehearsal images, AI production is non-cancellable, Flyway clean/repair paths fail closed, and the protected rollback contract passes.

**Step 4: Fix scheduled health monitoring in source**

Scheduled GitHub workflows run from the default branch. Bring the reviewed SGP1 health workflow to the actual default branch through an explicitly approved docs/workflow-only PR. Do not silently retarget an application release PR.

Tests must prove:

- expected DNS/IP and cluster identity use current SGP1 truth, not stale SFO2 `159.89.222.109`;
- the job uses the read-only `production-health` environment;
- the credential cannot mutate Deployments, Jobs, ConfigMaps, Secrets, or databases;
- nonzero `probe_exit`, missing/malformed `red_count`, API or direct AI readiness failure, pod failure, migration/schema drift, or privacy-safe error probe failure makes the workflow red;
- alert delivery is test-fired without fabricating a production incident.

Inside the protected job, require negative `kubectl auth can-i` assertions for create/update/patch/delete on Deployments, Jobs, CronJobs, ConfigMaps, Secrets, and database-affecting resources.

**Step 5: Re-enable and prove the monitor is actually scheduled**

After Astro approves the workflow-state mutation:

```bash
gh workflow enable prod-health-check.yml -R Murror/murror-api
gh api repos/Murror/murror-api/actions/workflows/prod-health-check.yml --jq '.state'
```

Expected state: `active`. Require one successful manual run and two naturally scheduled successful runs from the default branch. Record run IDs, event types, exact workflow SHA, and alert-delivery proof. A green local command does not close OPS-01.

**Step 6: Align stale runbooks**

Update API/AI documentation to describe SGP1, the protected environments, immutable source/digests, and the real rollback path. Remove stale dual-US/SFO2 assertions only after live read-only inspection confirms the replacement.

**Step 7: Establish observability and threshold evidence**

Oracle records a recent stable production baseline plus exact-RC staging results for build adoption, crashes/hangs, auth, entitlement mismatches, purchase/Restore, journal/AI completion, Connection state, API/AI latency/errors, DB pools, queue age/retries, deletion, notification routing, refunds, and support categories. Sentinel challenges the proposed thresholds, Atlas test-fires every alert, and Astro signs the numeric values in `launch-thresholds.md`. Never include journal text, prompts, names, emails, or raw identifiers.

---

### Task 7: Freeze and rehearse the exact production migration set

**Files:**

- `murror-api/scripts/release/production-migration-set.json`
- `murror-api/scripts/release/prepare-production-migration-set.mjs`
- `murror-api/test/production-non-galaxy-migrations.contract.sh`
- `murror-api/test/privacy-deletion-migrations.contract.sh`
- `murror-api/test/privacy-schema-preflight.contract.sh`
- `murror-api/Dockerfile.migration`
- `viasr-api/app/sql/Dockerfile.migration`
- `viasr-api/app/sql/flyway.conf`
- `viasr-api/app/sql/V*.sql`
- `viasr-api/k8s/migration-job.yaml`
- `viasr-api/scripts/ci/run-flyway-migration.sh`
- `viasr-api/docs/deployment/migration-coordination.md`

**Step 1: Resolve the Japanese clinical-content gate**

The current 23-entry include manifest contains `20260801210000_add_checkin_question_ja`, whose own contract text requires native-language fidelity review and Astro sign-off. Before freeze, choose and record exactly one permitted outcome:

1. Native clinical review passes and Astro signs inclusion, leaving the current 23-included/5-Galaxy-excluded set; or
2. The migration is moved into an explicit deferred exclusion with matching fail-closed contract tests, producing 22 included and 6 excluded for this English-only launch. The current preparer rejects every non-Galaxy exclusion, so first add a failing test and then an exact allowlist for only `20260801210000_add_checkin_question_ja`; no general non-Galaxy exclusion is allowed.

No third outcome and no implicit approval are allowed. Any other new migration also blocks freeze until reviewed and explicitly classified.

**Step 2: Run the fail-closed manifest contracts**

```bash
cd /Users/astro/Projects/murror-transfer/Murror/murror-api
bash test/production-non-galaxy-migrations.contract.sh
bash test/privacy-deletion-migrations.contract.sh
bash test/privacy-schema-preflight.contract.sh
REHEARSAL_MIGRATION_COPY=$(mktemp -d /private/tmp/murror-production-migrations.XXXXXX)
cp -R prisma/migrations/. "$REHEARSAL_MIGRATION_COPY/"
node scripts/release/prepare-production-migration-set.mjs \
  --environment production \
  --profile production-non-galaxy \
  --root "$REHEARSAL_MIGRATION_COPY" \
  --apply
```

Expected: the disposable copy retains the exact approved includes and removes the exact signed exclusions. The real tracked migration directory is untouched. Unknown, missing, or any non-Galaxy exclusion other than the explicitly signed JA migration fails closed.

**Step 3: Create a protected disposable clone**

With Astro's approval, restore the latest production backup/PITR snapshot into a dedicated Supabase clone that:

- preserves `_prisma_migrations`, `public`, `murror_api`, grants, policies, functions, triggers, and storage metadata;
- provides distinct privilege-equivalent session-mode identities for the Murror database and legacy database;
- has production-equivalent access controls, audit logging, encryption, and no public application traffic;
- cannot send email, push, webhooks, analytics, queues, or other external side effects;
- is destroyed after evidence retention, through a separately confirmed clone-only cleanup.

Do not download raw production data to a developer laptop.

**Step 4: Prove source-level compatibility before production artifacts exist**

From the locked API and AI source SHAs, use build-only workflows to create preliminary immutable images. Against an untouched clone of the current production schema, run the currently deployed and candidate API plus AI API/worker/beat and the signed scheduler state in an isolated namespace with outbound side effects disabled. The candidate AI must work before either Flyway or Prisma changes.

This preflight proves behavior and migration intent, but it does not close the exact-artifact gate because production-tagged images do not exist yet.

**Step 5: Rehearse the exact production digests between Approval B1 and B2**

Task 13 Approval B1 permits production-branch merges and artifact builds only. Keep every production environment approval pending, including API `setup-kubernetes-config.yml`. Resolve and write the full API runtime/migration and AI runtime/migration `sha256` digests into `release-lock.json`, then rehearse those exact bytes before Approval B2 permits any Kubernetes or database mutation.

Match the real order:

1. Test current and candidate AI API/worker/beat plus the signed retained-or-disabled CronJob state against the pre-migration clone.
2. Render and run the clone-only Flyway Job with the exact AI migration digest:

```bash
cd /Users/astro/Projects/murror-transfer/Murror/viasr-api
RELEASE_LOCK=/Users/astro/Projects/murror-transfer/Murror/docs/releases/ios-2.0.0/release-lock.json
RELEASE_AI_MIGRATION_IMAGE=$(jq -er '.ai.migration_image_ref | select(test("@sha256:[0-9a-f]{64}$"))' "$RELEASE_LOCK")
NAMESPACE="$REHEARSAL_AI_NAMESPACE" \
ENVIRONMENT=rehearsal \
IMAGE_REF="$RELEASE_AI_MIGRATION_IMAGE" \
KUBECONFIG="$REHEARSAL_KUBECONFIG" \
bash scripts/ci/run-flyway-migration.sh
```

The protected rehearsal namespace contains only a clone-scoped `murror-ai-migration-secrets` reference. The rendered `k8s/migration-job.yaml` must contain the exact `@sha256:` image, `flyway.cleanDisabled=true`, no automatic/ignored repair, and no production namespace or credential. Compare `schema_version` before/after, fail on validation/checksum drift, and re-run the same digest to require a clean no-op.
3. Test current and candidate AI plus current API against the Flyway-updated schema.
4. Run the exact API migration digest/profile with two distinct secret inputs:

```bash
RELEASE_API_MIGRATION_IMAGE=$(jq -er '.api.migration_image_ref | select(test("@sha256:[0-9a-f]{64}$"))' "$RELEASE_LOCK")
docker run --rm \
  -e NODE_ENV=production \
  -e MURROR_MIGRATION_PROFILE=production-non-galaxy \
  -e MURROR_DATABASE_URL="$REHEARSAL_MURROR_DB_URL" \
  -e DATABASE_URL="$REHEARSAL_LEGACY_DB_URL" \
  "$RELEASE_API_MIGRATION_IMAGE"
```

Both rehearsal database URLs use direct/session mode on port 5432 and production-equivalent roles; neither uses the runtime PgBouncer port 6543. Secrets are injected by the protected runner and never logged.

**Step 6: Verify old/new compatibility and recovery**

Against both the pre-migration snapshot and fully migrated clone, run the current and candidate API/AI images and authenticated auth, subscription, journal, Connection, deletion, privacy, and crisis flows. Compare schema, constraints, indexes, RLS/policies, grants, triggers, storage, `schema_version`, and `_prisma_migrations`; check row-count/backfill invariants without retaining row contents; prove no deferred Galaxy object or unapproved JA content appeared.

Record migration duration, lock behavior, every digest, snapshot ID/checksum, before/after schema checks, no-op rerun, and forward-fix plan. A pod rollback never undoes database writes.

---

### Task 8: Seal production mobile configuration and archive inspection

**MurrorMobile files, relative to the mobile repository:**

- Create: `scripts/release/verify-ios-archive.sh`
- Create: `scripts/release/test-verify-ios-archive.sh`
- Modify: `scripts/release/ios-release-contract.mjs`
- Verify: `ios/MurrorMobile.xcodeproj/project.pbxproj`
- Verify: `ios/MurrorMobile.xcodeproj/xcshareddata/xcschemes/MurrorMobile.xcscheme`
- Verify: `ios/MurrorMobile/Info.plist`
- Verify: `ios/MurrorMobile/MurrorMobile.entitlements`
- Verify: `ios/MurrorMobile/PrivacyInfo.xcprivacy`
- Verify: `ios/AppWidgets/Info.plist`
- Verify locally, never commit: `.env.staging`, `.env.production`, `ios/ExportOptions.plist`, `ios/Pods/`

**Umbrella release contracts:**

- `docs/releases/ios-2.0.0/archive-contract.staging.json`
- `docs/releases/ios-2.0.0/archive-contract.production.json`

**Step 1: Write failing archive-fixture tests**

Build small fake `.xcarchive` fixtures that prove the verifier rejects:

- staging/dev/localhost hosts or provider IDs in a production bundle;
- placeholder OAuth values;
- wrong bundle IDs, signing team, associated domains, push entitlements, CodePush deployment, or environment identity;
- app/extension marketing-version or build-number disagreement;
- a missing JS bundle, privacy manifest, required extension, or production API host;
- a contract/environment mismatch, including checking a staging archive against production identifiers or vice versa;
- any active deferred Live Activity entitlement, plist capability, bridge entry point, or embedded lock-screen surface;
- unsupported deployment-target combinations;
- missing Hermes dSYM unless an explicit signed watch-item file is supplied.

The verifier must never print provider secrets or the contents of `.env.production`.

Run and see failure before implementation:

```bash
bash scripts/release/test-verify-ios-archive.sh
```

**Step 2: Implement the archive verifier**

Discover the `.app` rather than assuming its filename. Inspect the archive plist, embedded app and appex plists, entitlements, binary/JS bundle strings, provisioning identity, and dSYMs. Require an explicit `--environment staging|production` and compare public values only to the matching machine-readable, secret-free archive contract.

**Step 3: Resolve the supported-iOS contract**

The current project contains app targets around iOS 15.x and extension targets at iOS 18.1/18.5. Engineering must either:

- align the targets with APIs that work on the declared minimum; or
- prove through App Store validation and physical installation that the higher-target extensions are safely unavailable on older supported devices, then document the exact supported behavior.

Do not advertise a minimum iOS version until this gate passes.

**Step 4: Freeze public configuration and hashes**

Astro chooses the canonical production API/AI/web hosts. Commit only normalized public-configuration hashes. For the full `.env.staging`, `.env.production`, and export options, keep an opaque attestation and secret-manager/resource version in restricted evidence rather than committing raw contents or value-derived hashes. Confirm each archive matches its signed environment contract. The production archive must use RevenueCat, OneSignal/APNs, OAuth, Sentry, associated-domain, bundle, and signing identities intended for `app.murror.mobile`.

**Step 5: Run tests and review**

```bash
bash scripts/release/test-verify-ios-archive.sh
yarn release:ios:preflight
yarn privacy:check-files
```

Expected: fixture tests pass; live preflight remains fail-closed until the clean release worktree is securely provisioned.

---

### Task 9: Run the frozen-source automated release matrix

Run from a clean detached checkout of the exact source recorded in the signed lock after every mobile fix and backend staging deploy has landed:

```bash
RELEASE_LOCK=/Users/astro/Projects/murror-transfer/Murror/docs/releases/ios-2.0.0/release-lock.json
MOBILE_LOGIC_SHA=$(jq -er '.mobile.logic_sha | select(test("^[0-9a-f]{40}$"))' "$RELEASE_LOCK")
git fetch origin staging-environment-setup
test "$(git rev-parse origin/staging-environment-setup)" = "$MOBILE_LOGIC_SHA"
test "$(git rev-parse HEAD)" = "$MOBILE_LOGIC_SHA"
test -z "$(git symbolic-ref -q HEAD)"
test -z "$(git status --porcelain)"
```

The three local assertions require the exact locked commit, detached HEAD, and a completely clean tracked/untracked tree. If the remote trunk advanced or any assertion fails, pause and explicitly re-freeze or recreate the detached worktree; never silently substitute its latest commit.

**Step 1: Mobile source gates**

```bash
yarn install --immutable
yarn privacy:check-files
yarn lint
yarn type-check
yarn i18n-check
yarn i18n-unused
yarn copy-lint
yarn node scripts/ci/verify-workflow-contracts.mjs
yarn node --test scripts/ci/select-ios-simulator.test.mjs
bash scripts/ci/test-install-ios-pods.sh
NODE_OPTIONS=--max_old_space_size=4096 yarn test:cov --forceExit
```

Expected: every command exits 0. Record the exact commit and complete output summary.

**Step 2: Hosted Appium/ODE E2E**

```bash
gh workflow run e2e.yaml \
  --ref staging-environment-setup \
  -f run_context=release \
  -f ios_device='iPhone 17' \
  -f ios_version='18.3'
```

Wait for completion and record the run URL. If the harness fails, repair the harness and rerun. Do not waive it because the current suite covers only language and returning-user paywall.

Read the completed run's `headSha` through `gh run view` and require exact equality with `MOBILE_LOGIC_SHA`. A moving-branch run against any other SHA is stale even if green.

**Step 3: Native staging simulator build**

```bash
test -f .env.staging
scripts/ci/install-ios-pods.sh --repo-update
IOS_SELECTOR_DIR=$(mktemp -d /private/tmp/murror-ios-selector.XXXXXX)
export GITHUB_OUTPUT="$IOS_SELECTOR_DIR/output"
export GITHUB_ENV="$IOS_SELECTOR_DIR/environment"
node scripts/ci/select-ios-simulator.mjs
SIMULATOR_UDID=$(awk -F= '$1 == "udid" {print $2}' "$GITHUB_OUTPUT")
test -n "$SIMULATOR_UDID"
SIMULATOR_STATE=$(xcrun simctl list devices --json | \
  jq -er --arg udid "$SIMULATOR_UDID" '[.devices[][] | select(.udid == $udid)][0].state')
if [ "$SIMULATOR_STATE" = "Shutdown" ]; then
  xcrun simctl boot "$SIMULATOR_UDID"
elif [ "$SIMULATOR_STATE" != "Booted" ]; then
  echo "Simulator is neither Shutdown nor Booted: $SIMULATOR_STATE" >&2
  exit 1
fi
xcrun simctl bootstatus "$SIMULATOR_UDID" -b
cd ios
xcodebuild \
  -workspace MurrorMobile.xcworkspace \
  -scheme MurrorMobileStaging \
  -configuration Release \
  -sdk iphonesimulator \
  -destination "platform=iOS Simulator,id=$SIMULATOR_UDID" \
  -derivedDataPath /private/tmp/MurrorMobileStagingReleaseDerivedData \
  build
xcrun simctl install "$SIMULATOR_UDID" \
  /private/tmp/MurrorMobileStagingReleaseDerivedData/Build/Products/Release-iphonesimulator/MurrorMobileStaging.app
xcrun simctl launch --terminate-running-process "$SIMULATOR_UDID" app.murror.mobile.stg
```

The repository's tested selector writes scoped GitHub-format output; the command reads only its `udid` field, binding build, install, and launch to one recorded simulator without shell-evaluating the device-name text. Expected: all three succeed and the process survives the launch observation window with no crash/red screen. Reapply/verify the repository's `fmt` compatibility handling after pod installation; do not rely on an unrecorded writable Pods cache.

**Step 4: Backend frozen-source gates**

Rerun the complete API and AI commands from Task 5 against their newly frozen staging SHAs. Record staging image digests and authenticated end-to-end flow evidence. Green health alone is insufficient.

---

### Task 10: Cut one staging TestFlight release candidate through the shared lane

**Step 1: Dispatch pre-archive reviewers**

Review the cumulative mobile diff from the last accepted build through the frozen source for auth, subscription, notification, privacy, native lifecycle, accessibility, performance, and release configuration. Fix and merge findings before choosing a build number.

**Step 2: Let the script select the number**

From a clean canonical mobile worktree, reload `MOBILE_LOGIC_SHA` from `release-lock.json`, fetch the remote trunk, require `HEAD` and `origin/staging-environment-setup` to equal that SHA, then run:

```bash
./scripts/ios-next-build.sh --dry-run
```

The dry run must successfully consult App Store Connect and report `max(canonical git, local, App Store Connect) + 1`; any unchecked Apple state is a failure. Use only that script-produced value to name a new isolated `chore/bump-build-${RELEASE_BUILD}` worktree and branch. Do not infer the next number from build 418.

**Step 3: Apply, commit, PR, and merge the generated bump**

```bash
./scripts/ios-next-build.sh
RELEASE_BUILD=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' ios/MurrorMobile/Info.plist)
git diff --check
git add ios/MurrorMobile.xcodeproj/project.pbxproj \
  ios/MurrorMobile/Info.plist \
  ios/MurrorMobileDevelopment-Info.plist \
  ios/MurrorMobileODE-Info.plist \
  ios/MurrorMobileStaging-Info.plist
git commit -m "chore(ios): bump build to ${RELEASE_BUILD}"
```

Before commit, require `git diff --name-only` to contain exactly the project file plus the four app plists listed in the command, and use the release contract to prove every textual change is only the script-generated build-number update. Open a PR to `staging-environment-setup`, record its expected predecessor, and merge only through the required compare-and-swap merge queue after the `merge_group` check revalidates App Store Connect. Record the numeric PR and GitHub-reported merge SHA as the signed packaging-authorized fields `mobile.staging_build_bump_pr` and `mobile.staging_build_bump_merge_sha`. `${RELEASE_BUILD}` is the exact number printed and written by the script, never a hand-selected value.

**Step 4: Create a clean archive worktree from the merged remote**

Provision `.env.staging`, `ios/ExportOptions.plist`, dependencies, and Pods from approved sources. Do not symlink a writable Yarn cache from another worktree.

```bash
RELEASE_LOCK=/Users/astro/Projects/murror-transfer/Murror/docs/releases/ios-2.0.0/release-lock.json
BUMP_PR=$(jq -er '.mobile.staging_build_bump_pr | select(type == "number" and . > 0)' "$RELEASE_LOCK")
BUMP_COMMIT=$(jq -er '.mobile.staging_build_bump_merge_sha | select(test("^[0-9a-f]{40}$"))' "$RELEASE_LOCK")
REMOTE_BUMP_COMMIT=$(gh pr view "$BUMP_PR" --repo Murror/MurrorMobile \
  --json state,baseRefName,mergeCommit \
  --jq 'select(.state == "MERGED" and .baseRefName == "staging-environment-setup") | .mergeCommit.oid')
test "$REMOTE_BUMP_COMMIT" = "$BUMP_COMMIT"
git fetch origin staging-environment-setup
git merge-base --is-ancestor "$BUMP_COMMIT" origin/staging-environment-setup
MOBILE_PACKAGING_SHA=$(git rev-parse origin/staging-environment-setup)
test "$MOBILE_PACKAGING_SHA" = "$BUMP_COMMIT"
./scripts/verify-build-lane.sh
```

Write `MOBILE_PACKAGING_SHA` into the signed lock as `mobile.staging_packaging_sha`. Prove the diff from `mobile.logic_sha` to this SHA contains exactly the five generated build-number files and no other byte change. Expected: all checks pass without an escape hatch.

**Step 5: Archive, inspect, export, and upload the staging scheme**

Rerun the Task 9 release/configuration, native-build/launch, and hosted E2E finalizers against `MOBILE_PACKAGING_SHA`; require every hosted run's `headSha` to equal it. Logic-suite evidence may carry forward only because the five-file generated diff was mechanically proven.

Use `MurrorMobileStaging`, then run:

```bash
RELEASE_BUILD=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' ios/MurrorMobileStaging-Info.plist)
test -n "$RELEASE_BUILD"
./scripts/verify-build-lane.sh
yarn release:ios:preflight
xcodebuild archive \
  -workspace ios/MurrorMobile.xcworkspace \
  -scheme MurrorMobileStaging \
  -configuration Release \
  -archivePath "/private/tmp/MurrorMobileStaging-${RELEASE_BUILD}.xcarchive" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$ASC_KEY_PATH" \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID"
bash scripts/release/verify-ios-archive.sh \
  --environment staging \
  "/private/tmp/MurrorMobileStaging-${RELEASE_BUILD}.xcarchive" \
  /Users/astro/Projects/murror-transfer/Murror/docs/releases/ios-2.0.0/archive-contract.staging.json
```

The two preflight commands run after dependencies/Pods are provisioned and immediately before the expensive archive. After Astro authorizes the staging export/upload, run:

```bash
xcodebuild -exportArchive \
  -archivePath "/private/tmp/MurrorMobileStaging-${RELEASE_BUILD}.xcarchive" \
  -exportPath "/private/tmp/MurrorMobileStaging-${RELEASE_BUILD}-export" \
  -exportOptionsPlist ios/ExportOptions.plist \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$ASC_KEY_PATH" \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID"
```

Use only the approved uploader/destination encoded by the reviewed export contract. Record archive SHA-256, build number, source SHA, public configuration hash, restricted environment/export attestation ID, signing identity, provider public IDs, export/upload result, and App Store processing state.

`VALID` means processing succeeded. It does not close any functional gate.

---

### Task 11: Prove the processed staging RC on physical iPhones

**Minimum credible matrix:** two physical iPhones and five test accounts: one existing paid account plus four disposable accounts.

| Asset | Required role |
|---|---|
| Device A | Smallest/oldest supported iPhone available on the declared oldest supported iOS |
| Device B | Current large-screen iPhone on latest stable iOS |
| Account 1 | Existing paid Solo account for entitlement refresh and restore |
| Account 2 | Fresh free partner for two-account Connection |
| Account 3 | Fresh Solo monthly purchaser |
| Account 4 | Fresh Solo yearly purchaser |
| Account 5 | Sacrificial account for deletion/local-cleanup proof |

Record device model, iOS, build, account role, PDT timestamp, screenshots/video, and non-sensitive entity identifiers for each row.

**Step 1: Auth and onboarding**

Test every sign-in method visible in the RC, fresh signup, OTP/password recovery as applicable, denied/cancelled provider flow, logout, force-quit, reinstall, and account switching. Pass requires one correct identity, no loop, no stale account data, and a usable home state.

**Step 2: Paid entitlement and Solo StoreKit**

Prove monthly and yearly offerings, purchase, cancellation, double-tap mutex, backend/RevenueCat confirmation, unlock, foreground refresh, force-quit, reinstall, Restore, Manage Subscription, expiration/cancellation truthfulness, and account switching. A success toast before entitlement confirmation is a failure.

**Step 3: Journal and AI**

Create a text journal, interrupt and resume a draft, submit once, receive one AI response, background during processing/streaming, lose and restore network, reopen History/Diary/Research, and verify no duplicate journal/conversation. Voice input and voice insights stay dark. Backgrounding chat or receiving a moment must not start any lock-screen or Dynamic Island Live Activity.

**Step 4: Two-account Connection**

Sender creates/shares, receiver sees exactly one pending item, receiver completes, both converge to the same final insight, relaunch preserves state, and role/name/pronoun copy remains correct. Exercise rapid taps, duplicate realtime/push, offline reconnect, background/foreground, force-quit, and account switch. Private reflection text never crosses accounts.

**Step 5: Transactional push decision**

For each notification type explicitly listed in `scope-matrix.md`, prove consent, foreground/background/terminated delivery, duplicate suppression, exact deep-link focus, cold miss fallback, account switching, and no private lock-screen leakage. If a type fails, repair it or disable its mobile route, backend scheduler/provider, settings, deep link, analytics promise, and App Store copy. Then create a new source/configuration freeze, cut a new RC through the full lane, and rerun notification, privacy, archive, and affected regression evidence. Editing launch copy alone does not remove a notification family.

**Step 6: Privacy, deletion, and crisis**

Prove analytics/session replay capture no journal/prompt/name content, persistent caches clear across account switch, deletion request reaches the server, local credentials/caches disappear, stale clients cannot restore identity, and the backend completion window is observed.

Run the checked-in crisis suite against the exact locked staging AI candidate:

```bash
cd /Users/astro/Projects/murror-transfer/Murror/viasr-api
RELEASE_LOCK=/Users/astro/Projects/murror-transfer/Murror/docs/releases/ios-2.0.0/release-lock.json
CRISIS_BASE_URL=$(jq -er '.ai.staging_base_url' "$RELEASE_LOCK")
shasum -a 256 evals/fixtures/crisis_detection.yaml
EVAL_BASE_URL="$CRISIS_BASE_URL" poetry run python -m evals.runner \
  --suite crisis_detection \
  --trials 5
```

Record fixture checksum, locked candidate source/runtime digest, five trials per fixture, non-secret model/provider configuration, and generated JSON report. Every checked-in must-flag and must-not-flag trial must pass; any must-flag miss is a zero-tolerance stop. Also prove physical crisis-resource navigation. Missing or wrong resources are zero-tolerance failures.

**Step 7: Accessibility and layout**

On both devices test VoiceOver labels/order, maximum Dynamic Type, Reduce Motion, keyboard-visible composer, safe areas, 44-point targets, zodiac/card contrast, long names, and every core CTA. Inspect Lock Screen and Dynamic Island after chat backgrounding, moment arrival, push delivery, relaunch, and account switch; no deferred Live Activity may appear. No field, control, or required content may be covered or clipped.

**Step 8: RC decision**

Zero crashes, red screens, hangs, duplicate mutations, cross-account content, paid locks, false purchase success, or deferred-feature surfaces. Sentinel signs Gate 6 only when every row is `PASS`; Astro then accepts or rejects the RC.

---

### Task 12: Rotate the exposed production DB credential in an isolated window

Skip mutation only if a current, independently verified rotation receipt proves the exposed credential is already invalid and every active consumer was canaried.

**Step 1: Inventory consumers without values**

Cover GitHub production environments, API runtime and migration URLs, AI API/worker/beat/cron, dashboards, backup jobs, and every active SGP1 consumer. Runtime remains on the pooled 6543 URL; migration stays on direct/session 5432.

**Step 2: Obtain Astro Approval A**

The approval record names the window, operators, consumer list, canary sequence, expected interruption, communication path, and recovery rule. The exposed password is never a rollback option.

**Step 3: Pre-stage and rotate through protected secret management**

Quiesce only the consumers required by the reviewed runbook, rotate at Supabase, update every protected consumer without logging values, then canary API, AI API, worker, beat, cron, and dashboards.

**Step 4: Verify and soak**

Prove the old credential fails, the new runtime and migration connection modes work, current production app 1.0.19 completes authenticated core flows, queues remain healthy, and no consumer repeatedly retries the old secret. Record hashes/resource versions and health evidence, never values.

---

### Task 13: Promote backward-compatible backend services with Astro Approvals B1 and B2

Approval B1 permits production-branch merges and artifact builds while every production environment remains held. Approval B2 permits the already-reviewed exact digests to mutate production only after exact-artifact rehearsal passes. No database, Kubernetes, secret, ConfigMap, or scheduler mutation occurs under B1.

**Step 1: Freeze the rollback manifest read-only**

Record current production API and AI deployment revisions, full image strings/digests, replica counts, ConfigMap hashes/resource versions, Secret resource versions, worker arguments, migration baselines, and health. Include API, AI API, worker, beat, and the exact rendered daily CronJob manifest. Verify the protected AI image-only rollback workflow in a non-production namespace. Do not decode Secrets, and never record the exposed database password as rollback material.

**Step 2: Refresh the existing reconciliation candidates**

For API, continue PR #689 and its existing worktree/branch. Merge the latest `origin/staging` into that reconciliation branch, then require:

```bash
git diff --exit-code origin/staging..HEAD
git merge-base --is-ancestor origin/production HEAD
git merge-base --is-ancestor origin/staging HEAD
gh pr checks 689 -R Murror/murror-api --watch
```

For AI, prove the content-aware merge tree equals staging and open/review the staging-to-production PR. Require CI on that exact production PR head SHA, or a pinned build-only run with the same `headSha`. Neither PR is merged without Approval B1. Use merge commits, never squash/rebase/force-push.

**Step 3: Approval B1 merges and builds while production remains held**

Load the literal locked sources; never recompute them from a moving branch:

```bash
RELEASE_LOCK=/Users/astro/Projects/murror-transfer/Murror/docs/releases/ios-2.0.0/release-lock.json
API_STAGING_SHA=$(jq -er '.api.staging_source_sha | select(test("^[0-9a-f]{40}$"))' "$RELEASE_LOCK")
AI_STAGING_SHA=$(jq -er '.ai.staging_source_sha | select(test("^[0-9a-f]{40}$"))' "$RELEASE_LOCK")
```

Fetch both remotes and require the locked staging SHAs to remain the signed staging heads and to be contained in the reviewed production merge candidates. Approval B1 then permits the two merge commits. Record each production merge SHA and logic-tree SHA; prove both ancestries and exact tree equality with the corresponding locked staging commit.

Load the newly signed merge fields, confirm both remotes still match them, then dispatch exactly:

```bash
API_PRODUCTION_MERGE_SHA=$(jq -er '.api.production_merge_sha | select(test("^[0-9a-f]{40}$"))' "$RELEASE_LOCK")
AI_PRODUCTION_MERGE_SHA=$(jq -er '.ai.production_merge_sha | select(test("^[0-9a-f]{40}$"))' "$RELEASE_LOCK")
git -C /Users/astro/Projects/murror-transfer/Murror/murror-api fetch origin production
git -C /Users/astro/Projects/murror-transfer/Murror/viasr-api fetch origin production
test "$(git -C /Users/astro/Projects/murror-transfer/Murror/murror-api rev-parse origin/production)" = "$API_PRODUCTION_MERGE_SHA"
test "$(git -C /Users/astro/Projects/murror-transfer/Murror/viasr-api rev-parse origin/production)" = "$AI_PRODUCTION_MERGE_SHA"
gh workflow run deploy-matrix.yml -R Murror/murror-api \
  --ref production \
  -f environment=production \
  -f force_rebuild=false
gh workflow run ci.yaml -R Murror/viasr-api \
  --ref production \
  -f environment=production \
  -f production_source_sha="$AI_STAGING_SHA"
```

For API, leave the reusable `setup-kubernetes` production-environment job and its dependent `deploy` job unapproved while the parallel image-build jobs finish. For AI, leave the production `deploy` job unapproved while `release-source`, quality/security, and image-build jobs finish. No setup/deploy environment approval occurs under B1. Immediately require each newly dispatched run's GitHub-reported `headSha` to equal its locked production-merge SHA; cancel or let a mismatched build fail without approving any environment, then restart B1 from fresh remotes.

Capture the held workflow run IDs, workflow `headSha` values, resolved build-source SHAs, logic-tree SHAs, and full immutable digests for API runtime, API migration, AI runtime, and AI migration. API workflow head/build source is its production merge SHA; AI workflow head is its production merge SHA while its explicitly resolved build source is `AI_STAGING_SHA`. The AI runtime digest must be identical across API, worker, beat, and any signed retained CronJob spec; otherwise the lock records the verified disabled CronJob state.

Write only those B1-authorized fields, sign the B1 artifact-lock revision, and freeze it before rehearsal. Return to Task 7 Step 5 and rehearse these exact four digests. Any rebuild, source change, digest change, rendered-resource change, or failed rehearsal invalidates B1 and requires a new signed lock.

**Step 4: Approval B2 deploys AI first**

Before B2, prove the candidate AI API/worker/beat and signed scheduler state against both the untouched current production schema and the fully migrated clone. Confirm the held AI run is non-cancellable, its workflow `headSha` equals the locked `ai.production_merge_sha`, its resolved content source equals `ai.staging_source_sha`, both commits have the same tree, and its app/migration digests equal the lock.

Astro records Approval B2 in the dossier; a separate technical reviewer approves the already-held GitHub environment. Do not redispatch or rebuild it. The protected workflow runs the exact rehearsed Flyway digest, then pins the exact app digest into AI API, worker, beat, and any retained classified CronJob, or verifies the CronJob remains disabled. Verify source annotations and actual `imageID` digests, queues, configuration hashes, and migration ledger. Smoke live app 1.0.19 before continuing.

**Step 5: Approval B2 deploys API and the approved Prisma profile**

Confirm the held API run's `headSha` and resolved build source equal `api.production_merge_sha`, its tree equals `api.logic_tree_sha`, and its runtime digest, migration digest, signed manifest checksum, and rendered configuration equal the lock. Then approve it. The protected workflow runs the exact rehearsed migration digest with `production-non-galaxy` before the exact API runtime digest. Never approve `setup-kubernetes-config.yml` before rehearsal and never use `force_rebuild=true` for an existing immutable version. Smoke live app 1.0.19 again before continuing.

**Step 6: Verify authenticated behavior, not just health**

Using both 1.0.19 and the approved 2.0 production TestFlight build when available, prove auth, entitlement, journal/AI, Connection, privacy/deletion request, crisis, and transactional notification paths. Verify pods, queues, DB pools, migration ledger, logs, errors, and public hosts against approved thresholds.

**Step 7: Roll back or stop correctly**

- API code-only rollback uses `.github/workflows/deploy-doks.yml` with the pre-recorded exact previous approved `@sha256:` runtime digest and Astro incident approval; tag-only input, rebuild, or Prisma execution is forbidden.
- AI rollback uses the protected image-only workflow to restore API, worker, beat, and cron together to recorded digests without rerunning Flyway.
- Because CronJobs have no rollout revision, rollback reapplies the retained prior digest-pinned CronJob manifest. Restore workflow-mutated ConfigMaps/Secrets only from secure reviewed material; never restore the exposed database credential.
- Database changes are forward-fix only. Never assume image rollback reverses schema/data.
- Any zero-tolerance failure stops the sequence before the next layer.

---

### Task 14: Build and prove the fresh production-scheme binary

There is no mobile production branch and the staging TestFlight binary cannot be promoted. Build `MurrorMobile` from the same approved mobile content after production services are green.

**Step 1: Repeat the collision-safe lane with a new number**

Load `mobile.staging_packaging_sha` from the signed lock and require the freshly fetched `origin/staging-environment-setup` to equal it. Any intervening source/configuration change invalidates the accepted RC and returns to Task 9.

From a clean canonical worktree, run `./scripts/ios-next-build.sh --dry-run` and require a successful App Store Connect query. Create a new isolated bump worktree from that exact locked SHA, run the script, prove its diff contains only the same five build-number files, commit, PR, and merge through the compare-and-swap merge queue. Then fetch, verify bump ancestry, and run `./scripts/verify-build-lane.sh`. The final production build gets its own globally unique number.

Record the merged SHA as `mobile.production_packaging_sha`. Prove the diff from the accepted staging packaging SHA is limited to the five script-generated build-number files, then rerun Task 9's release/configuration, native-build/launch, and hosted E2E finalizers with exact `headSha` equality.

Reload the script-written value before any archive path or command uses it:

```bash
RELEASE_BUILD=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' ios/MurrorMobile/Info.plist)
test -n "$RELEASE_BUILD"
```

**Step 2: Provision and hash the clean production archive worktree**

Securely provide `.env.production`, `ios/ExportOptions.plist`, dependencies, Pods, signing, and App Store API credentials. Record the normalized public configuration hash, restricted environment/export attestation IDs, secret-manager/resource versions, and exact dependency lockfile hashes.

**Step 3: Archive `MurrorMobile`**

```bash
./scripts/verify-build-lane.sh
yarn release:ios:preflight
xcodebuild archive \
  -workspace ios/MurrorMobile.xcworkspace \
  -scheme MurrorMobile \
  -configuration Release \
  -archivePath "/private/tmp/MurrorMobile-${RELEASE_BUILD}.xcarchive" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$ASC_KEY_PATH" \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID"
```

**Step 4: Inspect before export**

```bash
bash scripts/release/verify-ios-archive.sh \
  --environment production \
  "/private/tmp/MurrorMobile-${RELEASE_BUILD}.xcarchive" \
  /Users/astro/Projects/murror-transfer/Murror/docs/releases/ios-2.0.0/archive-contract.production.json
```

Expected: app and embedded extensions agree; production identifiers/hosts/entitlements/signing/privacy pass; staging/dev/localhost/placeholders and deferred Live Activity capability are absent; Hermes symbols pass or a signed watch-item exception exists.

**Step 5: Export/upload only with Astro authorization**

```bash
xcodebuild -exportArchive \
  -archivePath "/private/tmp/MurrorMobile-${RELEASE_BUILD}.xcarchive" \
  -exportPath "/private/tmp/MurrorMobile-${RELEASE_BUILD}-export" \
  -exportOptionsPlist ios/ExportOptions.plist \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$ASC_KEY_PATH" \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID"
```

Wait for the production app record to show the new build as processed/valid.

**Step 6: Exact-production-build smoke matrix**

Install the production TestFlight build. Repeat every environment-sensitive critical path: visible auth providers, paid/free entitlements, Solo purchase/restore, journal/AI, two-account Connection, transactional push, account switch, deletion request/local cleanup, crisis resources, extension behavior, and launch/relaunch. The staging RC matrix cannot substitute for this production-configuration proof.

---

### Task 15: Resolve App Store state and submit with manual release

**Step 1: Read the prior rejection**

Astro/App Manager reads the 1.1.0 rejection in App Store Connect and records the exact resolution in `go-no-go.md`. Do not assume the old issue is irrelevant to 2.0.

**Step 2: Complete the review packet**

Verify:

- the intended 2.0.0 version record and fresh production build;
- stable reviewer credentials and a concise core-flow walkthrough;
- Solo IAP products, pricing, agreements, tax/banking state, purchase and Restore instructions;
- account deletion location;
- accurate notification and no-Live-Activity claims;
- working support/privacy/legal URLs;
- privacy labels/nutrition, export compliance, age/content ratings, screenshots, release notes, and encryption answers;
- no Duo, Galaxy, voice, localization, optional notification, Live Activity, web, or Android promise.

**Step 3: Select release controls**

Select **manual release** and enable Apple's phased release for the version update. Astro approves submission; then submit and record review state changes and messages.

**Step 4: Prepare launch support**

Beacon prepares privacy-safe response paths for locked subscribers, purchase/Restore, login, deletion, refunds, notifications, and crisis escalation. Each path has a named launch-period owner, severity route, response-time target derived from support capacity, and handoff to the incident lead. Test the intake channel before submission.

---

### Task 16: Sign GO and run the seven-day phased launch

**Step 1: Final decision record**

`go-no-go.md` contains:

- version/build and all source SHAs/image digests;
- migration manifest and rehearsal receipt;
- production capability snapshot;
- evidence/owner for every hard gate;
- accepted watch items with owner and expiry;
- Astro-approved metric thresholds and zero-tolerance triggers;
- rollback/forward-fix manifest and support coverage;
- `GO`, `PAUSE`, or `NO-GO`, signed by Sentinel, Atlas, and Astro with PDT timestamps.

No verbal approval counts.

**Step 2: Manual production smoke while held**

After App Review approval but before release, rerun launch, sign-in, paid entitlement, one journal/AI flow, one two-account Connection state check, one transactional notification, and support/deletion/crisis navigation against live production.

**Step 3: Astro starts phased release**

Apple's phases are:

| Day | Cohort | Required evidence before allowing the next automatic phase |
|---|---:|---|
| 1 | 1% | Auth, entitlement, core journeys, infrastructure, crash/error intake, support intake |
| 2 | 2% | Oracle, Sentinel, Atlas, and Beacon report green against approved thresholds |
| 3 | 5% | Solo purchase/Restore and AI completion cohorts remain healthy |
| 4 | 10% | New vs returning accounts and transactional notification consent/routing remain healthy |
| 5 | 20% | No accumulating queues, migration/schema errors, refund, privacy, or deletion failures |
| 6 | 50% | Support capacity, old/new app compatibility, and baseline-relative metrics remain healthy |
| 7 | 100% | All gates remain green; continue seven additional days of active post-100% monitoring |

Apple advances automatically once per day. Pause before the next increment whenever evidence is incomplete. Manual downloads can still get the update during phasing, so server-side release-scoping controls and support coverage remain active.

**Step 4: Immediate pause conditions**

Pause and open an incident for any auth loop, paid-user lock, charge without entitlement, cross-account/private data exposure, wrong production environment, crisis-resource failure, deletion/privacy failure, data corruption, or Astro-approved threshold breach.

iOS has no binary rollback. Pause distribution, use only a pre-approved optional capability control, and cut any hotfix through the full build lane. CodePush is permitted only for a rehearsed JavaScript-only incident with unchanged native contracts.

---

### Task 17: Close the release and preserve continuation

**Files:**

- Update: `docs/releases/ios-2.0.0/release-manifest.md`
- Update: `docs/releases/ios-2.0.0/rollback-manifest.md`
- Update: `docs/releases/ios-2.0.0/go-no-go.md`
- Update: `docs/releases/ios-2.0.0/launch-log.md`
- Update in the shared checkout without overwriting concurrent content: `docs/CODEX-HANDOFF.md`
- Update owning API/AI/mobile release history documents

**Step 1: Record what actually shipped**

Capture final App Store version/build, release dates/phases, source SHAs, image digests, migration manifest/result, public configuration hash, restricted secret attestation IDs, App Review result, incident/watch items, support themes, and privacy-safe metrics.

**Step 2: Restore branch ancestry**

Back-merge any promotion or production hotfix commits into staging trunks with merge commits. Verify remote ancestry and content; do not squash a back-merge.

**Step 3: Keep deferred work separate**

Leave Duo, Galaxy, Spots, voice, localization, optional notifications, Live Activities, web, Android, iPad, and Watch dark. Give each a separate future design/evidence plan rather than silently activating it after launch.

**Step 4: Close only with retained evidence**

The release is complete after 100% rollout plus the seven-day post-100% observation period, no open P0/P1 incident, complete evidence links, updated handoff, and a signed closeout. Do not label the broader cross-platform product production-ready.

---

## Plan Self-review Checklist

- [ ] Every approved core-first requirement maps to at least one task and one objective exit condition.
- [ ] Every currently known blocker is present in the blocker ledger.
- [ ] All paths and commands point to the owning repository and real trunk.
- [ ] The plan continues PR #689 and existing workflows rather than rebuilding release machinery.
- [ ] No step hand-edits build numbers, bypasses branch protection, prints secrets, runs out-of-band DDL, or silently activates a feature.
- [ ] The migration plan fails closed on unapproved JA/Galaxy/new migrations.
- [ ] Staging and production binaries each use the shared collision-safe lane and exact-candidate proof.
- [ ] Mobile logic/staging-packaging/production-packaging SHAs and both environment-specific archive contracts are distinct and mechanically linked.
- [ ] Backend B1/B2 approvals, non-cancellable production runs, exact runtime/migration digests, Flyway rehearsal, and protected AI rollback are explicit.
- [ ] Backend rollback and database forward-fix are distinguished.
- [ ] App Store manual release, phased rollout, manual-download caveat, and no-binary-rollback reality are explicit.
- [ ] No unfinished marker or invented numeric health threshold remains.
