# Production promotion and the 455 build attempt, 2026-09-03

Continues `2026-09-02-launch-readiness-aug30-sep02.md`. Window: 2026-09-02 20:08
+07 to 2026-09-03 09:46 +07. Token volume for the window: 315,813,437.

## 0. A new standing rule from Astro

> *"i want all the latest work to be on production for test so apply for both as
> a rule for me."* Clarified: *"since production is where we are trying to get it
> to launch, we need to test for real on production and staging can inherit the
> updates."*

**Production is the PRIMARY environment**, not the last stop. It is the launch
target and the surface Astro tests on, because his accounts live there. Staging
is secondary and inherits. Recorded as
`feedback_keep_production_current_for_testing`.

The concrete consequence: **"merged to staging" is HALF DONE.** A fix is not
testable until it is promoted, and reports must say which of the two actions it
still needs. Staging was 45 commits ahead of production, which is why none of
the four Connection Reflection bugs Astro reported from his phone could be
verified.

## 1. The two location PRs landed

- **murror-api #903** `03ec16f4`. After review the coordinate-preserving change
  was REVERTED entirely; the merged diff is three log calls plus a spec that
  locks the clearing in. Verified by stripping comments and diffing executable
  code only: the upsert update branch is byte-identical to trunk.
- **MurrorMobile #1198** `63521a3a`. Coarse location, opt-in only.

### What the re-reviews found

- **#903:** the source guard at `connection.repository.location-clearing.spec.ts:218`
  used `not.toContain("this.logger.log('" + tag)`, which a **Prettier line wrap
  defeats**. Proven by mutation: reintroducing the bug in the shape Prettier
  produces left all 7 tests green. Measured headroom was 4 chars for
  `[ATOMIC_TASK_START]` and 9 for `[ATOMIC_TASK_RESET]`, so a ten-character
  message edit would have hidden a regression. Fixed with a regex covering the
  wrap, a method downgrade (`\w+`) and quote-style swaps, plus a proper escape
  helper. `[ATOMIC_TASK_RESET]` had NO other test, so it was the one tag where a
  regression would have shipped green.
- **#1198:** no Critical. The no-prompt property reproduced exactly (mutating
  `check(` to `request(` kills 7 of 8 tests where it previously left all 4601
  green). Full-suite reconciliation base 4584 -> head 4619, delta fully
  accounted for by the three touched spec files, which closed the author's own
  flagged unknown about the new geolocation automock.
  - Important finding I-1: **nothing guarded the Info.plist key.** The library
    greps for the literal `NSLocationAlwaysUsageDescription`; we ship
    `NSLocationAlwaysAndWhenInUseUsageDescription`, one word away. Adding the
    former flips `wantsAlways` and every reflection would request an
    authorization upgrade. Now guarded with a positive control.

## 2. Both backends promoted to production

| Repo | PR | Payload | Result |
|---|---|---|---|
| murror-api | #906 `1fc36891` | 45 commits | deployed, verified |
| viasr-api | #657 `aca84772`, then #659 `65c2a9c4` | 6 + 1 commits | first attempt blocked, see 4 |

**Payload diffed before every dispatch**, per
`reference_production_promotion_2026_08_08`:

- murror-api migration `20260715010000_add_relationship_next_steps` is purely
  additive: `CREATE TYPE`, `CREATE TABLE IF NOT EXISTS`,
  `CREATE INDEX IF NOT EXISTS`, two `ADD COLUMN IF NOT EXISTS` nullable TEXT on
  `journals`. **Zero** destructive statements. Registered in the production set.
- **Reverse direction checked both repos: 0 files unique to production**, so no
  hotfix was reverted. viasr had 13 commits on production not on staging but all
  were prior promotion merge commits carrying no unique files.
- The emotion-arc constraint and its vocabulary fix were already in production
  TOGETHER, so the promotion did not split the pair whose failure path is a
  silent swallow.
- viasr's new payload caps were checked against real callers. An earlier cut of
  that PR set several to 8000 by copying a house number and **would have
  rejected real journals**; review raised them to 60000 against murror-api's
  `MURROR_API_JOURNAL_MAX = 50_000`, with a test that fails if they shrink. The
  takeaway schema, the actual big-journal path, is untouched. Service-to-service
  callers are exempt from the new rate limiting.
  - **Residual, named not cleared:** `instant_reflection` sits at 8000 and was
    not in that "match real callers" test.

## 3. 🚨 The murror-api deploy reported FAILURE and had actually succeeded

Run 33707247142 failed at `Deploy to Kubernetes` with
`error: timed out waiting for the condition` after 300s, having logged
"1 out of 2 new replicas have been updated". **The CI job stopped watching;
Kubernetes finished the rollout anyway.**

Verified by effect, not by the tick:

