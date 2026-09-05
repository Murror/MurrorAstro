# 2026-09-04/05: two tester reports to iOS build 457

## Context

Two messages in `#beta-testing` on 2026-09-04, both on build 456:

- **Mona, 16:53 +07** "It seems like app is down" with a screenshot of a blocking
  modal reading *"Slow down! You've made too many requests"*.
- **Khanh, 17:21 +07** "I have a different issue when I click on a connection's
  page", screenshot showing *"Access denied. You do not have permission to
  access this content."*

Neither was an outage. Production was verified up: `/api/health` 200, all pods
Running, every health subsystem `up` except the known `deletionIntegrity` stuck
deletion.

## The root cause both reports shared

Build 456 was the **first build in which the global react-query error handler
had ever executed**. `setupQueryErrorHandler` previously called
`setDefaultOptions` TWICE without spreading, and query-core's setter is a plain
assignment, so the second call discarded the first. `throwOnError`, the retry
predicate and `mutations.onError` were all undefined. PR #1197 fixed that, which
switched on a modal surface nobody had exercised.

`handleQueryError` mapped `TOO_MANY_REQUESTS` and `FORBIDDEN` straight to
`ToastService`, and every `ToastService` method renders `showDialog`: a BLOCKING
modal with an OK button, not a toast. Errors that every prior build had swallowed
in silence now interrupted the user.

## What each report actually was

**Mona (429).** Measured in production: 16 rejections in two one-second bursts
(16:44:59 and 16:50:18 +07), on the relationship detail-bundle endpoint,
identified from a `req.query.includeExplore` breadcrumb because the exception
filter logs no route. One device firing ~19 requests in one second against a
10/sec tier.

**Khanh (403).** All 13 forbidden responses in three hours of production traffic
were one endpoint: `GET /api/v1/connections/zodiac-insight/:connectionId`, two of
them at 17:18:17 and 17:18:26, matching her screenshot minute exactly.
`getZodiacInsightWithCache` requires BOTH members to hold a
`relationship_privacies` row with `allow_share_data_with_ai = true`, and a
MISSING row counts as opted out. Production held 68 connections: 3 both-opted-in,
60 with zero privacy rows, 4 with one, 1 explicitly off. **65 of 68 (96%)
returned 403 by design.**

## Production data change (Astro signed off)

Backfilled `murror_api.relationship_privacies`: **121 rows inserted** across 63
connections and 51 people. `allow_share_data_with_ai = true` (the authorised
change) and `share_level = 'OVERVIEW'`, chosen because the code's no-row fallback
is `{allowShareDataWithAi: false, shareLevel: 'OVERVIEW'}`, so share level is
byte-for-byte behaviour-preserving. Result: **3 of 68 passing the gate became 65
of 68.**

The dry run caught three things that would have broken a naive insert:

1. `id`, `legacy_connection_id` and `updated_at` are NOT NULL with **no database
   default** (Prisma generates cuids client-side).
2. One **orphaned member**: connection `cmsiirww...` has a `user_id_2` absent from
   `murror_api."User"`. Unfiltered, that single FK violation would have rolled
   back all 124 rows.
3. Two **self-connections** (same user in both slots), which is why 121 landed
   rather than 123. `ON CONFLICT DO NOTHING` absorbed them.

The 3 connections still gated are correct: two are real user opt-outs (preserved,
never overridden) and one is the orphan.

## Shipped: iOS build 457

Archived from `ef3c2ac7`, uploaded, attached to the 2.0.0 record (HTTP 204,
confirmed by re-read). `appStoreState` now `PREPARE_FOR_SUBMISSION`.

| PR | What |
|----|------|
| #1211 | Background query failures no longer open a blocking modal |
| #1212 | Spec counts dialog dispatches so a duplicate modal cannot pass |
| #1214 | Mutation failures report which mutation, not its variables |
| #1215 | A blocked Diary detail screen can ask for AI-processing consent |
| #1216 | Connection screen shows real AI sharing state |
| #1217 | An expired session no longer strands the user on an authed screen |
| #1218 | Error copy names a cause; CONFLICT/VALIDATION un-swapped |
| #1219 | Detail-bundle request fan-out paced |
| #1220 | Inline retries for tapped query actions |
| #1221 | A privacy save refreshes the surfaces that read the flag |
| #1222 | A declined AI-processing consent is recoverable from Settings |
| #1223 | CI: narrow native smoke relevance paths |
| #1213 | Build number bump to 457 |

All eleven fixes verified as ancestors of the bump head with
`git merge-base --is-ancestor` BEFORE archiving.

### Artifact verification

- App `CFBundleVersion` 457, and **both** `.appex` at 457 (the mismatch that
  killed build 241).
- `https://api.murror.app` baked in, checked with `grep -c` never `grep -q`.
- Tonight's strings confirmed in the shipped Hermes bundle **via `strings`**:
  plain `grep` returns zero on bytecode and is a false negative.
  `"Personalization level"` confirmed ABSENT; `"AI sharing"`,
  `"This isn't available"` and `"Send my words to AI"` all present.

## Backend

**viasr-api promoted to production and verified by effect** inside the running
container, not by rollout status: the broken attribute absent, `await
allm_request` present at both call sites (lines 325, 341), with a positive
control proving the probe could read the file.

- #675 restored two async detectors dead since 2025-09-19 (350 days). Only
  `adetect_sensitive` was live, via `POST /chat/voice`, returning a hard HTTP 500.
- #676 declares the Sentry DSN state in git and asserts it every deploy.

**murror-api, merged to staging, NOT promoted:**

