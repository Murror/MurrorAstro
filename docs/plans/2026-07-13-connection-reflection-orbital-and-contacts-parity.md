# 2026-07-13 — Connection Reflection orbital redesign, contacts-tab parity, unified colors

## Context
Astro asked to redesign the Connection Reflection detail page (`RelationshipMoreInsightScreen`)
using the dots/constellation orbital visual language from onboarding-v2 (now also powering the
"State of Your World" home). The work expanded through the day into a device-feedback round,
a graduation to staging, an avatar bug fix, a contacts-tab parity re-skin, and an app-wide
per-person color unification.

All mobile UI ships behind flags (flag-dark on staging until an Alpha device pass), on the
`staging-environment-setup` lane. Design was driven by multi-agent panels (prism/heart/iris +
muse/north) and mandatory inline mockups before every build.

## What shipped (MurrorMobile, all merged to staging-environment-setup)

### Connection Reflection detail redesign — PR #675 (merge 55f57880)
- New flag `enable_connection_reflection_orbital` (resolver `src/utils/connection-reflection-variant.ts`,
  clone of home-variant: override -> gate -> dev default). Flag-off byte-identical.
- `src/screens/main/Diary/orbital-reflection-detail.tsx`: two-node circular constellation hero
  (`relationship-orbital-hero.tsx` + `relationship-orbital-hero-geometry.ts`, forced rx==R circular
  geometry, one-shot line-draw on the loop clock — T12-safe, joined/waiting states), one dark sky
  (HomeOrbitalBackground reuse), dark-glass section cards (`dark-glass-card.tsx` +
  `dark-glass-tokens.ts`), node-anchored bubbles, floating quote, vertical journey timeline
  (`connection-journey-model.ts` + `connection-journey-timeline.tsx` + `connection-journey-layout.ts`).
- Phase 1 (murror-api origin date) turned out to need NO backend work: the bundle already ships
  `connectionType.connectionDetails.createdAt`.
- 2 adversarial reviews (sentinel + iris) + compassion review. Freemium star-gate finding fixed
  (journey stars inherit `useEntitlement('connectionInsights')`, no LockedCard bypass).

### i18n insightLabel — PR #676 (9235051)
- `relationship.insightLabel` was missing from all locales (both detail screens used a defaultValue),
  so vi/ja saw hardcoded English. Added to en/vi/ja. Landed separately because it changes the
  control screen's vi/ja rendering.

### Dark-glass primitive consolidation — PR #677 (56cb0e31)
- Extracted `dark-glass-tokens.ts` (pure) as the single source for the build-269 glass values;
  `insight-card.tsx` flip back migrated to spread `darkGlassSurface` (render-identical, value-locked spec).

### v3 device-feedback round — PR #685 (merge c5dcae5a)
- Astro's build-176 device feedback: journey renamed to plain "sharing" language (no star/sky
  metaphor), yearless date under every stage + "You are here", tappable-dot rings + chevron,
  full-width "PAST SHARING · <date>" banner at the top when a journey dot opens a past sharing
  (new optional route params `openedFromJourney`/`journeyDateISO`), Dive Deeper moved to page bottom,
  no text truncation. Review nits fixed (banner-separator guard, chevron a11y).

### Graduated to staging — PR #687 (merge e6e22021)
- `resolveConnectionReflectionOrbital` env default `development` -> `development || staging`
  (the #673 home/moments graduation pattern). Production stays gate-controlled.

### Contacts tab orbital re-skin — PR #689 (merge 6f1315b7)
- New flag `enable_connections_tab_orbital` (dev-only default; staging/prod dark until Alpha pass).
- `relationship-screen.tsx` + `friend-card.tsx` gain an `orbital` variant: HomeOrbitalBackground sky,
  dark-glass rows, per-person PAL hue avatar ring, "Since <month year>" trace from the connection
  origin (NOT last-activity — heart's neglect-shame rail), calm copy reframes (invitation-sent instead
  of the dashed rejection box, Accept / Not now equals, gentle empty state). Flag-off byte-identical.
  Single logic source (conditional styling), FriendCard has one consumer.

### Unified per-person color — PR #692 (merge 9b9173ce)
- `src/utils/person-color.ts`: canonical `personColor(id)` = the reorder-stable hash-into-PAL.
  Share sheet + journal picker migrated off ordinal `brandedConnectionColor`; `connection-colors.ts`
  kept + deprecated. Home (`home-orbital-scene-model.ts`) was DOUBLY divergent (FNV hashStringUnit
  seed + could paint gold) and got aligned. `journeyStarColor` is now a thin alias so all existing
  consumers + specs are byte-identical. 54 targeted tests green. NOT flag-gated (pure color); Astro
  approved including it in Alpha 178 despite Home being live on staging (cosmetic, prod frozen).

## Fixed
### Alpha avatar-revert bug (dev backend roll, no code commit)
- Symptom: changing profile avatar showed immediately, reverted to old photo after tab switch.
- Root cause (iris round-2 on the correct lane-tip code; round-1 read a 35-commit-stale checkout):
  mobile r8 cache-bust plumbing is correct, but the first stale-profile refetch overwrote the busted
  URL and the DEV backend ran `0.211.0-staging` (= #592, PRE the #595 avatar URL versioning), returning
  BARE Supabase URLs that immutable FastImage pinned to old bytes.
- Fix: rolled `nsp-dev-murror` murror-api `0.211.0-staging` -> `0.214.0-staging` (staging's exact image;
  span #593-595 verified code-only, no migrations). Health green, change-cause annotated. Astro's
  stored avatar stays bare until his NEXT change (versioning applies on upload).

## Builds cut (isolated throwaway worktrees, dev-app sequence, shared lane undisturbed)
- Murror Alpha 173 (redesign), 176 (post-#675-merge), 177 (v3), 178 (contacts + colors).
- Staging 310 (reflection detail graduated, MurrorStg scheme).
- All verified app + both appexes at the right number + correct baked ENV before upload.

## Gotchas recorded
- Build-recipe: set build numbers AFTER provisioning finishes (a concurrent yarn/pod-install reverts
  the pbxproj, baking mismatched appex numbers = App Store rejection). Verify appex CFBundleVersion
  parity in the archive before upload. `ios/ExportOptions.plist` is untracked — copy from the main
  checkout into each fresh worktree.
- Never run repo-wide `yarn lint --fix` (contaminates other sessions' files incl byte-locked onboarding
  core). Fix per-file.
- Stacked PR #677 was mistakenly merged into its already-merged base branch (a dead end); re-landed via
  cherry-pick. GitHub only auto-retargets when the base branch is deleted.
- Investigate in a lane-tip worktree, never the main checkout (was 35 commits stale mid-day).

## Verification
- Per PR: tsc clean, targeted jest green (never the full suite — it hangs), 0 lint errors on touched
  files, adversarial review before each build, flag-off byte-parity proven.
- Device pass owed from Astro on Alpha 178 (contacts tab + same-person-same-hue across surfaces).
- VI/JA copy drafts owed Astro's native pass on all new strings.
