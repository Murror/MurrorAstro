# 2026-08-05 — The premium self-heal, and build 415

Continuation of the 08-04 session (see
`2026-08-04-build-413-414-feedback-and-freemium-activation.md`). Two outcomes:
the "Settings says Premium, content is locked" bug was root-caused and fixed,
and build 415 went to TestFlight carrying six PRs.

---

## 1. Premium shown while content locked

### The deciding fact

RevenueCat **does** entitle the account. Staging customer
`a2ed32da-4a65-41d8-a4e8-754bcb3ae817` (project `projb32bb370`, app
`appf4a89fc032`), subscription `subAapab1833…`: `gives_access: true`,
`status: active`, entitlement `app.murror.premium` active. The stored row
carries the **same** `revenuecat_user_id`. Same identity, opposite answers, so
`INACTIVE` was wrong rather than correct.

> Connector note: `mcp__revenuecat__*` is **prod-only** and 403s on
> `projb32bb370`. Use `mcp__ec1f4ec5-…__*`. Call `list-projects` first; the
> scoping has flipped before.

### Why the earlier fix could not work

The negative self-heal existed **twice** in `revenuecat.service.ts`:

| | site | guard | reached from |
|---|---|---|---|
| A | `checkUserSubscription` | recent-webhook-write window | app-open reads (5 callers) |
| B | `healStaleActiveSubscriptionRow` | **none** | the TRANSFER webhook path (1 caller) |

PR #729 hardened **A**. Transfers only ever call **B**. #729 deployed
successfully at **17:23:40Z**; the bad row was written at **20:44:45Z**, three
hours and twenty-one minutes later, on the fixed code. #729's guard also keys on
`lastEventTimestampMs`, which the webhook path writes itself, so it could never
fire against its own writer.

### Proven from persisted state, not logs

Pods rotated before the logs could be read. The row's period was still
`2026-07-13 → 2027-07-13`, a **yearly** window, while RevenueCat's live
subscription was **monthly** `08-04 → 08-05`. `syncSubscriptionStatus` is the
only branch taken when a variation reports active, and it always rewrites the
period. Period demonstrably untouched ⇒ no variation reported active ⇒ execution
necessarily reached the heal. That is a proof, not an inference.

**Not proven:** whether the heal flipped `ACTIVE→INACTIVE` or no-opped on an
already-INACTIVE row. Does not move the fix site.

### The fix (PR #734, merged `74e2dd3`, deployed to staging revision 355)

1. **A transfer no longer treats an empty read as a verdict.**
   `resolveTransferPrefetchUserId` builds its candidates from `transferred_to`
   **only** and never reads `transferred_from`, so the prefetched user is always
   the transfer **destination**, the person who just gained the subscription.
   For them an empty RevenueCat read can only mean propagation lag. Status is
   left untouched with a warning naming why, and the negative is no longer
   cached (caching it turned seconds of lag into minutes of denied access).
2. **The two heals became one.** `checkUserSubscription` now calls the single
   guarded `healStaleActiveSubscriptionRow`. No second derivation remains.

`checkUserSubscription` behaviour is byte-identical: same where clause, same
logging, same error propagation. The old error-swallow protected only the
transfer caller, which no longer exists.

### 🚨 Do NOT widen `isSubscriptionPaidThrough`

`subscription-access.ts` carries an explicit warning that this predicate is where
the ~92% prod freemium leak came from. **2,823 of 2,828 production ACTIVE rows
have a NULL `current_period_end`**, so any edit there touches essentially the
whole user base. Fix the writer, never the reader.

### Scale (decays, re-measure)

- staging: **3 rows** INACTIVE with a future period
- production: **0 rows**, verified real (table holds 2,828 ACTIVE + 2 INACTIVE)

```sql
SELECT status::text, last_event_type, count(*) FROM murror_api.subscriptions
WHERE status::text='INACTIVE' AND current_period_end > now() GROUP BY 1,2;
```

### Backfill: not done, and not by SQL