| PR | What |
|----|------|
| #922 | Rate limits keyed per user, not per client IP |
| #923 | HTTP status and route on error log lines |
| #926 | Health exception route and status exposed |
| #927 | Connection member integrity guards |
| #928 | Anti-guessing tiers keyed per IP; four `long` tier-name collisions fixed |
| #929 | A tier evaluates only on routes that opted in: 14 Redis round-trips to 3 |
| #930 | Suggestion-wheel spec no longer races its own clock |
| #931 | Privacy tombstones excluded from the orphan member count |
| #932 | Connection guard wiring made behavioural |
| #933 | A failed user mirroring names its cause |

## Three defects nobody reported

1. **The connection screen stated the opposite of the truth.** The privacy row
   printed the AI toggle's label above the SHARE LEVEL value, and its ternary
   also fell through to "Max" when `shareLevel` was undefined. So it read
   "Personalization level: Max" while AI sharing was off.
2. **An expired session stranded the user.** `handleUnauthorizedError` handed
   navigation to `ToastService.showUnauthorizedError` as a callback, and that
   method's body is entirely commented out with its parameter renamed
   `_onRetry`. The callback never ran, so the session was cleared while the user
   stayed on an authenticated screen. Nothing rescued them short of relaunch.
3. **The blocked zodiac card promised a reading that was never coming**, with
   "This reading is not ready yet. Check back a little later."

## Diagnosed, deliberately NOT fixed

**34 unmirrored accounts are an activation drop-off, not a sync bug.** Two
database hypotheses died with clean controls: zero email collisions, and the
empty-email fallback explains only 1 of 34. The upsert would have SUCCEEDED for
the other 33, so it never ran. Behavioural split: 9 of 34 (26%) never signed in
at all, versus **0** in the mirrored September control. Mirroring is lazy, on the
first authenticated murror-api call, and they never made one. Syncing them would
write rows for people who never arrived and hide the funnel.

**A stuck Mixpanel GDPR receipt.** The purge is complete (zero rows anywhere for
that user), but Mixpanel has returned `PENDING` for the task since 2026-08-29,
with `num_retries: 3` on their side. Queried directly from inside the production
pod so the token never left it. Our pipeline is correct to refuse a receipt it
cannot evidence. Tracking id `146b9b16-f3b4-4e8d-b4da-a6e22b1aa94d`.

**PR #925 held.** Both positions are right about different environments. The
guard already dispatches on the token's `alg` and verifies ES256 through JWKS.
staging and dev/alpha2 publish ES256 + JWKS, so key rollover is graceful and no
mass-invalidation event exists. Production still signs with the legacy HS256
shared secret, where rotating invalidates every token at once. So the genuinely
rotation-safe design is not a smarter bucket key: it is finishing production's
migration to the JWKS the other environments already use.

**The orphan connection's cause.** `ensureUserExists` is not called from the auth
guard; it is called opportunistically from a handful of service methods. The
legacy invite-accept controller writes connections at two sites and calls it
**zero** times. Fixing it needs `UserHelper` injected into a controller whose
constructor carries an explicit warning that new dependencies must be appended
LAST because specs pass positional args.

## Edge Function audit (the question that closed)

The accept handler was ported off a Supabase Edge Function on 2026-03-30/31, and
three separate omissions had been found in it over the months. Read the deployed
`protected-apis-relationships` source directly to check for a fourth.

`handleAcceptedInvitation` does SIX things: already-friends check, create
connection, remove pending invitations, initialize privacy, send acceptance
notification, initialize progresses. **All six are present in the current
controller.** The port dropped `initializeRelationshipProgresses`, that has been
restored, and nothing else is missing. There is no fourth omission.

User mirroring is NOT a port omission: the Edge Function wrote to the legacy
schema and had no `murror_api."User"` to mirror into. That requirement arrived
with the new schema.

## Gotchas that cost real time

- **`CLEAN` means no merge conflicts, never "up to date".** PR #1213 reported
  CLEAN while five commits behind its base. Archiving then would have produced a
  build stamped 457 containing ONE of twelve fixes. Caught by
  `git merge-base --is-ancestor`, which is now a mandatory pre-archive step.
- **`git push` can silently push nothing.** A worktree branch whose local name
  differs from its upstream is refused by `push.default=simple`, and `-q` with a
  piped stderr swallows the refusal. Two review fixes were reported as pushed and
  had landed nowhere. Verify by the PR's head SHA.
- **A jest hang emits no failure output.** Raising the pacing interval from 100ms
  to 130ms broke two specs whose fake-timer loops advanced in steps COARSER than
  the interval, so each timer landed mid-step and effective spacing doubled. Both
  presented as a stuck CI job, not a red test, costing ~50 minutes each.
- **zsh does not word-split.** A file list or command prefix held in a variable
  expands to nothing: `prettier --check $F` printed "All matched files use
  Prettier code style" having checked ZERO files.
- **`grep -E` with `\|` matches a literal pipe.** A six-way comparison returned
  six zeros and looked like a catastrophic finding; the positive control is the
  only reason it was not reported.
- **`main.jsbundle` is Hermes bytecode.** Plain `grep` returns zero for strings
  that are certainly present.
- **The CI cost leak amplifies.** The relevance job diffed against the merge
  commit, so once ONE merged commit touched `scripts/`, every later PR inherited
  a ~54 minute hosted macOS build. #1218 paid it, then #1220 paid it for a
  one-file React change. Fixed in #1223 by comparing the PR head and narrowing
  the path list.

## Verification not done

Nothing in 457 has been seen on a device. Six dialog strings and the AI-sharing
row were reworded repeatedly and rendered zero times; they are confirmed present
in the binary via `strings`, never observed on a screen. The mutation 401 path
reaches `handleUnauthorizedError` for the first time in production, and #1217
changes that path again, so a real sign-in pass is the highest-value manual check
before submission.
