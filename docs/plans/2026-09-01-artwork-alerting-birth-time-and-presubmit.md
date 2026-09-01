# 2026-09-01 — Artwork alerting, birth-time UTC, and the 2.0.0 pre-submit checks

Technical record for one session. Scope is deliberately narrow: **only work this
session actually performed** is described as done. A great deal else landed in
`murror-api`, `MurrorMobile` and `viasr-api` today from other sessions and from
Codex; that is listed at the end as context, not claimed.

## What shipped

| PR | Repo | Merge commit | What |
|---|---|---|---|
| [#910](https://github.com/Murror/murror-backend/pull/910) | murror-backend | `d322b443` | Records the live `users` bucket folder-read RLS policy |
| [#866](https://github.com/Murror/murror-api/pull/866) | murror-api | `d0b21e74` | Stores birth time as UTC, matching the read path |
| [#875](https://github.com/Murror/murror-api/pull/875) | murror-api | `93654c8d` | Hourly job detecting artwork that never finished generating |
| [#876](https://github.com/Murror/murror-api/pull/876) | murror-api | `39a30d46` | Same condition exposed on `/health/monitoring` |

Plus one App Store Connect metadata change (no commit): the `en-US` subtitle was
patched from "Build meaningful connections" to **"AI that brings people closer"**,
matching the `vi` locale and the Night Watch brand line.

## 1. The artwork RLS policy had no repo file (#910)

On 2026-08-29 a policy was applied directly to production
(`dcftszkbpamgeivhtuzl`, ledger version `20260829013703`) to stop live users
seeing the stock butterfly instead of their own entry artwork.

Cause: entry artwork is uploaded by the server with the service role, which
leaves `storage.objects.owner_id` NULL. The 2024 policy
`Users can access the objects they own in the users bucket` matches on
`owner_id`, so it never matched server-generated artwork, and users were refused
their own files on the client-side signing path.

It had **no file** in `murror-backend/supabase/migrations` (246 files there,
newest `20260312100000`), making it the newest unexplained row in the production
ledger and a landmine for any reconciliation sweep.

The file is named with the exact ledger version, so `supabase db push` **skips it
on production** and staging converges on the same policy. Role is `public` to
match production exactly rather than tightening to `authenticated`, which would
have created environment drift.

Deliberately kept **off** branch `mur-912`, which carries 21 recovered orphan
files, has had no PR opened since 2026-08-16, and bundles per-environment sets
that cross-apply. See `reference_supabase_ledger_orphans` in memory.

## 2. Birth time was written in local time, read as UTC (#866)

Both onboarding write sites called `DateHelper.normalizeTime()` only as a
truthiness check, **discarded** the UTC Date it returns, and rebuilt the value as
`` new Date(`1970-01-01T${dto.birthTime}`) `` without a trailing `Z`. That parses
in the server's local timezone. The read path
(`UserProfileService.formatTimeOnly`) extracts with `getUTCHours()`. On a non-UTC
host the two disagree and the stored time drifts.

**Provenance:** recovered from an uncommitted edit dated **2026-07-09** sitting in
the shared `murror-api` checkout, which is pinned to the stale branch
`chore/backfill-takeaway-insights`. It was one `git stash` from being lost. The
original patch no longer applied (line drift), so it was ported to current
`staging`, where the defect was still present at both sites. Authorship is
unknown and worth identifying.

**Severity is lower than it looks.** No `TZ` is set in any Dockerfile, manifest or
workflow, so containers default to UTC where the defect is invisible. This is a
latent landmine removed, not live damage repaired. That is a config grep, not a
runtime measurement of a pod.

### The test design matters more than the fix

The primary assertion is **object identity**, not value. A value assertion would
pass against the broken code on a UTC CI runner and be false evidence. Pinning
`process.env.TZ` inside a test cannot rescue it either: V8 caches the zone at
process start, and setting `TZ` in a test was **measured** to not move `Date` at
all (the jest process resolves `Asia/Saigon`, UTC+8, regardless).

Mutation proof, run twice (once after a lint refactor, because changing assertion
plumbing can silently remove a test's teeth):

```
fixed        2/2 pass
mutated      2/2 fail     (08:30 input stored as 00:30Z, the exact host offset)
restored     2/2 pass
```

## 3. Artwork failures had nothing watching them (#875, #876)

514 COMPLETED conversations in production sat at `statusArtworkUrl = PENDING`
with no monitoring. The regression that produced them was reported by a user on
Facebook, not detected.

### Production numbers this was designed against (measured 2026-09-01)

| status | artwork | count | last 30d |
|---|---|---|---|
| COMPLETED | SUCCESS | 1,356 | 26 |
| DRAFT | PENDING | 780 | 0 |
| **COMPLETED** | **PENDING** (the fault) | **514** | **0** |
| COMPLETED | ERROR | 52 | 0 |
| ACTIVE | PENDING | 36 | 4 |

Artwork is **currently healthy**: 26 of 26 completed conversations in the last 30
days got artwork. All genuine failures are historical. These PRs are a tripwire,
not a repair.

### Two design decisions, both from measurement

**Per row, not a rate.** Production completes roughly one conversation a day. A
percentage threshold is meaningless there: on a three row day one failure reads
as 33%.

**COMPLETED only.** `statusArtworkUrl` **defaults** to PENDING, so DRAFT (780) and
ACTIVE (36) are legitimately PENDING forever. Alerting on those would fire on
1,330 rows on the first run and be muted within a day. A recent-window bound keeps
the 514 row backlog from doing the same.

### Sentry was the obvious channel and is the wrong one

`sentry-scrub.util.ts` `beforeSend` **replaces `event.message` with
`'<redacted>'`**, deletes `tags` and `fingerprint`, and **rebuilds `event.extra`
from a strict allowlist** of HTTP fields (`method`, `route`, `statusCode`). A
`captureMessage` carrying artwork counts arrives contentless. That surface was
hardened deliberately with canary probes; widening it for a health metric was not
done.

### Not on the Kubernetes probes

`/health` and `/health/ready` drive liveness and readiness. A data-quality signal
there would make Kubernetes restart or depool pods over a problem no restart can
fix. The indicator sits on `/health/monitoring` beside
`ConnectionIntegrityHealthIndicator`. Verified structurally: line 281 inside
`@Get('monitoring')`, **zero** occurrences across all three probe endpoints.

### CI's privacy log guard caught a real mistake

`.github/scripts/check-privacy-log-guard.js` rejected interpolating
`error.message` into a logger string, and was right to: a Prisma failure quotes
the offending SQL with literals inlined. Fixed to `error.name` and verified
against the guard locally **with a positive control** (failed before, clean
after).

## 4. 2.0.0 pre-submit checks (not submitted)

Verified against the live App Store Connect API:

- Build **452** attached, `VALID`, not expired (expires 2026-11-28)
- Export compliance **answered** (`usesNonExemptEncryption: false`)
- What's New present for `en-US` and `vi`
- Review contact and demo account present, `demoAccountRequired: true`
- Privacy policy URL set both locales, resolves 200 (via a 308 to `/privacy/`)
- Subtitle now consistent across locales

**Could not verify:**

- The **App Privacy questionnaire** is not exposed by the ASC API. Web UI only.
- **dSYM status**: `/v1/builds/{id}/buildBundles` returned **403**; the API key
  lacks permission.

**Findings:**

- The app requests **no App Tracking Transparency** at all: no
  `NSUserTrackingUsageDescription`, no `requestTrackingAuthorization`, and
  `PrivacyInfo.xcprivacy` declares `NSPrivacyTracking: false`. Any tracking
  declaration in the questionnaire would contradict the binary. Earlier notes
  listing an "ATT prompt" as a device-test item are **wrong**; there is no prompt.
- 🚨 `ios/MurrorMobile/PrivacyInfo.xcprivacy` declares
  **`NSPrivacyCollectedDataTypes` as an empty array** — i.e. the app collects
  nothing. That is untrue for an app storing journal entries, chat transcripts,
  photos and PHQ-9/GAD-7 scores. Unlikely to block submission on its own (the ASC
  questionnaire is the enforced surface, and SDKs ship their own manifests) but it
  is first-party collection going undeclared.
- Sentry symbolication is **off by design**: `SENTRY_DISABLE_AUTO_UPLOAD=true` was
  set in the archive build phase during the 2.0.0 archive repair. Crashes from 452
  will not symbolicate. This is issue #1153, now explained rather than mysterious.

## Corrections made this session

- **"~1 in 8 conversations still failing silently" was wrong.** It counted DRAFT
  and ACTIVE rows where null artwork is expected. Actual: 26 of 26 recent
  completed conversations succeeded.
- **"A leftover ArtworkService points at a bucket that exists in neither
  environment" was wrong.** That is only true on the stale branch the shared
  checkout is pinned to. On `production`, `staging` and `main`, `ArtworkService`
  uses `ARTWORK_BUCKET = 'users'`, exposes `resolveArtworkUrl`, and is injected by
  deep-chat, log and diary-V2 with a DI spec requiring it. **No code was changed.**
  Root cause of the error: reading the shared checkout without checking
  `git branch --show-current`, which the project CLAUDE.md already requires.
- **"The `vi` App Store listing showing English copy is an inconsistency" was
  wrong.** English on all locales is deliberate. Recorded in
  `project_english_only_launch` so a future session does not "fix" it.
- **13 `UniAgentHelper` processes were called "idle strays". They were not** —
  every one had a live parent (6 Codex, 6 Claude Code, 1 `claude --print`).
  Nothing was killed on that wrong basis.

## Context: other work today (NOT this session)

Listed so this document is not mistaken for a complete record of the day.
`murror-api` saw extensive user-profile deletion/CAS hardening, a CI type-check
heap fix, and a profile-sync-on-onboarding change. `MurrorMobile` saw for-us card
state work, emotion arc colouring, connection terminal-card refactors and copy
fixes. `viasr-api` saw SQL parameter redaction in DB error strings and emotion
taxonomy work, plus a `promote/staging-to-production-2026-08-31` branch that was
actively moving during this session. None of that is described here because this
session did not do it.
