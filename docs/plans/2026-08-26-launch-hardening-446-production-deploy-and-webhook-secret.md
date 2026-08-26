# 2026-08-26 — Launch hardening: build 446, the production API deploy, and a placeholder webhook secret

## Context

Continuation of the 2.0.0 launch QA follow-through. Started from Astro's device
pass on 445 (four defects), ended with build 446 attached, the production API
deployed for the first time in this cycle, and a live security hole closed that
nobody was looking for.

## What shipped

### MurrorMobile — build 446, attached to the 2.0.0 record

Build id `5db830d2-408b-4a64-a6a6-2c773d41c6b9`, VALID, superseding 445.
Canonical `c4f4f084`, bump `be559557`.

| PR | What |
|---|---|
| #1149 | A logged-out user could not sign up until they force quit. LAUNCH BLOCKER |
| #1150 | Three uncoordinated react-native Modals on Home deadlock iOS |
| #1147 | Chat resume loaded only the oldest ten messages |
| #1148 | Sentry diagnostics moved onto TAGS, which survive redaction |

**#1149, the blocker.** `probeSession` set sessionState `'unknown'` (the "We
couldn't load your profile" screen) when EITHER the session probe could not
answer OR the account storage generation was not current. The logout fence
deliberately leaves storage writes suspended and documents exactly that
("Releasing never resumes STORAGE writes: only a committed account owner may"),
so after any logout the second condition held for the rest of the process. TRY
AGAIN re-probed into the same fence; USE A DIFFERENT ACCOUNT called logout
again, which cannot lift it; only a process restart cleared it. The generation
check now applies only when the probe reports authenticated, because a
signed-out person has nothing to commit. Review then found a SECOND door: the
mount effect trusted `appContext.user?.id` with no generation check, so a fenced
session rendered Continue and silently did nothing when tapped.

**#1150.** Home renders three Modals with no coordination and two fire on
landing. Presenting a second Modal while the first is still presenting
deadlocks on iOS. Review found the first fix would have silently swallowed the
launch comms: the whats-new seen-marker was set from the DECISION, so once the
sheet started yielding, any Home unmount while a blocker was up marked it seen
for the whole 2.0 series. The marker now follows PRESENTATION, the sheet waits
out the dismiss animation, and the voice intro yields to the check-in prompt so
all three are serialised rather than one pair.

**#1147.** `useDeepChatHistory` asked for limit 10 and NEITHER consumer called
`fetchNextPage`, on an endpoint ordered `createdAt ASC`, so a resumed
conversation lost its newest tail. Measured on staging: 3 of the 12
conversations with more than 10 messages have zero AI messages in their first
ten. Fixed at the cause (the resume path now drains all pages), not just by
widening the page.

### murror-api — production deploy (#808)

Promoted staging into production via the reconcile pattern, NOT a fast-forward:
production carried 17 commits staging did not, including the `user_id`-label
removal from business metrics. Zero conflicts, production's own work verified
byte-identical after merge.

Deployed on the `production` ref, run `32922422364`, sha `1134113b`, all jobs
green including the production smoke test. Verified by querying production
directly rather than trusting the workflow:

| Check | Result |
|---|---|
| `enable_cleanup_data` default | `true` (declined) |
| `crisis_disclosed` column | present |
| Both 2026-08-22 migrations | applied |
| Existing users | untouched, 2 declined of 3,114 |

**Account deletion was broken in production.** The pipeline called
`CALL refresh_continuous_aggregate(...)` unguarded while production has no
timescaledb extension, no `refresh_continuous_aggregate`, and neither `_ca`
relation. That step runs AFTER purge-user-data and BEFORE verify-and-receipt, so
the throw purged the user's rows and then stranded the request short of
COMPLETED with `purgedAt` never stamped. Guideline 5.1.1(v) requires in-app
deletion. The guard already existed on staging and had simply never been
promoted. It is a DEGRADATION not a cure: no aggregate is rolled forward while
they do not exist.

### murror-platform — privacy policy (#393)

Removed four false sentences: two claiming Murror collects the user's phone
number, the clause claiming we share hashes of names and phone numbers for
advertising attribution (which also contradicted the policy's own never-share
line), and its orphaned explainer. Verified against the code first: the User
model has email and no phone column, OTP is typed email-only, and the only
phone numbers the app touches are address-book contacts for SMS invites (native
composer, no recipient passed) and public crisis hotline numbers.

## The security finding

**The production RevenueCat webhook secret was the literal placeholder
`secret-value`**, the only one of 18 keys in that state.

`POST /api/v1/subscription/webhooks/revenuecat` is public, internet-facing, and
mutates subscription state. Anyone guessing that string could have posted
subscription events into production billing.

Found by accident: Astro pasted the value into a terminal while configuring the
webhook and zsh reported command-not-found, which made it readable. An earlier
probe returned 401, which proved the secret was SET but could not reveal it was
a default.

Rotated to 40 random characters, patched, `rollout restart`, 2/2 ready, health
200 before and after, and `Bearer secret-value` now returns 401. Control: a
request with no auth header also returns 401 rather than 503, confirming a real
secret is loaded and enforcing rather than missing.

Then configured the production webhook (`environment: production`) and proved
delivery end to end:

```
id:         cmt9kjg6r0000ql07gbuylsov
event_type: TEST
processed:  true
```

`murror_api.webhook_logs` is no longer empty for the first time in the system's
history. Before this, 0 rows all time and 0 of 2,834 subscription rows carried
`last_event_type`.

## Gotchas worth keeping

**`strings BIN | grep -q PATTERN` exits 141 under `set -o pipefail`.** grep -q
quits on the first match, closes the pipe, strings dies of SIGPIPE, and pipefail
reports that as the pipeline status. Timing dependent, so it reads as
intermittent. It stopped the ship script at step 5 on BOTH 445 and 446 with
"production API host NOT baked into the binary" on archives that contained the
host. On 445 it was misdiagnosed as a race against Xcode's product copy and a
settle-wait was added, which could not possibly have fixed it. 446 failing
identically is what proved the first fix was not at the cause. Use `grep -c`.

**A grep exclusion can hide the thing you are looking for.**
`-vE 'plan-state\.ts'` also matches `use-sync-plan-state.ts`, which is how
"setHardPaywallGateEnabled has zero callers" became a confident, wrong claim and
a whole PR (#1146) built on it. The positive control used a different pattern,
so it did not catch the filter. Closed with the corrected diagnosis: the paywall
X was hidden because `planState.plan` starts null and loads async, so
`isSoftPaywallActive` is false during the cold-start window with the flag
already off.

**The consent default is inert against the shipped client.** 1.0.19 sends
`enableCleanupData: this.enableCleanupData || false`, an explicit false meaning
ALLOWS, so the server's `?? true` only fires for clients that OMIT the key,
which is 2.0.0 only. Filed as MurrorMobile#1152.

## Verification

- 446: artifact verified independently (CFBundleVersion 446, both appexes 446,
  production host present), uploaded, VALID, attached
- Production DB verified by direct query after deploy
- Webhook delivery proven by a real RevenueCat test event
- Old webhook secret proven rejected, with a 503-vs-401 discriminator

## Still open

- Account deletion has NEVER been exercised in production (0 requests, all time)
- 446 is not device tested
- Journaling is the only generation flow with no safety pass (viasr-api#629)
- Hermes dSYMs never upload, so launch crashes will not symbolicate (#1153)
- Production GitHub environments have EMPTY protection rules
- murror-api#809 activity tables absent from the deletion registry