| Probe | Result |
|---|---|
| `/api/health` | 200, all indicators up |
| `/api/v1/connections/<id>/relationship-next-step` | **401** (route exists, auth-guarded) |
| `/api/v1/connections/<id>/definitely-not-a-route` | 404 (negative control) |
| `/api/health` vs `/api/v1/health` | 200 vs 404 (positive control) |
| `relationship_next_steps` table | exists |
| new `journals` columns | 2 present |
| migration row | applied, `finished_at` set |
| migrations rolled back tonight | none; the 3 rolled-back are from 2026-03 and 2026-06 |

The next-steps route had **never existed in production** before this payload
(see `incident_relationship_next_steps_404_prod`), so a 401 there is positive
proof the new image is serving. **#902, #901, `a0c43713` and #904 are live.**

## 4. Two dependency advisories, handled differently on purpose

### nltk / PYSEC-2026-3740, viasr, SUPPRESSED with justification

The first viasr production dispatch failed at `quality-security`, skipping
`build-images` and `deploy`, so nothing shipped.

- The payload does not touch nltk; **production already ran 3.10.3**.
- 3.10.3 is the newest release on PyPI, so there is nothing to upgrade to.
- nltk cannot be removed: `llama-index`, `llama-index-core` and `newspaper3k`
  all require it transitively.
- Every nltk reference under `app/` is commented out.
- **The advisory contradicts itself.** OSV range events are
  `[{introduced: 0}, {fixed: 3.10.3}]` and the explicit affected list is
  `3.10.0/3.10.1/3.10.2` only. Only the prose says "through 3.10.3".

Blocking removed no exposure while holding back the `search_location` privacy
fix, so the net effect of the gate was more risk. Astro chose to proceed.
`--ignore-vuln PYSEC-2026-3740`, scoped to the single id, full rationale in the
workflow, **review by 2026-10-03**, explicit instruction not to widen it. #658
`85a1bb1b`. Its own CI run is the proof: `quality-security` passed where it
had failed.

### @humanfs/node / GHSA-p498-v437-472g, MurrorMobile, PATCHED

Stopped the 455 ship chain at step 2. **This one had a real fix**, so it was
fixed at the cause rather than suppressed: pinned `0.16.8` through the existing
`resolutions` block (the same mechanism already used for `basic-ftp`,
`form-data`, `axios`, `tar`). `eslint@9.39.2` declares `^0.16.6`, which `0.16.8`
satisfies, so nothing else moved. Lockfile diff 19/9. PR #1201.

Reachability: `@humanfs/node` arrives only through eslint, so it is lint-time
only and never enters the shipped bundle. Taking the patch was still cheaper
than justifying a skip.

🚨 **Diagnostic trap:** the step named `Enforce dependency advisory baseline`
reports **success** because it is `continue-on-error`. The run fails later at
`Fail if a required check failed`. Reading step conclusions alone points at the
wrong step. Same family as
`feedback_command_succeeded_is_not_evidence`.

## 5. Build 455 became 456

`ship-ios-build.sh` stopped at `[2/7] CI on the bump` (run 33708209539). The
bump branch `chore/bump-build-455` was already created and pushed, and the
runbook is explicit that any source change after a bump invalidates it, so the
next attempt takes a fresh number.

Build worktree was prepared correctly: detached at canonical `63521a3a`, clean
tree, and `ios/ExportOptions.plist`, `.env`, `.env.production`, `.env.staging`
copied in (all gitignored and absent from a fresh worktree, which otherwise
kills `-exportArchive` AFTER a 15 minute archive). `.env.production` confirmed
to carry `BASE_API_URL='https://api.murror.app'`, which is what the artifact
guard greps for.

## 6. In flight at the time of writing

- MurrorMobile #1201 (humanfs), CI running.
- viasr production deploy 33708738679; `quality-security` has passed, confirming
  the ignore works in the real dispatch, `build-images` running.
- The 456 ship chain, to be started once #1201 merges.

## 7. Still open for Astro

1. The 5 stale coordinate rows (176 to 222 days, all one-sided, nothing reaps
   them).
2. Whether a second Connection Reflection replaces its text or stays a no-op.
   Today it 201s, creates nothing, discards the words and echoes the OLD text.
3. Whether the Personalize location toggle needs a real persisted opt-out.
4. Whether #1197 (query defaults) rides the build.
5. Whether the co-location prompts should stop sending street addresses to
   OpenAI.

Astro's answer on #3 blocking: it does NOT block the build. Shipping 455/456
WITH location is what produces the missing device evidence for the no-prompt
claim; the decision is a submission decision, not a test-build decision.

## 8. Gotchas added this window

- A **red deploy run can mean a succeeded rollout.** `kubectl rollout status`
  timing out is the CI job giving up, not Kubernetes. Verify by effect.
- **macOS has no `timeout` binary**; `timeout N cmd` exits 127 having run
  nothing, and empty output reads as a pass.
- The GitHub API token **lacks `workflow` scope**, so workflow files cannot be
  changed through `gh api`; push over git from a worktree instead.
- zsh globs an unquoted `?` in a `gh api` URL. Quote the whole path.
