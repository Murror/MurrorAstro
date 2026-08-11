# 2026-08-11: Build 429 to TestFlight, and the extension floors that hid the widgets

Session ran 2026-08-10 late evening into 2026-08-11 PDT. Two shipped outcomes and
one corrected diagnosis. Codex was working in parallel throughout, so ownership
boundaries mattered more than usual.

## 1. Build 429 shipped to TestFlight

**Why.** Build 428 was archived from `32927636`. Three security fixes merged to
`staging-environment-setup` after that point, so nothing testable carried them:

| Commit | PR | Fix |
|---|---|---|
| `9a95a943` | #1073 | deep links matched anywhere in the string, not on the path |
| `8628fd63` | #1075 | deep-link destination and ids resolved from the path (SEC-427-004) |
| `6a6e58a6` | #1076 | iOS bridge app group guard now fails closed |

**What shipped.** Build `2.1.0 (429)`, bump PR #1078, merged as `7e0b6678`.
Uploaded 2026-08-11T00:21:23-07:00, `VALID` on App Store Connect roughly five
minutes later.

**Lane discipline.** The number came from `scripts/ios-next-build.sh`, which
reported `canonical=428 local=428 asc=428 -> NEXT BUILD = 429`. App Store Connect
was reachable, so the number is verified against Apple rather than derived from
git alone. `scripts/verify-build-lane.sh` correctly refused to archive until the
bump PR merged, then passed all three gates.

**Verification.** Recorded at the tier the 427 audit asks for, not one tier lower.

- `** ARCHIVE SUCCEEDED **` present in `/tmp/archive-429.log`
- app `429`, `AppWidgetsExtensionStg.appex` `429`, `OneSignalNotificationServiceExtensionStg.appex` `429`, zero mismatches
- `staging.api.murror.app` present in the native executable, `dev.api.murror.app` and `murror.api.ambercare.app` absent. Read as bytes in Python, never grepped from the Hermes bundle
- all three fix SHAs proven ancestors of the archived commit
- `Uploaded MurrorMobileStaging` and `** EXPORT SUCCEEDED **` both present in `/tmp/export-429.log`
- App Store Connect reports build 429 `VALID`

Only warning was `Upload Symbols Failed (hermes.framework)`, which
`docs/runbooks/ios-build.md` documents as warning-only. It is the same missing
Hermes dSYM the 427 audit already tracks, so it is pre-existing, not new.

## 2. QA-427-001: the extension floors were hiding widgets and Live Activities

**The defect.** The host app declares iOS 15.5. The AppWidgets extension declared
18.5 on every scheme, and the production OneSignal service extension declared
18.1 while staging, development and ODE ran the same code at 15.5 and 15.1.

An `.appex` whose `MinimumOSVersion` exceeds the host's is not loaded at all below
that floor. Not degraded, absent. Measured in the shipped build-429 archive: host
`15.5`, `AppWidgetsExtensionStg.appex` `18.5`.

So below 18.5 every widget was gone, and so were Live Activities, because
`MomentLiveActivity.swift` compiles into that extension and guards itself
`@available(iOS 16.2, *)` in five places. Nothing crashed and nothing logged, so
the symptom reads as low widget adoption rather than an impossible feature.

**Root cause.** No iOS 18 API is used anywhere in the extension. The highest
availability marker in the source is `17`, for `containerBackground`, with six at
`16.2`. The floor arrived with `fc36f7ee`, which created the widget targets. It is
the Xcode new-target default, not a product decision.

The wrong floor had also propagated into source. A comment in
`AppWidgetSpark.swift` reasoned "the widget target deploys to iOS 18.5, so
containerBackground is unconditional", which is a build setting justifying the
deletion of an availability branch. Corrected in the same change.

**Fix.** PR #1079, commit `715ff17b`.

| Target | Before | After |
|---|---|---|
| AppWidgets, all three schemes | 18.5 | 17.0 |
| OneSignal service, production only | 18.1 | 15.5 |

Strictly additive. The host is untouched, so no device supported today loses
support.

**Verification.** Release build for `generic/platform=iOS` on both the staging and
production schemes. `** BUILD SUCCEEDED **`, zero real diagnostics, zero
`is only available in iOS` failures, zero link errors. Built product
`MinimumOSVersion` read back from the artifacts:

| Scheme | host | AppWidgets | OneSignal |
|---|---|---|---|
| Staging | 15.5 | 17.0 | 15.5 |
| Production | 15.5 | 17.0 | 15.5 |

The production scheme was compiled specifically because the OneSignal change only
lands there. Verifying staging alone while changing both would have been a half
fix.

## 3. Corrected diagnosis: the workspace guard is not broken

`verify-murror-workspace.sh` was logged as defective twice on 2026-08-10 with
`line 19: A: unbound variable`. It is not defective.

The guard is `#!/bin/zsh` and uses `${0:A:h}`, which is zsh-only. Under bash that
parses as substring expansion `${param:offset:length}`, so `A` is evaluated as an
arithmetic variable, `set -u` trips, and the script dies before doing anything.
Run with zsh it prints `PASS` and exits 0, from the vault root and from nested
worktrees alike.

The bug was in the invocation, one frame earlier than where it was observed. This
matters because "fixing" line 19 for bash would drop `:A`, losing symlink
resolution and reintroducing exactly the `~/Projects/murror-transfer` versus
`/Volumes/SSD990/...` mismatch the 2026-08-10 refactor existed to remove.

## Codex no-clash notes

Codex was active in four worktrees during this session: `codex-ci-deps-lane`,
`codex-ios-production-427-audit`, `codex-ios-production-release-unblock-20260810`
and `codex-ios-notifications-audit`. Work stayed inside the build lane, which the
427 audit design assigns to Claude, plus one Claude-owned source fix.

- No Codex-owned file was edited. `src/config/ios-build-lane-canonical-content.spec.ts`
  was run to prove it still passes, not modified.
- PRs #1069, #1040 and #1004 are Codex-authored. An earlier suggestion to close
  #1069 in favour of #1074 was withdrawn once authorship was checked.
- The abandoned `MurrorMobile` main checkout was left untouched. It sits on
  `fix/prod-bundle-phase-node-resolution` at build 380 with a dirty tree at build
  392, which is stale but not this session's to clean.

## Still open

- **SEC-427-001** remains the largest source-level security blocker. All schemes
  still share `group.com.murror.widget`, and `ios/RNWidgetBridge.m` writes access
  and refresh tokens into that suite, so production and staging credentials share
  a container. The migration is a one-way door on device and is gated on Astro.
- PR #1079 is open pending CI. CONVENTIONS section 8 wants a domain-specialist
  review pass before a TestFlight cycle carries it.
- The 427 audit verdict is unchanged at NO-GO for public release. Device and
  provider gates (subscriber lock, upgrade from the live 1.0.19, StoreKit matrix,
  push delivery) all remain untested and need a physical device.
