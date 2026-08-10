# 2026-08-10: Build 428 to TestFlight, connector repair, and a guard that could never pass

## Context

Two threads ran on 2026-08-10. The iOS lane closed out build 428, which had been
archived once already and failed at the very last step. Separately, the local tooling
that every session depends on turned out to be quietly broken in three different ways,
all of them traceable to the same underlying cause: this workstation was migrated to a
new Mac and a new user account, and several things still pointed at the old machine.

This document covers 2026-08-07 through 2026-08-10, the window that had no writeup.
`docs/plans` and `PROGRESS.md` both stop at 2026-08-06.

## What shipped

### iOS, builds 420 to 428

Builds 420 through 427 landed 08-08 and 08-09. Build 428 was archived and uploaded on
08-10 (this session).

| PR | Change |
|---|---|
| #1041, #1043 | Removed the summon-another-voice button from the council card; build 420 |
| #1044, #1045, #1046 | Card border painted above the fill so the hairline is visible; builds 421, 422 |
| #1047 | State of Your World Home became the only Home |
| #1048 | One colour map, so callouts stop rendering grey |
| #1049, #1050, #1051, #1052, #1053 | Council bio in per-section footers, feed icon alignment, upload deadlines and visible states, MTC premise correction; build 424 |
| #1054 | Privacy boundary stopped eating the A/B properties |
| #1055, #1056, #1057 | ENVFILE pinned on every CodePush release script; store prompt stopped silencing the OTA channel; build 425 |
| #1058, #1059, #1060 | The other persona surface, opaque MTC card, a way back to a dismissed update; build 426 |
| #1061, #1062, #1063 | Built features defaulted ON in production, returning users told what changed; build 427 |
| #1064, #1065, #1066, #1067, #1068 | Moments empty-state reason, remote kill switch restored, OTA modal CTA to CodePush, journal drafts no longer written to plaintext storage |
| #1070 | Device no longer declared clean after a partial account wipe |
| #1071 | QueryClient GC timers no longer leak, so jest exits again |
| #1072 | Build number bumped to 428 |

### API

`murror-api`: #737 gated the Vietnam-only advisor by user market. #738 collapsed display
name resolution to one resolver. #740 captured merge-tree exit status before errexit killed
the drift guard. #742 and #743 fixed the migration lock bound (role level, not URL) and
bounded the batch from its own first migration. #745 pointed the production runbook at the
real cluster. #746 established that an empty reflection is not a degraded field. #748 stopped
mounting Galaxy in production. #749 turned shared photos on by default behind a kill switch
rather than a gate. #750 turned streak reminders and article pushes on in production.

`viasr-api`: #605 defaulted `care_tips_enabled` ON in production. #606 stopped the starter
questions guessing a person's gender. #609 raised h2 to 4.4.1 for CVE-2026-71554.

