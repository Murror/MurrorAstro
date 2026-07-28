# 2026-07-28 — Connection/Duo two-sided verification, 8 shipped fixes, and production readiness

Covers 2026-07-21 to 2026-07-28.

## Context

Two threads ran this week. First, a full verification sweep of the connection and
Duo (Together) surfaces on two real devices with two connected staging accounts,
which turned up eight shipped bugs. Second, an assessment of what it would
actually take to get staging's work to LIVE production, which uncovered a
divergence problem materially worse than the memory described.

## Shipped

### Duo / Together (murror-api)

| PR | What |
|---|---|
| #631 | refuse invites to someone already covered |
| #634 | webhook must never 201 without persisting (+ two sibling undefined-drop lookups, fail-closed seat email) |
| #636 | `POST /family-plan/leave`, seat entitlement separated from seat occupancy, grace-window holes closed |
| #639 | a friend's birth date came from the wrong table |
| #640 | read `User.name` so AI payloads stop saying "User" |
| #641 | grace after leaving a plan is not ownership |
| #642 | email solo subscribers on the events that matter |
| #617, #618, #556 | websocket fail-closed, pod security defaults, dead Prisma models |
| #643 | back-port the Stripe billing portal from production (OPEN) |

### Mobile (MurrorMobile)

| PR | What |
|---|---|
| #867 | never invent someone's star sign |
| #868 | intro artwork full bleed, orbit cut from its background |
| #869 | the avatar pair drew two empty rings |
| #870 | stop addressing people by their surname |
| #871 | stop saying "journal" to users, in all three languages |
| #873, #874 | given-name accented-Latin fix; stop the autosave resurrecting a submitted entry |
| #875 | check-in empty state was a white slab saying nothing |
| #876 | never ask for stars on someone's first reflection |
| #877 | tell the other person a reflection was shared |
| #878 | Support row shows open hands, not an SOS siren |
| #879 | zodiac empty state honest and actionable |
| #880 | the butterfly avatar fallback never actually painted |
| #881 | birth-date wheel seed + dark theme; reflect no longer asks for location; orbit geometry guard |
| #838 | open-upgrade spec two-arg fix |
| #882 | build 380 |
| #883 | prod bundle phase resolves node like every other target (OPEN) |

### Web (murror-platform)

#244, #245, #246 (Duo claim success beats the already-on-plan gate; mis-tapped
birth date correctable; do not re-ask for a birth date we already have), built
and deployed to staging as `web-client:staging-a96552bc`. Verified at byte level:
the served bundle contains `under13RetryCta`, a string that exists only on the
parity train.

Plus admin-portal/statistic-service analytics panels (#233-#243).

### viasr-api

#586 strip em dashes from model output before it reaches a user.

## Two-sided verification: the result

Drove a real directional card (takeaway) through its whole life on two devices:

```
PENDING  ->  COMPLETED  ->  INSIGHT_READY
```

At every state, both users' payloads were **byte-identical** (`identical payload
for both sides: True`). The sender/receiver difference is derived client-side
from the ids, so the server cannot produce two different cards. Reflection cards
are one row with one shared status, so divergence is structurally impossible
there too.

Duo cases exercised via real API calls: re-invite (reuses the freed seat),
re-claim in grace, organizer-remove, wrong-account (403), bogus token (409),
under-13 (403), 13-17 consent (409), member-tries-organizer-route (403),
sender-tries-to-complete-own-takeaway (403).

The grace fix was proven live on a seat genuinely in its grace window:
`cancelAtPeriodEnd` went false -> true with the correct date, then correctly back
to false on re-claim. State-driven, not sticky.

## Gotchas worth keeping

**The butterfly fallback never painted.** `<Image>` styled with only
`StyleSheet.absoluteFillObject` lays out at zero size and paints nothing. The
existing guard passed the entire time because it asserts the element EXISTS, and
a zero-size image does exist. Proved it: with the broken style restored,
`compact-feed-card.spec.tsx` still passes all 48 tests while the new size guard
fails. Pin the BOX, not the element.

**The prod bundle phase.** `with-environment.sh` ends with `if [ -n "$1" ]; then
$1; fi` and executes ONLY `$1`. The prod phase called it as
`with-environment.sh /bin/sh sentry-xcode.sh react-native-xcode.sh`, so the
sentry and RN scripts were silently discarded as `$2`/`$3`, and `/bin/sh` with no
args exits 0. That is why `set -e` never tripped and why the "redundant" bare
line was load-bearing. Reproduced in isolation.

**Only an archive proves a bundle.** A plain `xcodebuild build` never emits one.
Verified `main.jsbundle` = 13,775,156 bytes in the archive, build 380, both
appexes at 380.

## Production readiness: THREE divergent states

| state | murror-api migrations |
|---|---|
| `origin/staging` | 144 |
| `origin/production` (branch) | 132, **148 commits never deployed** |
| **LIVE deployed image** | **126** (`deep-chat-hotfix-ba9172a`) |

Live production does NOT run the `production` branch. It runs an image built from
`ba9172a`, the tip of a local branch, which is not an ancestor of
`origin/production`.

Prod-only work a naive promotion would DELETE: the Stripe billing portal
(murror-api, byte-identical between the live image and the production branch,
absent from staging) and 131 stardust artwork entries (viasr-api).

All 18 migrations separating staging from the live image are additive. Two write
to live rows: the takeaway reaper repair (narrow, idempotent, safe) and
`care_notification_default_on`, which backfills EVERY existing user to
notifications-on. Astro approved that explicitly on 2026-07-28.

## Backlog sweep

Closed 14 confirmed-stale MurrorMobile PRs, several verified by file-existence
against current main. Merged #838, #617, #618, #556. Held #565 (real failing
check on a 19-day-old branch, needs a rebase, not an override).

Note: `gh pr list` defaults to 30 items and silently truncated the first pass.
Always pass `--limit`.

## Verification

- murror-api: 34 suites / 419 tests (subscription, family-plan, freemium, config)
- MurrorMobile: 24 suites / 181 tests (Diary, Home) plus targeted guards
- tsc, eslint, prettier clean on both
- Every new guard mutation-checked (fails on the bug, passes on the fix)

## Open

- #643 (billing portal back-port), #883 (prod bundle phase) awaiting merge
- Prod Sentry symbolication unverified: no `sentry-cli` ran during the archive
- Zodiac naming fix has no post-deploy on-screen proof (day-cached, cache clear
  was permission-blocked); regenerates at date rollover
- Subscription emails are wiring-proven, not fire-drill-proven
