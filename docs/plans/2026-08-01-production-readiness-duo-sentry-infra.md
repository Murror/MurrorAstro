# 2026-08-01 — Production readiness: Duo grace, build lane, Sentry, infra truth

Culmination of a multi-day production-readiness push. Everything below is verified
against live systems, not inferred from config.

## 1. Duo: an ex-member was shown plan-owner copy

**Symptom.** After tapping "Leave this plan" and accepting a dialog promising Premium
to the end of the period, the next screen read: *"Your paid-through access continues,
but this plan cannot start a new invitation. You can share again after renewing."*
Owner copy, shown to a member, about a plan that was never theirs, with no end date.

**Root cause.** An ex-member in seat grace and a Solo subscriber who turned off
auto-renew were **byte-identical on the wire**:

| | planKind | planRole | cancelAtPeriodEnd |
|---|---|---|---|
| Left a Duo plan | SOLO | NONE | true |
| Cancelled own Solo sub | SOLO | NONE | true |

`resolveMember` reaches that state only via a REMOVED seat carrying `entitledUntil`.
It knew both facts and flattened them into one boolean.

**Fix.** murror-api **#701** adds `seatGraceUntil`, deliberately the DATE rather than a
`wasMember` flag beside a separately derived date, so the discriminator and the printed
value come from one read of one seat and cannot drift. `isInSeatGrace` became
`seatGraceUntil`. MurrorMobile **#988** renders a member-specific block and *excludes*
it from `endingSoloGrace`, so the owner wording is replaced rather than joined.

**Verified live on staging after deploy:**

```
harness-member (left)  SOLO/NONE  cancelAtPeriodEnd=true  seatGraceUntil=2026-08-26T01:24:16.942Z
harness-subscriber     SOLO       cancelAtPeriodEnd=false seatGraceUntil=null
harness-organizer      FREE                               seatGraceUntil=null
harness-outsider       FREE                               seatGraceUntil=null
```

Exactly one of four returns a date, matching the seat's `entitled_until` to the ms.

**Copy is deliberately neutral on cause.** `seatGraceUntil` is set for any REMOVED seat,
which covers both leaving and being removed by the organizer, so "You are no longer on a
shared plan" is the only phrasing true in both cases.

**Load-bearing proof.** Reverting the derivation fails exactly two tests: the date test,
and an invariant test asserting `cancelAtPeriodEnd === (seatGraceUntil !== null)`.

**An existing test encoded the bug as a requirement** (`"shows honest ending access for a
former Duo member in grace"` asserted the owner copy). Kept and renamed: its fixture has
no `seatGraceUntil`, which is exactly an old client on an old API, so it now locks
back-compat instead of the defect.

## 2. Avatar placeholder, and the production landmine under it

MurrorMobile **#989**. Manage Account showed a grey disc reading ADD AVATAR while every
other surface already drew an avatarless person as a butterfly. Now reuses
`defaultButterflyForConnection` and the same three presets onboarding ships.

**The landmine.** `src/constants/avatar-presets.ts` hardcoded the **staging** Supabase
project id, with a comment asking whoever cuts a production build to remember to swap it.

```
.env.production   -> dcftszkbpamgeivhtuzl   (production)
avatar-presets.ts -> sprkxmwrvgqgebajopwp   (STAGING, hardcoded)
env override      -> none
```

These are the only URLs in the app that are **built and then persisted as user data**
(the picker writes `preset.url` into the profile `avatar` field). A production build
would have written staging URLs into production accounts, and changing the constant
later does not rewrite rows already written.

Now derived from `Config.SUPABASE_URL`, with a test naming all three known project ids
so a future paste fails loudly.

**Exposure measured on the production DB: zero.**

```
staging preset URLs: 0 | prod URLs: 267 | any preset: 0 | any avatar: 267 / 3092 users
```

Preventive, not remedial. No backfill needed.

## 3. Build lane: 403 was already on TestFlight while trunk said 402

`ios-next-build.sh` computed `max(canonical, local) + 1` from **git alone**, so a build
archived off-lane was invisible to it. Run as-is it would have emitted a colliding 403.
Apple rejects the duplicate and the fix it carried silently never ships. Same failure
that collided 251 twice and lost the phantom 253.

**#990** queries App Store Connect across all three app records and takes
`max(git, Apple)`. Advisory, not blocking: no ASC key still yields a number plus a loud
warning that it is unverified. Verified against the real discrepancy:

```
canonical=402  local=402  asc=403  ->  NEXT BUILD = 404
NOTE: TestFlight is AHEAD of origin/staging-environment-setup (403 > 402).
```

`CLAUDE.md` corrected in both places where it promised "canonical + 1".

