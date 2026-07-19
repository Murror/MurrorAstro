# Galaxy Alpha pilot: design doc to 3D Discovery on TestFlight

- **Date:** 2026-07-18 (session spanning 2026-07-17 evening through 2026-07-18 evening)
- **Author:** Claude with Astro
- **Scope:** `murror-api` (7 PRs), `MurrorMobile` (14 PRs), 6 Alpha TestFlight builds
- **Status:** Alpha build 347 uploaded, flag-dark everywhere; dev-backend enablement still gated on Astro

## Context

Handoff from Codex: build the Galaxy pilot from the approved design
(`2026-07-09-galaxy-design.md`) and its 12-task implementation plan. Astro's direction
reframed it: pilot on the Alpha app, expand the existing orbital home "beyond the private
circle." Six specialist agents (heart / prism / iris / cortex / north / shield) brainstormed
before any code; Astro locked four decisions, then drove five device-feedback rounds.

Scope addendum: `2026-07-17-galaxy-alpha-pilot-addendum.md`.
API contract: `docs/contracts/galaxy-pilot-api.md` (kept in lockstep across all API PRs).
Dev enablement runbook: `docs/runbooks/galaxy-dev-enablement.md`.

## Locked decisions

| Decision | Value |
|---|---|
| Transition | Continuous zoom-out from day one, with a deliberate first-crossing threshold |
| Build order | Mock-first mobile (fixtures) + parallel API, one-line swap when ready |
| Intentions | All four including romance |
| Seeding | Dummy-user seeds plus team-written Signals; seeds labeled or purged before outside testers |
| Post-Orbit chat | The guided exchange thread continues unbounded; contact filter until mutual disclosure |
| My Space | NOT a redesign. At rest, flag-on renders the original `HomeOrbitalView` component |
| Activity feed | Hard UX rule: no silent state, every state change is visible |

## What shipped

### murror-api (all gate-dark behind `galaxy_enabled`)

| PR | Contents |
|---|---|
| #609 | Prisma models (8 tables, 8 enums), allowlisted card projection repository |
| #610 | Settings + signal publishing, publication validator, `GalaxyFeatureGuard` |
| #611 | Finite Field (cap 12) + decisions (heart/listen/pass/undo/not-interested/hide/block/report) |
| #612 | Exchanges, thread, Orbit state machine |
| #613 | Dev seed script + `seed:galaxy`, triple-guarded |
| #614 | Resonances hearts bucket (anonymous) + received-offer alias |
| #615 | Listen offers carry an optional opening message |

Guard tiers: dev/alpha env-default ON; staging and production dark behind the default-off
Statsig gate, so a staging graduation is a deliberate flip, not a deploy.

### MurrorMobile (all flag-dark behind `galaxy_enabled`, dev-scheme default only)

| PR | Contents |
|---|---|
| #762 | Foundation: flag + resolver, persisted-cache exclusion, API client + fixtures, hooks |
| #763 | Orbit view + continuous zoom-out + threshold veil |
| #765 | Signal card, list view, decisions |
| #766 | Setup sheet, composer, preview gate, own-signal lifecycle |
| #767 | Lazy-load the composite off the flag-off Home path |
| #769 | Resonances, exchange thread, Orbit graduation |
| #770 | My Space at rest = original home component + small header toggle |
| #771 | Modal-layer primitive; every surface matches the app's sheet language |
| #772 | Listen opens the composer; activity feed |
| #773 | 3D orbit prototype (depth, pan, dolly zoom) |
| #774 | Toggle stacking fix (see gotchas) |
| #775 | r344 feedback round: stacked-modal bug, veil race, heart-stays-active, listen-into-thread |
| #776 | 3D Discovery galaxy: spherical camera, golden spiral, fog/bloom/nebula, redesign |
| #780 | r345 feedback round: veil root cause, full-bleed, keyboard, connection lines, consistency |

### Builds

342 (first fixture Galaxy), 343, 344 (toggle hotfix), 345 (3D), 347 (r345 round).
346 was the concurrent Duo session's build.

## Gotchas worth keeping

