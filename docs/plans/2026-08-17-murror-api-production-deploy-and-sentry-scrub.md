# murror-api production deploy 0.41.2, Sentry PII hardening, and 2.0.0 API readiness

Dates: 2026-08-16 and 2026-08-17. Author: Claude Code (Astro's session).
Parallel session owned the MurrorMobile lane; nothing here touches mobile source.

## Context

The 2.0.0 launch push was split into two lanes to run in parallel. The mobile lane
(build number, login fence, archive) went to a second session. This lane owned
murror-api and the launch-admin questions.

Entering the session, production had not moved at all: `murror-api:0.41.1` on SGP1
`nsp-prod-murror`, unchanged while four fixes sat merged on `staging`.

## What shipped

| PR | Into | What |
|---|---|---|
| #774 | `staging` | every CI contract runs in the loop, skip-list removed |
| #773 | `staging` | Sentry PII scrubber, 8 commits, 4 review rounds |
| #771 | `production` | staging-to-production reconcile |
| #777 | `staging` | corrected the production promotion path in CLAUDE.md |

**Production deployed: `0.41.1` -> `0.41.2`**, run `31921391503`, rollout revision
10 -> 11, change-cause `source_sha=438b2658 tag=v0.41.2 branch=production`.

Verified BY EFFECT rather than by workflow conclusion: pod image, rollout revision,
fresh pod start times (02:18:30Z / 02:19:16Z), 2/2 ready, `/api/health/live` 200 in
0.18s, and the scrubber confirmed present in the RUNNING image at
`/app/dist/src/common/utils/sentry-scrub.util.js`.

## The Sentry scrubber, and why it took four rounds

Seven Important findings, EVERY ONE of which passed a green test suite:

1. `event.user`, exception messages and `event.extra` were unscrubbed on the paths
   that BYPASS the Nest exception filters: unhandled rejections, WebSocket errors
   and the 12 RabbitMQ consumers. A Prisma `P2010` message quotes the failing SQL
   with its literals inlined, which is entry text.
2. `exception.values[].type` comes from `Error.name`, which is WRITABLE. A scrubber
   that redacts `value` and trusts `type` is half a scrubber. Now allowlisted.
3. Both key-validator maps were reachable through the PROTOTYPE CHAIN.
   `SAFE_ATTRIBUTE_KEYS.constructor` resolves to inherited `Object`, which is truthy
   AND callable, and `Object(prose)` returns a truthy String wrapper, so the
   key-then-validate guard passed and the value survived verbatim. Proven five ways.
   `__proto__` and `valueOf` instead THREW inside `beforeSend`, and a non-internal
   throw there makes the SDK drop the original event and report the TypeError.
4. `event.spans` was SPREAD rather than rebuilt, so arbitrary span fields, an
   array-valued `data` and `links[].attributes` all reached the wire. Live on 10% of
   traffic via `tracesSampleRate`.
5. `stacktrace` was a bare reference passthrough carrying `vars` (local variable
   VALUES) and the three source-context fields.
6. The uuid guard was ANCHORED on both validators, so neither caught an embedded id.
   `user.550e8400-...` passed both. One unanchored check now backs both callers.
7. The six span-identity fields were validated on `contexts.trace` and merely
   scalar-checked on `event.spans`, so an interpolated `op` was blocked in one place
   and shipped in the other. One shared derivation now.

## Gotchas worth keeping

**The agreed Sentry precondition was UNSATISFIABLE.** "Trigger a 500 on alpha and
confirm Sentry receives no user data" passes instantly and proves nothing: alpha and
staging have NO `SENTRY_DSN` (no `envFrom`, 56 inline vars, 31-key ConfigMap, 24-key
Secret, zero matches), and `main.ts` reads `enabled: !!process.env.SENTRY_DSN`.
Production is the ONLY tier with a DSN. See `reference_murror_api_sentry_dsn_topology`.

**The documented promotion path was wrong.** CLAUDE.md said `staging -> main` via
`workflow_dispatch`. The workflow gates production on `workflow_dispatch` AND
`github.ref == 'refs/heads/production'`, so a dispatch from `main` skips every job and
reports green having deployed nothing. Corrected in #777.

**A diff count is meaningless without its baseline.** The launch doc recorded
production as "659 ahead of main", which made a routine reconcile look dangerous.
Against `staging`, which actually feeds production, it was 7 ahead / 16 behind.
`merge-tree` predicted zero conflicts and the merge produced zero.

**Use a merge, never a cherry-pick.** Production's one content commit touched
`revenuecat.service.spec.ts`; proven byte-identical by md5 before and after, twice.

**The worktree staleness trap bit three separate times in one day**, including a
Critical security finding built entirely on an unfetched file. The shared checkout at
`Murror/murror-api` sits on `chore/backfill-takeaway-insights`, 64 commits behind
`origin/main`. Always `git show origin/<trunk>:path`.

## Freemium, re-derived from production

3,105 users, 2,823 holding premium free (90.92%), 8 real purchases, corroborated
independently by `user_entitlements` also having 8 rows.

Two traps:

1. Until this deploy, flipping `SUB_001_PLACEHOLDER_FIX_ENABLED` did NOTHING. The
   running `0.41.1` build contained no `subscription-access.ts` and zero occurrences
   of the variable. Check the DEPLOYED sha from rollout history, never the branch.
2. `original_transaction_id` is NULL on ALL 2,833 rows, including every real payer.
   The obvious fix, "revoke where the transaction id is null", revokes all 3,105
   users. The shipped `isFreeTierPlaceholder` requires a free-tier product identity
   AND the absence of all three store footprints. It fails safe.

The config builder on `production` already knows all four freemium variables, but the
ConfigMap has not been rebuilt since 2026-07-04 and no repo variables are set, so the
plumbing exists and is dormant.

## 2.0.0 API readiness

All 147 API paths the 2.0.0 client can call, diffed against the 312 routes production
`0.41.2` registers at boot (read from the running pod, not from source):

- 143 served
- 4 dead code, zero callers (three SMS methods, `getAudio`)
- 4 gated dark and failing closed (three Next Steps routes, Galaxy)
- **0 reachable gaps**

The Next Steps gate is genuinely fail-closed:
`isRelationshipNextStepsEnabled = (enabled = false, killed = false) => enabled && !killed`.
An unresolved Statsig leaves the surface dark, which matters because the production
Statsig key belongs to an unreachable project, so unresolvable is the normal state.

## Verification

- 330 tests across 16 suites on the scrub branch; every fix watched FAIL before and
  pass after; mutation proofs on each guarantee with the baseline re-confirmed between.
- 597 tests on the refreshed reconcile.
- All 13 CI contracts pass; the #774 change verified by effect in the run log showing
  13 distinct contracts executing, including the two the skip-list excluded.

## Still unverified

**The PII scrubbers have never executed anywhere.** Sentry has recorded zero events
since the roll. That is a test that has not run, not a pass. The first production 5xx
is the proof.
