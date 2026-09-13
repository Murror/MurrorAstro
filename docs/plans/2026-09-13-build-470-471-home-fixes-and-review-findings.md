# 2026-09-12/13 — Builds 467 to 471, Mona's Home reports, and what three adversarial reviews found

## Context

iOS 2.0.0 only. Android and web stay parked until it ships. The goal for these two
days was to close every tester report from the 467 round, cut testable builds, and
keep both backends current in production.

## What shipped

### Builds
| Build | Commit | State |
|---|---|---|
| 467 | `3f66fe5f` | VALID, attached, re-read |
| 468 | (bump merge) | VALID, attached, re-read |
| 469 | `03d691ac` | VALID, attached, re-read |
| 470 | `7510ca74` | VALID, attached, re-read |
| 471 | from `7a1ec2a4` | in flight at time of writing |

Every attach confirmed by RE-READING the App Store Connect record, never by the
attach call's exit code. The 2.0.0 record sits at `PREPARE_FOR_SUBMISSION`.
`releaseType=AFTER_APPROVAL`, so approval is the release. Submitting is Astro's
decision alone and was not done.

### MurrorMobile
- `#1308` reconcile persisted draft reads
- `#1309` evict stale conversation draft before restore
- `#1310` defer dismissed share confirmation
- `#1312` stop marking streak days that have no voice, stop stacking old notes
- `#1313` stagger OSV exception reviews
- `#1314` localize recovery notices, explain the cross-device task gap
- `#1316` keep a populated pinned rail visible while sources load
- `#1317` stop asserting a name and an empty sky before they are known
- `#1319` do not blank Home offline, hold the name row open, scope the remembered name
- `#1320` report which pinned-feed source is still loading

### murror-api
`#998`-`#1002` (real HTTP statuses on refusal across connections, check-in, streaks,
invitations and articles), promoted to production as `#1003` (`ebda70b4`).

## Mona's two build-470 reports, traced

Both reached the same way: change Murror's camera permission in iOS Settings, which
restarts the app, then come back.

### A. The pinned rail went blank
`pinned-compact-feed-card.tsx` returned its fixed-height placeholder whenever
`isLoading` was true, BEFORE checking whether `cards` already held rows. `isLoading`
is an all-sources gate over seven queries (`use-pinned-feed.ts`), so one slow source
hid every card the user already had.

The fix is one line: `if (carouselData.length === 0 && isLoading)`.

An earlier, far more elaborate version froze a snapshot and remounted the carousel
under a changed key. Review killed it, correctly:
- **Critical**: the changed key made `useCarouselPageOffset` reseed, resetting the
  user's scroll position mid-read (measured: offset 0 on the branch, -550 with a
  static-key control), and left three sources of truth disagreeing.
- The frozen snapshot kept dismissed cards on screen AND tappable.
- The sparkle short-circuit marked cards seen before they were ever displayed.
- Its premise was unproven and contradicted by the carousel source on the
  `loop={false}` path this rail uses.

**Honest scope**: none of the rail's sources is persisted to disk, so a cold start
still shows the placeholder. This narrows the blank window from "slowest of seven
sources" to "first source that yields a card". It is NOT proven to be the whole of
Mona's report. `#1320` adds `rail_is_loading` and `rail_pending_sources` to the
existing geometry event so a recurrence is diagnosable instead of guessed.

### B. Home rendered twice
Home converted "not loaded yet" into claims about the person: an undefined profile
fell through `|| ''` to the default greeting, and undefined connections fell through
`?? []` into a genuinely-zero sky with the add-connection affordance.

The two seconds of black is `SplashScreen` doing real session and account-binding
work. It is NOT the `#1306` stranding bug, which is intact.

## What three adversarial reviews found, in code that was already green

Every one of these had passing CI, passing tests and mutation proof at the time.

1. **A false safety claim written into a docstring.** It justified returning `''`
   with "Home's name row is fixed-height". It was not: `styles.fixedName` declared
   only `alignItems` and `marginTop`. The row's sibling orbital band is `flex: 1`
   and measures itself into the constellation geometry, so a collapsing empty row
   would have shifted the whole sky.