1. **The veil bug had two root causes, and the first fix was wrong.**
   Symptom: the first-crossing veil appeared on every entry. First diagnosis (#775) was an
   async race, and the fix stranded returning users at the threshold on motion-enabled
   devices (caught in review, not on device). The real cause, found by read-only recon in
   #780: `getFromLocal` in `src/common/local-storage.ts` runs `JSON.parse` on every read, so
   the stored string `'1'` returns as the **number** `1`, and `value === '1'` is false
   forever. Fix is read-side (`String(value) === '1'`), which retroactively honors devices
   that already committed. **Repo-wide trap:** any numeric-looking string stored through that
   wrapper coerces on read. Use truthiness, non-numeric tokens, or `String()` compares.
   **Test blindness:** the composite spec mocked the persistence module wholesale, so no test
   crossed the real wrapper. Keep at least one real round-trip spec per persisted flag.

2. **Native hit-testing is invisible to jest.** Build 343's Galaxy toggle rendered perfectly
   and was completely dead: `MainTabHeader` floats at `zIndex: 99` and renders transparent on
   the flag-on home, so it ate every tap aimed at the toggle overlay below it. RNTL fires
   presses directly at components, so no unit test can catch this. Fix: `GALAXY_TOP_TOGGLE_Z
   = 100` with a spec pinning the constant above 99. Same class: the 3D gestures never fired
   because the `GestureDetector`'s child was `pointerEvents="box-none"`, so field touches fell
   through to nothing. Fix: real touch target plus `minDistance(8)` for tap/drag split.

3. **Two stacked RN Modals do not present reliably on iOS.** Listen-from-list opened the
   composer as a second Modal over the list page's Modal and simply never appeared. One
   surface at a time: close the current surface before opening the next.

4. **Overlays inside `fixedOrbital` are clipped.** That band has `overflow: 'hidden'`, so
   in-tree absolute-fill layers clip to the middle of the screen (the build-342 sheet bleed
   and the build-345 "bounding box"). Modals escape via RN `Modal` portals; the 3D scene
   needed hoisting to a `galaxyFullBleed` absolute layer at `fixedRoot` (zIndex 98, below the
   toggle's 100).

5. **Alpha build numbers moved to the shared lane.** Memory said Alpha ran its own sequence
   from 178; App Store Connect showed 341. Always query ASC before choosing. With a
   concurrent session active, use `scripts/ios-next-build.sh` (canonical remote + 1), merge
   the bump PR **first**, then archive: that reserves the number remotely so the other
   session's next run cannot collide.

6. **`/tmp/envfile` is a shared global.** Check `pgrep xcodebuild` before writing it; a
   concurrent archive can clobber it mid-build and leak the wrong backend into extensions.

7. **`ios/ExportOptions.plist` is not in the repo.** Create it per build (method
   `app-store-connect`, destination `upload`, automatic signing,
   `manageAppVersionAndBuildNumber` false).

## Review findings caught before merge

Every PR went through an adversarial review plus independent verification. Notable catches:

- **HIGH, #612:** a quietly-declined sender who re-tapped Listen received `{state: "DECLINED"}`.
  Sender-facing state now normalizes every non-accepted state to `PENDING`.
- **HIGH, #612:** the exchange moved to `WAITING_FOR_CONTINUATION` on the first continue vote,
  letting a participant infer their counterpart had voted yes. Early yes now leaves the state
  `ACTIVE`.
- **BLOCKER, #775 fix:** the veil fix stranded committed users mid-transition (above).
- **MEDIUM, #776:** star `Pressable`s hit-test in array order, so a far-side dot could steal a
  tap and heart the wrong person. Taps now resolve depth-primary via `resolvePressedStarId`.
- **MEDIUM, #771:** the first-time setup sheet could stack on the veil (two native Modals).

## Verification

Final state on `staging-environment-setup` at build 347: `tsc --noEmit` clean; galaxy suites
371/371 across 33 suites; the concurrent session's Duo and home suites 23/23 unaffected; zero
diffs under `src/screens/onboarding` and `src/components/orbital`; flag-off Home byte-identical.

Build 347 archive verified: 347 across app and both extensions, `dev.api.murror.app` baked,
zero `staging.api` references.

## Still open

- **Dev enablement (Astro-gated):** apply the four Galaxy migrations to the dev database,
  deploy the API to the dev cluster, run `seed:galaxy`, then flip `GALAXY_USE_FIXTURES` off.
  Runbook: `docs/runbooks/galaxy-dev-enablement.md`.
- **Swap-time reconciliation:** mobile `GalaxyReceivedOffer.intention` maps from the API's
  `intentions[0]`; `receivedAtLabel` is client-formatted from `createdAt`; the server excludes
  resonated signals on field refetch while the client now keeps hearted cards visible.
- **Device eyeball on 347:** veil once-ever across round trips, full-bleed framing, connection
  lines, rotation feel, tap accuracy on a crowded field.