**Build 404** (#991) archived and verified before upload: app plus both appex at 404,
binary containing only `https://staging.api.murror.app`. VALID on App Store Connect.

Three environment traps cleared getting there, all worth recording: CocoaPods needs a
UTF-8 locale; the vendored `xcodeproj` needed the `70 => 'Xcode 16.0'` patch (the gem set
copied from build 400 did **not** carry it, only the global gem did); and the first
`pod install` reported success only because it was piped through `tail`, which discards
the real exit status.

## 4. Sentry: correct tagging before the DSN, then live

**#703.** `Sentry.init` tagged events with `NODE_ENV`, and `NODE_ENV` is `production` on
**every** tier. Verified by reading the running pods, not the ConfigMaps (which do not
set it at all):

```
nsp-prod-murror     NODE_ENV=production  ENVIRONMENT=production
nsp-staging-murror  NODE_ENV=production  ENVIRONMENT=staging
```

So staging and alpha errors would have been filed as production. Invisible until a DSN
exists, then it fails in the worst way: events arrive, tagged plausibly, and there is no
way afterwards to separate real user errors from test traffic. Now prefers `ENVIRONMENT`,
matching the call `main.ts` already makes for the Swagger gate.

**Enabled in production.** Used the pre-existing `murror-api` Sentry project (no new
project, no billing change). Patched the prod ConfigMap and restarted:

```
pods 2/2 Running, 0 restarts | SENTRY_DSN SET (95 chars) in the running pod
ENVIRONMENT=production  NODE_ENV=production
api.murror.app 200 | murror.api.ambercare.app 200
```

Checked inside the pod rather than trusting the patch output, because `envFrom` config
that patches cleanly but never reaches the container looks identical to success.

## 5. TLS: a certificate broken for 105 days

**#704.** `manifests.yml` declared TLS twice for one secret: the Ingress
`cert-manager.io/cluster-issuer` annotation (ingress-shim creates and owns a Certificate)
**and** an explicit `Certificate murror-api-tls` claiming the same `${TLS_SECRET_NAME}`.

```
Ready=False  reason=IncorrectCertificate
"Secret was issued for murror-api-tls-staging. If this message is not transient,
 you might have two conflicting Certificates pointing to the same secret."
```

Unnoticed for 105 days because the ingress-shim Certificate held a valid cert the whole
time; only the loser reported failure. Visible symptom was a 14-day-old ACME solver pod.

Survived because the explicit resource hardcoded the name `murror-api-tls` while
`TLS_SECRET_NAME` varies per tier: alpha `murror-api-tls` (name == secret, works by
coincidence), staging `murror-api-tls-staging` (broken), prod `murror-api-prod-tls`
(would break, but prod deploys are image-only so the file never applies).

Safe to remove because the deploy runs `kubectl apply` with **no `--prune`**, so alpha's
standalone Certificate (the live one there) is untouched.

## 6. DigitalOcean: the 4x bill explained

Billing API is 403 with the current token, so this is a run-rate from provisioned
resources at list prices:

| Resource | ~$/mo |
|---|---|
| sfo2 nodes 2 x s-4vcpu-8gb | 96 |
| sgp1 nodes 3 x s-2vcpu-4gb | 72 |
| sfo2 HA control plane | 40 |
| 2 load balancers | 24 |
| 22 GiB block storage + registry | 7-22 |
| **Total** | **~240** |

Nothing is orphaned. The July 4 migration **added** sgp1 and never decommissioned sfo2.

**Corrections to earlier assumptions, all verified:**

- **HA cannot be disabled.** DO docs: "Once enabled, you cannot disable high
  availability." Deleting the cluster is the only route.
- **sfo2 is not "staging".** It hosts prod dashboard (ClickHouse 10GiB + Postgres 2GiB),
  prod web-client, insights-portal, and prod Redis, plus staging, alpha, ArgoCD.
- **sfo2 cannot be downsized.** Memory-bound at ~8.8GB actual; CPU requests already
  78-85%.
- **Consolidation saves ~$52/mo, not $148**, because workloads carry their compute with
  them. sgp1 needs ~4 more nodes to absorb sfo2.

**The real lever is over-declared requests**: sfo2 REQUESTS 6.4 CPU and USES 0.83.

Plan tracked as tasks #35-38, spun into a separate session. Estimated 8-11 focused days.
Recommendation: step 1 (right-size requests) now, steps 2-5 after launch.

## 7. Production RevenueCat and the murror.app hostname

Registered both Duo SKUs under the live app and attached them to `app.murror.premium`
(verified via API, 12 products, both under `app59ccc217b8` not the dev app). The Duo
money path is complete in production RevenueCat.

**#992** points `.env.production` at `api.murror.app`. This **starts a clock, it does not
retire anything**: users on older builds keep calling the old host for months.

## Two near-misses worth remembering

Both were "remove the unused thing" that turned out load-bearing, caught by checking live
state before acting:

1. **`insights.murror.app`** — believed unused, was returning **HTTP 200** off the sfo2
   LB. Astro confirmed it is important. Now part of the move, not a deletion.
2. **`murror.api.ambercare.app`** — believed retired legacy. It is what
   `.env.production` points at, so **the live App Store app calls it**. Removing it would
   have taken down every existing user instantly.

## Corrections I had to make

- Claimed production had no Duo ASC products. They existed, created by me on 2026-07-31
  and forgotten across a compaction.
- Claimed a DSN would tag production errors as `development`. The inverse: `NODE_ENV` is
  `production` everywhere, so staging noise would have been filed as production. The code
  comment already said so.
- Framed "production has no Duo products" as a discovery when it was the expected state
  of staging-first work.

Pattern: check what exists before building it, and read live state before asserting.

## Still open

- Device sandbox purchase on build 404 (only remaining Duo blocker; simulator cannot do
  StoreKit). Staging products are READY_TO_SUBMIT and sandbox-purchasable.
- #689 promotion decision, which gates the production seat map (task #31).
- Production 2.0.0 archive must be cut **after** #992.