2. **An offline dead-end this repo had already solved.** Queries run
   `networkMode: 'offlineFirst'`, so offline the retryer PAUSES:
   `fetchStatus: 'paused'` with `status: 'pending'`, indefinitely. Keying off
   `isPending` left offline Home with no name, no "+" and no explanation.
   `query-load-state.ts` exists precisely to stop surfaces re-introducing this and
   opens with "no surface can re-introduce the offline dead-end by copying its
   neighbour". Fix: read `isLoading`, which query-core derives as
   `isPending && isFetching`, so a paused query reads as settled.
3. **Two tests that could not fail.** Both "PAUSED offline" specs were
   byte-identical to existing tests, and the mocked hook could not express "paused"
   at all. Proven by reintroducing the exact regression and watching them pass.
4. **A privacy path.** `completeAccountCleanup` runs inside a stage that catches and
   continues, so a failed `multiRemove` leaves per-account keys; the owner marker is
   then deleted anyway; the next person's cache isolation takes the no-owner branch,
   which is the one of its three siblings that does NOT check the cleanup result.
   A surviving remembered name would have rendered person A's name on person B's
   Home. Fixed by storing `{id, name}` and reading only when `id` matches the current
   owner, so the guarantee no longer depends on a write succeeding.

Also caught: an account-level test that died on the device-level mutation but
SURVIVED the key being deleted from `StorageKeys` entirely, because
`Set.has(undefined)` is false and every assertion then compared `undefined` to
`undefined`. `comlete-account-clean-up.spec.ts` now asserts the wipe set directly.

## Still open, deliberately not fixed here

`account-cache-isolation.ts` discards the cleanup result on its no-owner branch
while both siblings guard it (`if (!cleanup?.ok)`). That is a latent gap for EVERY
per-account key, not just the remembered name. It wants its own change and its own
review.

## Test tracking moved off the artifact

The shared test board could never be writable by the testers. From the capability
contract: `artifact.publish()` requires the viewer to be a writer; sharing levels are
`interact` (view), `admin` (edit), `owner`; and even `interact` requires a signed-in
claude.ai account. There is no "anyone with the link can edit". `db` is worse: it
makes the artifact organization-internal.

Two wrong fixes were shipped before reading the contract. Tracking now lives in a
Notion database (`Build 470 test board`, under `Murror team updates`), one row per
check with a select column per tester. The artifact remains the read-only detail
page, which is what it is actually good at.

## Gotchas that cost real time

- `grep -c` counts matching LINES, not occurrences. The status board was called a
  112-row board for days; it is 122. Some lines carry two rows.
- `xcodebuild` reported exit 0 on a failed simulator build. Caught only by checking
  for `BUILD SUCCEEDED` and the `.app`, not the exit code.
- `prettier --check` on a nonexistent path exits 2 while printing "All matched files
  use Prettier code style!". Judge it on exit code with a control.
- zsh does NOT word-split an unquoted `$FILES`, so both prettier and eslint received
  one nonsense path and reported nothing useful.
- A shell pipeline's `$?` is the LAST stage's exit. `eslint ... | tail` reported 0
  while eslint was failing.
- Notion select options cannot contain commas.
- A fresh worktree has no `.env*`, so an archive dies after the build phase.
- pod install rewrites `PrivacyInfo.xcprivacy`, stripping 17 policy comments.

## Verification

- Full suite at the final base: 715 suites, 7,252 tests passed, 0 failed, exit 0.
- Every fix mutation-proven in both directions, with the mutation confirmed present
  in the file before running, and a literal `Tests: N passed` line demanded each time
  because a hung suite prints nothing under `--ci`.
- `tsc`, `eslint` and `prettier` all 0 on every change.
- All unit-level. **Nothing is device-verified.** The name row reservation is a
  layout change nobody has run.

## Heads-up

`#1318` ("Android Build 92 parity candidate") merged into
`staging-environment-setup` and is in the 471 tree. Despite the Android title it
touched shared `src/` files and added a `react-native-voice` patch, which
`patch-package` applies on both platforms. CI was green with it present, but it is
iOS-affecting change riding in an Android PR during an iOS-only window.
