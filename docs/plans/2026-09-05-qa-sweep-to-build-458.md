# 2026-09-05 — QA sweep to build 458, and murror-api to production

Second half of the 2026-09-05 session. Entry point: "resume and do an qa review of mobile
iOS and Android from Codex work and show me the shortest path to launch." Outcome: murror-api
fully current in production, iOS build 458 attached to the 2.0.0 App Store record, the one
confirmed ASC submission blocker cleared, and a device pass + a Sentry billing action left as
the only human-owned gates before Submit.

## murror-api → production (three promotions, prod == staging @ `cc9525f3`)

All diffed payload-first (code only, zero migrations, zero config), merged with merge commits,
dispatched on the `production` ref with no `force_rebuild`, verified by rollout + `/api/health`
200 + a 404 control.

| Merge | Deploy | Contents |
|---|---|---|
| `bd1b6250` | `33951411772` | 10 PRs: throttler per-user keying + tier-scoping (14→3 Redis round-trips), error-log observability, connection member integrity, tombstone-aware health, mirroring-failure cause (#922/923/926/927/928/929/930/931/932/933) |
| `0bcdf597` | `33959814235` | #936 invite-accept mirrors both members; #817 malformed invite token → clean 404 |
| `1020b839` | `33961277021` | #937 family-seat twin |

`#817` verified by effect on production: `GET /api/v1/relationships/inviter?token=not-a-uuid`
→ **404 `INVITER_NOT_FOUND`** (pre-fix this was a Postgres 22P02 → 500), control being a
well-formed unknown UUID returning the same shape. 🚨 The route is `/relationships/inviter`,
not `/invitations/inviter`; the first probe hit a route-miss "Cannot GET" 404 that looked like
a pass. A 404 is not a 404 — read the body's `errorCode`.

### #936 / #937 — the invite-accept orphan, both sites

The legacy invite-accept controller and the family-seat claim both created a connection
without mirroring either participant into `murror_api."User"`, so a person could be a
connection member with no `User` row (the production orphan `cmsiirww…`). Fixed at both sites
with a three-way `classifyMirrorFailure()` returning `proceed | refuse | retry`:

- **retry** is the explicit fail-closed default (503 `CONNECTION_SETUP_UNAVAILABLE`; the
  invitation stays `SENT`, the next attempt succeeds).
- **refuse** for a closed/deleting account (409 `INVITER_ACCOUNT_UNAVAILABLE` on the invite
  path; log-and-skip on the family fire-and-forget path). "Permanent" was two opposite
  answers — *retrying cannot fix this* says nothing about whether to continue; the deciding
  question is whether the person and their row survive.
- **proceed + log** for a `P2002` unique-email collision (the `auth.users` row exists, only
  the mirror row collided; a backfill can repair it).

#936 took three review rounds, #937 two plus a read. Gotchas that surfaced:

- **Two Prisma realms.** `connections.create` runs on the legacy client; `describeError`
  tested `instanceof` against the murror client's `PrismaClientKnownRequestError`, a different
  constructor, so a legacy P2003 fell to the `else` branch as an anonymous log. Fixed with
  `isPrismaKnownRequestError()` accepting either realm, `instanceof Error` kept in front so it
  widens across realms not shapes. FK constraint lives in `meta.field_name`, not `meta.target`.
- **`connections.user_id_*` FK → `auth.users` ON DELETE SET NULL; `FamilyPlan.organizerUserId`
  has no FK.** So a purged organizer's seat stays claimable and `connections.create` raises
  P2003. Ruling (#938): a seat must not be claimable when the organizer has requested deletion.

## iOS build 458 (bump PR #1230, attached 12:00:45Z, 17-minute chain)

`ship-ios-build.sh <lane> --attach`: bump → CI (8m) → archive (3m) → verify → upload → VALID
after 4 polls → attach HTTP 204 → re-read confirmed. Carries 457's twelve fixes plus:

| PR | Merge | What it fixes |
|---|---|---|
| #1224 | `4be6917e` | Retry link readable on the white Add-Connection sheet (was 1.35:1); offline tap says it will retry instead of doing nothing |
| #1226 | `75ec9d60` | 30s request timeout composed WITH the caller's `AbortSignal` so passing a signal can no longer bypass it; scheduler slot-leak on sync throw; Sentry slow-API noise sampled 0.1 |
| #1227 | `675502ef` | AI-consent Agree never silently no-ops (hook, composer, Personalization Switch); accept-invite errors show the server's reason and keep retry when retryable; alerts deferred past modal dismissal |
| #1225 | `55c8ef03` | Every await on the sign-in path bounded or disclosed; provider lane released on timeout; ladder timeout no longer persisted as not-subscribed |

Cross-cutting gotchas, all now in memory:

- **`AbortSignal.any`/`.timeout`/`.abort` exist in jest's Node 22 and NOT in RN 0.77's
  `abort-controller@3.0.0` polyfill.** Using them passes CI and throws on device. Use
  `setTimeout(() => controller.abort())`.
- **A bound on the caller does not release a lock the callee holds.** `#1225` round 3: wrapping
  the whole OneSignal sync in `settleWithin` let login proceed while the inner op kept running
  inside `providerOperationQueue`, which only advances on settle — so sign-out silently did
  nothing for the session. Fixed by bounding inside the queued action. The proof is asymmetric:
  remove the inner bound and "login settles" stays green while "the next queued op ran" fails.
- **Trace to the literal `return`, not a convenient intermediate.** #1225 found five unbounded
  awaits over four rounds, the last three (Facebook event, Google-profile block with a raw
  `fetch` and no signal) 16+ lines below where the previous round stopped.
- **The fail-soft vs must-fail boundary.** `syncUserIdentifier` sits in the same shared lane and
  is deliberately left unbounded: it rethrows so login cannot succeed with the previous
  account's providers still bound. A bound that swallows is only right where the op is fail-soft.
- **A message that points at a setting must work for the cohort it is shown to.** #1227's first
  copy sent a no-profile person to Personalization, which shows the identical dead-end. Dropped.
- **An `Alert.alert` fired right after `setModal(false)` is torn down with the modal.** Defer it
  with `InteractionManager.runAfterInteractions`.

### #1229 held for build 459

The timeout-destination UX (one surface saying the connection is slow, keep the session, Try
again). Second review found a proven Critical: the 20s button re-arm released the attempt's
*ownership* of the surface, not just the button's *look*, so a re-entrant do-nothing press tore
the surface down over a still-running attempt → bare splash. Round 3 (`9809d127`) split
`holding` into `buttonHolder` (re-arm clears) and `ranAttempt` (only `beginAttempt()` writes),
making "I did nothing" distinguishable from "I reached a destination." Green, queued for 459.

## App Store Connect

- **Blocker cleared by two API writes** (Astro-approved): en-US localization for the Monthly
  subscription (`6743378785`) and the Premium group (`21651292`), mirroring the approved Yearly.
  Without them an English user saw the Vietnamese name on Apple's payment sheet.
- Verified OK by API: build 458 VALID + attached, en-US/vi version localizations, 6 screenshots
  per set (counted directly, not via `include` which returns 0), review detail (demo account,
  contact, notes), age rating (override 16+, health + UGC → computed 17+).
- At submit: leave the two Duo IAP rows **unselected** (Duo delayed); App Privacy label is a UI
  check (no public API).

## Diagnosed, not fixed

- **Sentry error quota exhausted org-wide since 2026-08-25** (`incident_sentry_org_error_quota_exhausted_2026_08_25`).
  Not a client bug — shipped App Store binaries stopped reporting the same day; spans still flow.
  Fix is a billing action (Astro); still 429 at 11:20Z. No 2.0.0 build has ever delivered an event.
- **34 unmirrored accounts are an activation gap, not a sync bug** — the `User` row is written
  only by `POST /onboarding/complete`, and a stalled no-row person lands on Home permanently
  because `onboarding-completion-guard` fires only on an explicit server `false` (#1228).
- **Android has zero overlap with 457/458** (proven three ways) and is weeks from shippable
  (no PR ever, no fastlane lane). The Codex Android branch carries a RevenueCat major bump on
  iOS mislabelled `fix(android)`; never merge it for its Android content.

## Closed / filed

Closed: #925 (→ #935 JWKS migration), #818 (byte-identical dup of #817), #496, MurrorMobile
#1004 + #1040 (superseded; #1040 would have broken iPhone sign-in). Filed: murror-api #935
(JWKS), #938 (seat claim), #940 (API follow-ups); MurrorMobile #1228 (iOS follow-ups).

## Two of my own tooling bugs, recorded

- A CI watch with an **empty run id** "settled" with exit 0 (GitHub lagged 16 min on creating
  the run; the fixed 60s fallback missed it). Fix: assert non-empty, poll, propagate the exit,
  never redirect the watcher's stderr to `/dev/null`.
- A merge script that printed "behind base by: 2" and **proceeded**. Fix: exit unless
  `git rev-list --count <head>..origin/<base>` is 0. #1227 landed on a stale-base green; the
  squash was conflict-free and #1225's combined run covered it after the fact, but that is a net,
  not the rule.

## Still owed before Submit

1. Device pass on 458 (sign-in riskiest; a slow-network timeout lands on the poster until 459).
2. Sentry billing action, then fire the in-app test error and confirm it lands.
3. At submit: Duo IAPs unselected, App Privacy label checked.