The intended instrument was `POST /api/v1/subscription/batch-check` with
`forceRefresh`, which drives the app's own reconciliation rather than patching
rows by hand. **It is unreachable on staging: `BULL_BOARD_API_KEY` does not
exist on the pod under any name.** The guard fails closed correctly
(`if (!adminKey || !providedKey) throw`), so this is not a security hole, just
no way in. Astro's call: let the rows self-repair on next app open, which is
also the end-to-end verification of the fix.

---

## 2. Build 415

Archived from `staging-environment-setup` @ `2dbda2fb`. **VALID in TestFlight**,
v2.1.0, uploaded `2026-08-05T00:12:51`.

Carries: #1029 (build-414 feedback), #586 (docs audit), #998 (onboarding privacy
polarity), #965 (cold-start auth retry), #1005 (subscription sync timeout,
rebased), #1030 (three defects caught pre-archive).

### The pre-archive review earned its keep

Three reviewers on the combined diff found three real defects, two of which
would have reproduced the very bugs the build exists to confirm:

- the sheet skeleton was a hardcoded `92pt`; a real card rests at 72 / 88 / 104,
  and descriptions are server supplied and translated, so no constant could work
- the skeleton was **permanent on query error**, and an empty-but-successful
  response still collapsed the sheet
- a **paying subscriber could see the Free and Upgrade card**, because the
  loading flag was cleared before the cached entitlement was applied

Fixed in #1030 with a mutation-tested regression test for the third.

> One reviewer finding was **overstated** and worth recording: it called the
> onboarding privacy polarity a release-gating P0 ("the installed base is queued
> for deletion"). Checked against production: the deletion predicate is
> `(global_cleanup_enabled AND up.enable_cleanup_data)` and the global switch in
> `private.system_configurations` reads **false**, so nothing is being deleted.
> The column defaults to `false` and only **8 of 3,112** rows are `true`. Code
> observation correct, stated impact not occurring. Do not take agent severity
> at face value.

### 🚨 A fresh worktree cannot archive

Three gitignored prerequisites were absent and each would have cost a cycle:

| Missing | Consequence |
|---|---|
| `.env.staging` | archives **successfully** with no API URL baked in, dead on device |
| `ios/ExportOptions.plist` (`.gitignore:98`) | export fails after the ~15 min archive |
| `ios/Pods` | archive fails immediately |

Also: `pod install` dies with `Unicode Normalization not appropriate for
ASCII-8BIT`. Fix is `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install`.

### Gates

All six passed: app `CFBundleVersion` 415, **both** `.appex` 415, bundle id
`app.murror.mobile.stg`, staging host present, dev host absent,
`main.jsbundle` 13 MB. Script kept at
`<session scratchpad>/verify-archive.sh`; it discovers the `.app` rather than
assuming its name (the staging scheme produces `MurrorMobileStaging.app`).

⚠️ Warning on upload: **no dSYM for `hermes.framework`**, so a Hermes-level
crash in 415 may not symbolicate.

### Exit codes are not evidence, twice over

The archive step reported failure purely because `status` is a **read-only
variable in zsh**, so `status=$?` failed after `** ARCHIVE SUCCEEDED **`. Read
the output, not `$?`. Same reason the runbook says never trust the export exit
code.

---

## Known-open

- **#965's cold-start rescue may be structurally dead.** A reviewer argued the
  account-cache isolation queue is FIFO, so the superseding auth event enqueues
  after our read and the rescue finds nothing. Credible, not proven. If a
  cold-start force-logout still reproduces on 415, this is why.
- **Onboarding privacy backfill.** Forward path fixed, no backfill; a small
  number of rows may hold the opposite of what those users chose.
- **Three hardening items verified but unfixed**, each carrying a decision:
  takeaway has no TTL (`TakeawayReflection` has no `expiresAt`, `MovieInvite`
  does); poke has no rate limit (`send-manual-poke.use-case.ts`, 285 lines, zero
  cooldown matches, and the throttler has no custom tracker so it keys by IP not
  user); `attemptCount` is written 4 times in the deletion pipeline and read as
  a cap **zero** times. A naive cap there would abandon a deletion with the PII
  still in place, which is worse than the bug.
