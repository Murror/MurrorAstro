# 2026-08-21 — iOS archive restored, build 441 uploaded, plus the parallel Codex lanes

Covers 2026-08-18 through 2026-08-21. Supersedes the mid-flight notes in
[`2026-08-20-ios-release-lane-unblock.md`](./2026-08-20-ios-release-lane-unblock.md),
which was written while the hermetic lane was still believed viable.

## Headline

**Murror 2.0.0, build 441, is archived and uploaded to App Store Connect** and attached to
the 2.0.0 version record. It is the first successful production archive since build 432 on
2026-08-13, ending sixteen consecutive failed attempts.

## Part 1 — the iOS release lane (owned here)

### The question that unlocked it

"How come we could build other versions but suddenly now we cannot?" The answer was
archaeological, not technical:

| When (PDT) | What |
|---|---|
| Aug 13, 16:32 | Build 432 merged (`5b1c2c67`) |
| Aug 13, 16:46 | Build 432 **uploaded** to ASC, the last successful upload |
| Aug 13, 21:04 | `d3dce65e` created the hermetic release lane |
| Aug 13, 22:26 | `fa585126` added the read-only seal |
| Aug 14 -> Aug 20 | Builds 433-440, all through the new lane, zero xcarchives |

`d3dce65e` did not merely add a lane beside the build. It **rewrote the app's own production
bundle build phase** in `project.pbxproj` so that `install:iphoneos:Release`, which is exactly
what `xcodebuild archive` sets, routes through `xcode-bundle-with-sentry-disabled.sh` under
`env -i` with a contract of `MURROR_RELEASE_*` variables only the hermetic driver sets. From
that commit onward a production archive was structurally impossible outside the lane.

### Why the lane could not finish

The seal asserts that the Xcode build never writes to its dependency trees. For React Native
that is false. Three distinct writers were found and individually patched, each costing a
digest re-baseline and a build number:

