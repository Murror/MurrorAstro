# 2026-07-25/26 — Duo claim round trip, RevenueCat silent-success, staging parity scope

## Context

Two open Duo/Together defects carried in from the previous session, plus a request
to bring staging and alpha to parity. Ownership note: web
(`murror-platform/apps/web-client`) is now this team's, not Codex's.

## 1. Duo claim died on sign-out/sign-in (murror-platform PR #230)

Branch `fix/duo-claim-survives-signout` -> base `feat/web-staging-parity-train`.

**Two independent faults**, either of which alone would have been survivable:

1. `clearMurrorStorage()` swept the stashed seat token. The `murror_` prefix was
   picked for exactly that in PR #82 (June), *before* the wrong-account door
   existed. The door then shipped with the opposite intent stated in its own
   comment ("Keep the token stashed so it survives the round trip") and the
   collision went unnoticed. This was NOT a deliberate decision to reverse.
2. `login-form.tsx` read only `state.from.pathname` and dropped `search`, so
   after sign-in the invitee landed on `/family/join` with no `?token=` either.

**Third gap found while fixing:** `clearPendingSeatToken` had ZERO production
callers, so carving the token out of the sweep alone would have left an
immortal token.

### Changes
- `clear-murror-storage.ts` — one explicit carve-out (`PRESERVED_KEYS`). Every
  other `murror_*` key is per-user state that must die on a shared browser; a
  seat token is an addressed invitation.
- `family-plan-storage.ts` — 24h TTL, expired records dropped on read,
  backwards-compatible with bare-string tokens from older bundles.
- `family-plan-join-page.tsx` — retire the token on a terminal outcome; token
  latched at mount.
- `lib/redirect-target.ts` (new) — pure resolver keeping `search` + `hash`,
  rejecting anything not a same-origin absolute path.

### Adversarial review caught a regression I introduced
- **S1 (proven):** the token was recomputed from storage every render and
  `!hasToken` sits ABOVE success in the render chain, so on a stash-sourced
  visit the terminal clear replaced a just-succeeded claim with "This invite
  link is incomplete". Fixed by latching at mount.
- **S2:** terminal clear missed the preview-detected dead seat (the common
  case); combined with a legacy token it was genuinely immortal.
- **S3:** a parsed-but-wrong-shape record was returned verbatim as the token.
- **S5:** `startsWith("/") && !startsWith("//")` is not a same-origin check —
  the URL parser strips tabs/newlines and normalizes backslashes first.

### Gotcha worth keeping
The join-page spec `"keeps the token"` already existed and PASSED throughout,
because `logoutMock` was a bare stub that never ran the sweep. The mock now
performs the real `clearMurrorStorage`. **A mock that does not do what
production does converts a guard into false confidence.**

Verification: 1757 tests / 235 files, `tsc -b` clean, eslint clean.
Mutation-verified twice (original bug fails 4 specs; reverting the S1 latch
fails exactly the 2 new ones).

## 2. RevenueCat webhook 201-without-persisting (murror-api PR #634)

Branch `fix/webhook-silent-success` -> base `staging`.

**Root cause: Prisma DROPS an `undefined` value from a where clause** rather
than matching it as null.

```ts
const eventId = webhookData.event.id;          // undefined
where: {service: 'revenuecat', eventId}        // becomes {service:'revenuecat'}
```

The query degrades to "find ANY revenuecat log row", matches an unrelated
already-processed event, inherits its `processed` flag, and returns early
logging a benign "already processed, skipping". Someone pays, gets nothing,
and nothing in the logs looks wrong.

Trigger on alpha: `scripts/provision-harness-accounts.ts` built its payload
with no `event.id`.

**Three sites fixed** (the last two found by grepping consumers, not by the repro):
1. `logWebhookEvent` — the original.
2. `storeAnonymousEvent` — pre-login purchases dropped as phantom duplicates.
3. `createTransactionHistory` / `...Only` — JSON `equals: undefined` widened
   the metadata filter and skipped the ledger write.

Fix: `resolveWebhookEventId()` guarantees a non-empty key; a missing id gets a
deterministic synthetic key so genuine replays still dedupe.

**Also:** `ClaimSeatUseCase`'s invited-email guard was `if (seat.inviteEmail)`,
a conditional not an invariant. Now fail-closed. BEHAVIOR CHANGE: the spec
asserting an emailless seat is claimable by anyone was replaced.

### Three recorded pointers were WRONG — do not chase them again
- `webhook.service.ts:153` is inside `warnIfOverCapacity`, a best-effort logger.
- `:189` is inside `reconcileFamilyPlan`, the family branch.
- "the controller returns 201 for rejections / returns instead of throwing"
  describes an OLDER controller. It now throws and rethrows.

Verification: 498 tests / 34 suites, tsc clean, eslint clean (0 warnings).
Mutation-verified: restoring the one-line original fails exactly 3 specs.

## 3. Confirmed adjacent gap (NOT fixed)

`handleSignUp` does `navigate("/onboarding")` and nothing routes back to
`/family/join`. The `murror_onboarding_pending_handoff` mechanism exists but
the join page never sets it. **A brand-new invitee completes onboarding and
never claims their seat.** Larger than the reported bug — it hits every new
invitee. This is also why the stash currently looks like dead code: the path
that needs it is itself broken.

## 4. Staging parity scoping

See `reference_staging_parity_pr_lanes` in memory. Headline: open PRs split
into a STAGING lane and a MAIN/PRODUCTION lane, and only ~18 of ~52 target
staging. Always group `gh pr list` by `baseRefName` before agreeing to a bulk
merge. Four PRs in the staging set must not ride a bulk train (#556 migration,
#633 paired with draft #837, #836 pending copy decisions, #565 prod CI).
murror-platform has no staging branch at all.

## Status

- murror-api PR #634 open, CI running. NOT merged, NOT deployed.
- murror-platform PR #230 open. No CI on that base branch.
- Harness `event.id` fix committed on `test/duo-state-machine-harness`.
- Nothing deployed to staging or alpha. No mobile build cut.