`murror-platform`: statistic-service gained a Marketing module (Buffer live proxy), Audience
was enriched with marketing engagement and real waitlist numbers, and the Audience controller
was mounted under `analytics/` so the ingress actually routes it (#305, #307, #310).

## Build 428: the failure was environmental, not a code defect

The prior archive attempt failed only at codesign with `errSecInternalComponent`, because it
was driven over SSH. An SSH login gets a `Background` security session, which cannot reach the
login keychain.

Verified before re-running, rather than assumed:

- `launchctl managername` returned `Aqua`, a GUI/console security session
- login keychain was default and `no-timeout`, so unlocked
- `security find-identity -v -p codesigning` returned one valid identity

Archive and export then succeeded with no codesign error at all.

**Verification (never exit codes):**

```
** ARCHIVE SUCCEEDED **
Progress 100%: Upload succeeded.
Uploaded MurrorMobileStaging
** EXPORT SUCCEEDED **
```

App `428`, `AppWidgetsExtensionStg.appex` `428`, `OneSignalNotificationServiceExtensionStg.appex`
`428`, bundle `app.murror.mobile.stg`, marketing version `2.1.0`.

### Gotcha: the staging Info.plist is not named Info.plist

A `find ios -name "Info.plist"` check verified only `ios/MurrorMobile/Info.plist`, the
**production** plist. The staging scheme reads `ios/MurrorMobileStaging-Info.plist`, which that
glob never matches. The runbook documents all four per-scheme plists; reading it is what caught
this. Verifying the wrong plist is exactly the build-241 failure mode.

### Note: the archive is signed with a Development identity

`SigningIdentity` in the archive reads `Apple Development: Vinh Tran (RTZJFPJ2B5)`; no Apple
Distribution identity exists in the keychain. The export re-signed for distribution via
`-allowProvisioningUpdates` plus the API key and succeeded. Worth knowing if a future export
fails at signing.

## Local tooling repair

### 1. The workspace guard could never pass

`verify-murror-workspace.sh` hardcoded `/Users/astro/Projects/murror-transfer`. That home does
not exist on this machine (user is `astrotran`, workspace is on an external SSD at
`/Volumes/SSD990/Projects/murror-transfer`, also reachable via a `~/Projects/murror-transfer`
symlink). The guard therefore returned exit 1 **every time**, while `CLAUDE.md` mandated running
it before every build. A guard that cannot pass is not a guard; it becomes noise everyone skips.

Both guards now derive the workspace root from their own resolved location (`${0:A:h}`), with an
optional `MURROR_WORKSPACE` override, and resolve symlinks on both sides so the SSD path and the
symlink path compare equal. Repointing at a literal `/Volumes/SSD990/...` was rejected because it
would break the symlink route and re-break on the next machine move. The Uni forbidden paths are
now `$HOME`-relative. Marker checks run first, so a misplaced copy fails loudly instead of
blessing the wrong tree.

Verified: passes from the vault root, nested worktrees, `wiki/`, and the symlink path; fails from
`/tmp`, `$HOME`, and `/`; a copy run from `/tmp` fails with "code container is missing"; the
cross-platform guard still correctly rejects the iOS build lane.

The original breakage was masked by `./verify-murror-workspace.sh | tail`, which reports **tail's**
exit status, not the guard's.

### 2. claude-mem reported Connected while every tool failed

`claude mcp list` showed `✔ Connected`; every tool returned `Error calling Worker API: fetch failed`.
The MCP server is a thin proxy to a worker daemon on `127.0.0.1:37701`. The worker needs Bun
(`bun:sqlite`), Bun was not installed, the worker never spawned, nothing listened on the port.

Fixed with `npm install -g bun` (Bun 1.3.14) rather than the `curl | bash` installer, because npm
lands the binary in `~/.local/node/bin`, already on the long-lived screen session's stale PATH.
Verified end to end: worker LISTENs, `curl /api/corpus` returns HTTP 200, MCP `search` returns real
results.

**Separate open gap:** the memory has no history. `claude-mem.db` held 0 observations before today
and the pre-upgrade backup is empty. Search works and finds nothing. That is a data gap, not a
connectivity gap, and it shares a cause with the missing session transcripts (see below).

### 3. Connector audit

13 connectors verified working by live call, 3 redundant duplicate registrations removed
(`revenuecat`, `higgsfield`, `cloudflare`), all three working twins re-probed afterwards to prove
nothing broke. Four shadow entries deliberately kept: `stripe`, `mixpanel`, `facebook-ads`,
`plugin:posthog:posthog`. That call was vindicated within the hour, because after a reconnect the
**local** `stripe` and `mixpanel` entries were the ones that connected while their claude.ai twins
stayed dark.

Status board: private Notion page "Connector Status Board", with a per-connector probe command so
status can be re-verified rather than trusted.

**Discovered:** authorizing an MCP server mid-session is not enough. The tool registry is built once
at session start, so a newly authorized server connects but exposes no callable tools until Claude
Code restarts. Same class of staleness as the PATH problem.

`facebook-ads` now fails with a Facebook `GraphMethodException` (code 100, subcode 33), a
permissions or app-config problem, not an OAuth prompt.

## Open items

- Sentry and Mixpanel connectors still unauthorized. Sentry matters most; Gmail holds 160 Sentry
  alert emails, 128 unread, none queryable.
- `facebook-ads` needs a Facebook-side fix, not a reauthorization.
- claude-mem has no history prior to 2026-08-10. Recovering it would mean sourcing from the old
  machine, possibly `_migrated-from-mac/`. Not investigated.
- Session transcripts prior to 2026-08-10 do not exist on this machine, so token accounting for
  2026-08-07 through 2026-08-09 is not possible.
- The `Murror` docs repo has 32 dirty files on `docs/analytics-production-baseline-2026-08`,
  including substantive uncommitted edits to `AGENTS.md`, `docs/CONVENTIONS.md` and
  `docs/runbooks/staging-environment.md`. Not touched here.