1. Hermes engine swap writes into `ios/Pods` (#1123)
2. Per-pod compatibility-header modulemaps, 15 pods, write into `ios/Pods` (#1125)
3. `react-native-config` codegen writes `ReactNativeConfig.m` into `node_modules`

The remaining writers are **not enumerable by inspection**, because the writes happen inside
tools the build phases invoke rather than in the phase scripts themselves. A grep over the
generated phases surfaces only the ones already fixed.

Independent confirmation arrived from a stranded background task discovered on 08-21: a
reproduction run from 08-20 11:13 measured the Pods tree at exactly the re-baselined digest
`d0a729fc...506b4a` and the lane **still** failed with "Fresh Pods tree does not match the
reviewed tracked tree digest". A perfectly reproduced digest did not satisfy the lane.

### The revert, and the wrong target that CI caught

First attempt reverted to `d3dce65e^`. CI rejected it, informatively: that intermediate
wrapper calls BSD `stat -f '%u'` unconditionally, which cannot pass the Ubuntu test runner
that has executed every `scripts/ci` test since `1e196096` (08-11). **`d3dce65e^` was an
unvalidated intermediate that never had a green CI run.**

The only state proven both green in CI and able to archive is `5b1c2c67`, the merge that
built 432. At that commit the wrapper and its 2,143-line contract test **did not exist**; the
bundle phase was stock React Native.

### What landed — PR #1127 (`79ee0d68`), 8 files, +18 / -3,189

Restored to `5b1c2c67` content:

- the production bundle phase in `project.pbxproj`: stock
  `with-environment.sh` -> `react-native-xcode.sh` through `sentry-xcode.sh`. One line, the
  only pbxproj change, verified byte-identical by checksum against git.
- `scripts/ci/metro-watchman-policy.test.mjs`
- `src/config/ios-production-sentry-build-phase.spec.ts`, the jest spec that executes the
  bundle phase against fixtures

Deleted, because they did not exist at `5b1c2c67`:

- `scripts/release/xcode-bundle-with-sentry-disabled.sh`
- `scripts/ci/sentry-archive-contract.test.mjs`
- the two CI steps running that test file, and the workflow-contract pin for the removed step

**One deliberate divergence from the 432 bytes:** the phase also exports
`SENTRY_DISABLE_AUTO_UPLOAD=true`. Without it `sentry-xcode.sh` attempts a sourcemap upload
and **fails the archive** (its line 39) when no valid token is present, and the previous token
is revoked. Symbol upload stays an explicit post-archive command.

The retained release driver lost its `verify_tracked_tool` line for the deleted wrapper so it
remains runnable.

### Codex review — four findings, all actioned before merge

Codex reviewed #1127 and blocked it as written. Verified against the code, all four were real:

| Finding | Verification | Resolution |
|---|---|---|
| Can re-enable Sentry auto-upload during archive | Worse than stated: it **fails** the archive, token revoked | phase exports the disable |
| Deletes a script the retained driver still requires | Confirmed, driver line 387 | dead `verify_tracked_tool` removed |
| Restores outdated Android/Fastlane/tag/manual-number guidance | Confirmed, the 432 checklist says "Update Android versionName", "fastlane ios beta" | `release-checklist.js` + its test stay at canonical |
| Source changes invalidate 440, scripted 441 mandatory | Correct per the single-build-lane rule | #1128 cut 441 via `ios-next-build.sh` |

Codex also recommended returning to the lane from a genuine standalone clone rather than a
worktree. **Not adopted**, on evidence: a standalone clone fixes only the `.git`-directory
guard, while the wrapper still demands the driver-only `MURROR_RELEASE_*` bootstrap. That path
is "run the driver again", and the driver's blocker was the seal, not the `.git` guard.

Codex's separate diagnosis of *why* the worktree failed was correct and is recorded:
build 440 archived from a linked worktree whose `.git` is a pointer file, and CI never caught
it because CI builds a simulator with `ACTION=build` while the failing branch runs only for a
real `install:iphoneos:Release` archive.

### Other lane defects fixed 08-18 to 08-20

- **#1119** vendored `@rneui` as tarballs. Yarn's `file:` protocol hashes a vendored
  *directory* including file modes, so the lockfile hash depended on the installer's umask
  (022 -> `hash=2abd57`, 077 -> `hash=fd848c`). The lane runs umask 077; CI and dev run 022.
  One lockfile could not satisfy both, and CI stayed green because it never runs at the lane's
  umask. This killed build 436 with YN0028.
- **#1121** narrowed the xcuserdata scheme guard; review found a UTF-16 bypass, fixed by
  reading bytes and refusing any scheme containing NUL.

### Local environment traps recorded

- `pod install` under the repo's pinned toolchain (Ruby 3.4.1 via rbenv + bundler) reproduces
  canonical's `Podfile.lock` exactly. Bare system CocoaPods under Ruby 3.2.0 rewrites ~47 spec
  checksums; Ruby 3.3.5 leaves one residue (`RCT-Folly`). Earlier belief that canonical's
  lockfile was hand-maintained drift was **wrong** and is corrected here.
- CocoaPods throws `Encoding::CompatibilityError` on its own install path when `LANG` is
  unset, because Ruby defaults to US-ASCII and `unicode_normalize` refuses ASCII-8BIT.
- `.env.production` carried the retired `BASE_API_URL` host. Both hostnames resolve to
  `129.212.209.109` and return identical `/api/health` payloads; commit `a3fb62c0`
  ("reject stale production API host") is the deliberate deprecation. Fixed in the build
  worktree only.

### Verification of the shipped artifact

Measured in `/tmp/MurrorMobile-441.xcarchive`, not assumed:

| Check | Result |
|---|---|
| App `CFBundleVersion` / `CFBundleShortVersionString` | 441 / 2.0.0 |
| `AppWidgetsExtension.appex` | 441 / 2.0.0 |
| `OneSignalNotificationServiceExtension.appex` | 441 / 2.0.0 |
| API host in binary | `https://api.murror.app` |
| Supabase ref in binary | `dcftszkbpamgeivhtuzl` (production) |
| dSYMs | 19 |

Archive exit 0 in 4 minutes. Export/upload exit 0 at 21:52 +07 with `Uploaded MurrorMobile`.
ASC listed 441 as `VALID` by 21:57. Attached to version record
`c89c6942-4771-45aa-8ce9-570f86e30ae9`, replacing build 141 from April; the record moved
`REJECTED` -> `PREPARE_FOR_SUBMISSION`.

Also verified on the record: demo account is `review@murror.app` (the only account with a real
email identity, and the fix for the 1.1.0 rejection), and the 2.0.0 release notes are in place
for `en-US` and `vi`.

### Still unverified

- No device test yet. Build 441 has never run on physical hardware.
- Sentry symbol upload not performed; 19 dSYMs sit in the archive awaiting a rotated token.
- The demo account **password** and the `MurrorTester107` offer code could not be read back
  from the API and need human confirmation.

## Part 2 — Codex lanes running in parallel

### Web parity (murror-platform, `staging`)

PRs #356-#374 merged 08-19 into `staging`, roughly 419 commits across 08-19 to 08-21. Themes:
authenticated routes and contracts, Home and Diary aligned with production iOS, the iOS
recovery OTP flow completed, Family and Subscription locale parity, a global locale-key guard,
Duo policy contracts aligned, and a parity ledger recording remaining forward gaps.
English-only language picker landed (#365/#366), consistent with the launch scope decision.

Note the standing hazard: PRs into `staging` on this repo receive **zero CI**, because the
workflow triggers on `[main, dev]` only, and branch protection is unavailable on the plan.

### Marketing site (murror-platform, `feat/marketing-site`)

- **#355** early-access signup capture: lifecycle state, attribution, and fan-out to Resend,
  Slack and PostHog. D1 stays the system of record and is written first.
- **#372** early access became a **reviewed application**. Submitting records
  `review_status='pending'`, `tier='waitlist'`, and grants nothing; the posted tier is ignored
  and a reviewer decides.
- **#378** fixed a real bug in that flow: approving an applicant added them to a Resend
  audience and mailed them nothing, while the confirmation page claimed the welcome was sent.
  Audience-add does not trigger a Resend Automation. Now sends directly.
- **#375** PostHog events for the feedback form, client-side only.
- **#367** feedback media sync so submitted photos and videos are viewable in the Notion CRM.

### Android (MurrorMobile, branches only)

338 commits authored as `mergesim` since 08-18, 139 of them on 08-21: reflection accessibility
semantics, pinned native toolchain validation, Play policy evidence, api36 runtime receipts.

**Zero of these are reachable from `staging-environment-setup`.** Verified with
`git log origin/staging-environment-setup -- android/` since 08-18, which returns 0. The
iOS-only product scope holds on canonical. Flagged because Android hosted-runner builds are
~45 minutes each and the rule requires explicit authorisation before spending them.

## Part 3 — stranded background processes

Two independent sets of orphaned processes were found and killed on 08-21:

1. **Seven `gh pr checks` watchers** from a dead peer session, running 3 days 21 hours. Their
   exit condition was `gh pr checks 333 --required`, and murror-platform has no required
   checks, so the loop could never terminate even though PR #333 merged on 08-17. Estimated
   ~40k GitHub API calls per day, a plausible contributor to the GitHub 429s seen during the
   `@rneui` work.
2. **A re-baseline task at 22h15m**, whose measurement had actually completed at 08-20 11:13;
   a wedged `ugrep` child kept the task alive. Its captured output is the reproduction evidence
   quoted above.

Lesson recorded in memory as `feedback_background_watcher_needs_reachable_exit`: a polling
loop needs both an exit condition that can occur on this repo and plan, and a hard cap.

## Follow-ups

1. Device test build 441 on physical hardware: email login fail-then-retry, logout-then-login.
2. Confirm the demo account password and the `MurrorTester107` offer code, then submit 2.0.0.
3. Rotate the Sentry token and run the explicit dSYM upload.
4. Delete the dead lane branches: `fix/pods-compat-header-writable`,
   `fix/hermes-release-before-seal`, `fix/unseal-build-written-trees`, `chore/bump-4NN`.
5. Post-launch, decide deliberately whether to reinstate the lane's protections. Three are
   worth restoring on their own merits regardless of the seal: `env -i` isolation against
   `BASH_ENV` and exported-function injection, tracked Xcode environment `NODE_BINARY`
   validation, and the CSS interop cache redirect that keeps generated files out of
   `node_modules`.
6. `scripts/release/release-checklist.js` still describes the driver-oriented archive flow.
   Documentation debt now that the driver is not the archive path.
