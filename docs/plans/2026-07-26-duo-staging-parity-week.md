# Week of 2026-07-19 → 2026-07-26 — Duo/Together to a real staging test surface

## Goal

Astro's framing (2026-07-26): **staging is the production-like surface where real
testers exercise the Duo plan before launch, for both web and mobile.** Success is
a working end-to-end Duo path, not a merge of every open PR.

The chain that has to work:
organizer buys Duo → webhook creates plan + seats → invite email → invitee claims
on staging web → both sides see Premium.

## What landed this week

### Backend (murror-api)

| Commit / PR | What |
|---|---|
| `#634` (`6eace15`) | Webhook silent-success fix + fail-closed seat email |
| `aeb157a` | Refuse invites to someone already covered |
| `4359f11` | Block already-premium claimers, auto-release seat on self-purchase |
| `741c3ef` `373d88c` | Transactional email via Resend, dark templates |
| `7cecbda` | Seat preview endpoint + gift-framed invite email |
| `694b902` `9668104` `dceb3cd` | Security: admin/webhook routes, websocket room ownership + turn correlation |

### Web (murror-platform/apps/web-client)

| Commit / PR | What |
|---|---|
| `#230` (`d45c7ddd`) | Duo claim survives sign-out/sign-in; invitee return; V1 retirement; claim-page exits |
| `61aa8355` | Block already-premium invitees on the claim page |
| `55338a57` `77f0a5ec` `d4f59bb0` | Soft-paywall feature gates + route hardening |

### Mobile (MurrorMobile)

| Commit / PR | What |
|---|---|
| `#839` (`f37e8eb8`) | Duo ON by default for staging (allowlist), production gate-only |
| `#841` (`8fcc1bd3`) | Tester dead end, wrong staging price, two crash sites |
| `#840` | Build bump 371 → 372 |
| `57ca5160` | Staging iOS points at the MurrorStaging RC app |

## The four root causes worth remembering

### 1. Prisma drops `undefined` from a where clause

```ts
const eventId = webhookData.event.id;        // undefined
where: {service: 'revenuecat', eventId}      // becomes {service:'revenuecat'}
```

Degrades to "find ANY revenuecat log row", matches an unrelated processed event,
inherits its `processed` flag, and the purchase is discarded while the endpoint
answers 201. Someone pays and gets nothing, and nothing in the logs looks wrong.
Fixed at **three** sites; two were found by grepping consumers, not by the repro.
`storeAnonymousEvent` was arguably worse than the original: it silently dropped
**pre-login purchases**, the reconciliation path for buying before identifying.

**Three recorded pointers were wrong** and cost a previous session time:
`webhook.service.ts:153` is inside `warnIfOverCapacity` (a logger), `:189` is
inside `reconcileFamilyPlan` (the family branch), and the controller does not
swallow errors into a 201, it rethrows.

### 2. Two independent faults broke the Duo claim

`clearMurrorStorage()` swept the stashed seat token (the `murror_` prefix was
chosen for exactly that in June, before the wrong-account door existed), AND
`login-form.tsx` read only `state.from.pathname`, dropping `search`. Either alone
would have been survivable. A third gap: `clearPendingSeatToken` had **zero**
production callers, so carving the token out of the sweep alone would have left
an immortal token.

### 3. Nothing routed new invitees back to the claim page

`handleSignUp` stashed the token and went to `/onboarding`; nothing returned.
Every new invitee finished onboarding and silently never claimed. This is also
why the stash looked like dead code: the only path needing it was itself broken.
Fixed in BOTH funnels, because a blast-radius grep found
`resolvePostOnboardingRoute` has a second caller in `onboarding-v2/App.tsx`, and
v2 is the funnel at 100% rollout.

### 4. Staging had no seat map at all

The configmap key was absent and the env is `optional: true`, so it silently did
not exist. No product was a family product, `reconcileFamilyPlan` never ran, and a
Duo purchase would have created a personal subscription with **no plan and no
seats** while the webhook answered 201. Same silent-success shape as #1.

## Infrastructure corrections (things previously believed and wrong)

- **Merging to `staging` does NOT deploy alpha.** The deploy matrix fires only
  `nsp-staging-murror`. Alpha needs a separate `Build & Push Image` dispatch.
  Assuming otherwise leaves alpha silently on the old image.
- **A `web-client` deployment has existed in `nsp-staging-murror` for 49 days**
  at `staging.app.murror.app`. The missing `staging` git branch in
  murror-platform was NEVER the blocker for a staging web surface.
- **RC enforces one webhook per URL per project.** Per-app webhooks sharing a URL
  return 409. A distinguishing query param makes the URL unique while hitting the
  same endpoint (verified live: right Bearer 201, wrong Bearer still 401).
- **The staging webhook secret was the literal placeholder `secret-value`.**
  Rotated to a 48-char random value on both sides.
- **The dev webhook was project-wide** (`app_id: null`), so every staging purchase
  also posted to `dev.api.murror.app`, creating phantom users in alpha's DB.

## Verification

| Check | Result |
|---|---|
| Duo harness, alpha | **14/14** |
| Duo harness, staging | **14/14** (`Duo resolves to 2 seats — seatCount=2`) |
| web-client suite | 1763 / 235 files |
| murror-api suites | 498 / 34 |
| mobile Duo suites | 61 / 7 |
| staging + alpha API | `staging-6eace15` on both, health 200 |
| staging + alpha web | `d45c7ddd` on both, `/family/join` 200 |

The incident's exact query, which returned 0 rows, now returns `ACTIVE`.

## Gotchas earned the hard way

- A mock that does not do what production does converts a guard into false
  confidence. The join-page spec asserted "keeps the token" and PASSED throughout,
  because `logoutMock` was a bare stub that never ran the sweep.
- `Config.ENV !== 'production'` is FAIL-OPEN for a money-adjacent flag: `ENV` is
  `'test'` under mocks, and an unset or misspelled env would open the buy path.
  Use an explicit allowlist.
- `Array.isArray(plan?.seats)` does not narrow `plan` for TypeScript. Use
  `plan && Array.isArray(plan.seats)`.
- A locale script that reports success without re-reading the file will lie. Two
  keys shipped English-only because the insert anchored on a key vi/ja lack.
- `git add -A ios/` sweeps `Podfile.lock` and `tmp.xcconfig`. The lockfile must
  keep matching locally installed Pods or the archive fails.

## Still open

- Device pass on staging. Everything proven is rules-level; the harness says so
  itself. Buy Duo in sandbox, confirm plan + 2 seats in the staging DB, invite,
  claim at `staging.app.murror.app`.
- Alpha's `REVENUECAT_WEBHOOK_SECRET` is a literal `kubectl set env` value that
  drifted from the k8s Secret. The RC webhooks match the POD, deliberately.
- V1 onboarding stage 2 (delete ~29 unreachable pages/routes). Stage 1 made V1
  unreachable; deletion is hygiene and off the critical path. Note
  `/onboarding/invite` is shared with v2 and must survive.
- `app_store_connect_api_key_configured: false` on the MurrorStaging RC app.
  Metadata import only, does not block purchases.
