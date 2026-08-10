# Mac mini: setting up to continue the launch work

Two parts. Part 1 is a one-time setup you run on the mini. Part 2 is the prompt to
paste into a new Claude Code session there.

---

## PART 1: one-time setup on the Mac mini

Run these and check each result. Every one of them is something the previous
session depended on that does NOT travel in git.

### 1. Repos

The work spans three repos, all under one parent folder:

```bash
mkdir -p ~/Projects/murror-transfer/Murror && cd ~/Projects/murror-transfer/Murror
git clone git@github.com:Murror/MurrorMobile.git
git clone git@github.com:Murror/murror-api.git
git clone git@github.com:Murror/viasr-api.git
```

If the paths differ from the MacBook, that is fine. Nothing depends on the exact
location, only on the three repos being present.

### 2. SSH access to GitHub

```bash
ssh -T git@github.com          # expect: "Hi <user>! You've successfully authenticated"
```

If that fails, no work can be pushed. Fix it before anything else.

### 3. Node and package managers

```bash
node --version                 # expect v22.x
corepack enable
```

MurrorMobile uses Yarn 3.6.4 via corepack, murror-api uses pnpm, viasr-api uses
Poetry with Python 3.11.

### 4. GitHub CLI

```bash
gh auth status                 # must be logged in, with repo scope
```

Without this it cannot open or merge pull requests.

### 5. Codex CLI (only if you want the parallel lane)

```bash
npm i -g @openai/codex@latest
codex --version                # MUST be >= 0.147.0
codex login status             # expect "Logged in using ChatGPT"
```

An older CLI hangs SILENTLY for 30 minutes against the configured `gpt-5.6-sol`
model. That is not a hypothetical, it happened and cost half an hour of nothing.

### 6. Optional, only needed for specific tasks

- `viasr-api/.env` containing `ANTHROPIC_API_KEY`. Needed only to measure prompt
  behaviour against the real model. Not needed for the mobile or backend work.
- `kubectl` contexts `do-sgp1-murror-cluster-sgp1` and `do-sfo2-murror-cluster`.
  Needed only to verify cluster claims. Not needed for source work.

Skip both if the mini is doing the source-tier tasks, which is the recommendation.

### 7. Sanity check before starting real work

Have the session run these two FIRST. If either fails you learn in seconds
instead of an hour:

```bash
git -C ~/Projects/murror-transfer/Murror/MurrorMobile push --dry-run
codex --version
```

---

## PART 2: paste this as the first message of the new session

---

You are continuing production launch hardening for Murror. The user is Astro; call
him Astro, never Vinh.

Before anything else, run these two and report the result:

```bash
git -C <path>/MurrorMobile push --dry-run
codex --version
```

## Read these two ledgers FIRST. They are the source of truth, both pushed.

```
git show origin/codex/ios-production-427-audit-20260810:docs/audits/ios-production-427-evidence.md
git show origin/codex/api-prod-audit-20260810:docs/audits/murror-api-production-readiness.md
```

Both verdicts are NO-GO. They use tiered evidence (SOURCE / AUTOMATION /
SIGNED_ARTIFACT / DEVICE / PROVIDER). Never let a lower tier stand in for a higher
one. Cite ledger IDs in every commit and PR.

## HARD RULE from Astro: never half-fix anything

A fix is done when every surface, path and consequence of the same cause is
closed, not when the reported symptom stops. Earned the hard way:

- An OTA fix made the check run again but left the CTA opening the App Store.
- A gendered-pronoun fix landed on the journal prompt while Care Tips had the same
  bug at 65% and relationship_reflection at 100%.
- A journal draft sat in plaintext because the conversation draft had been
  migrated and the journal one was left behind.
- A deep-link fix matched `/home_screen` against `/home_screen_x` until a test
  caught it.

Before calling anything fixed: grep every sibling with the same shape, follow the
consequence chain past the symptom, and MUTATION-TEST the guard. Reintroduce the
defect, confirm the test goes red, and verify the mutation actually applied before
trusting a green run. A `sed` that matches nothing produces a green run that means
nothing.

State plainly what you did NOT verify.

## Working rules that cost time when ignored

- PRs target `staging-environment-setup` (MurrorMobile) or `staging` (murror-api,
  viasr-api). NEVER commit on those branches directly. Check
  `git rev-parse --abbrev-ref HEAD` before you start editing; a previous session
  nearly worked straight on the protected branch.
- Rebase onto canonical BEFORE running the suite you intend to quote. A previous
  session reported a passing suite from a base four commits stale.
- `gh pr merge` can print a failure while succeeding. Always re-read the PR state
  rather than trusting the exit code. Same for `sed`, `tail`, and anything with
  `continue-on-error`.
- Commitlint rejects body lines over 100 chars, `#123` references, and
  line-initial `Word:`.
- No em dashes anywhere in code, comments, copy, prompts or PR text.
- Jest no longer needs `--forceExit` and must not have it re-added; see CLAUDE.md.

## Astro's two decisions, both made, neither built

### SUB-001, lifetime Premium. DECISION: make production real.

A retired signup writer left a `Free Plan` / `com.murror.freeplan` placeholder
subscription row on nearly every user, `status = ACTIVE` with a null
`currentPeriodEnd`. `isSubscriptionPaidThrough` reads that as lifetime paid.
Measured 2026-07-31: 2,813 of 3,067 users (~92%), while only 12 genuinely pay.

`src/subscription/subscription-access.ts` already defines `isFreeTierPlaceholder()`.
It is correct, it has a thorough PASSING spec, and NOTHING in product code calls
it. Verify that with a grep yourself before touching anything: the only references
are its own definition and its own spec. Green tests currently imply a fix that
does not exist.

Astro's instruction: everyone loses Premium except users who actually subscribed.

BUILD IT BEHIND A GATE THAT DEFAULTS OFF so merging changes nothing, then Astro
ramps 1% -> 10% -> 100%. The ramp is HIS call, not yours. Report the count of rows
that would flip BEFORE any ramp.

The discriminator requires the Free Plan product AND no store footprint (no
`revenueCatUserId`, no `originalTransactionId`, no `lastEventType`). Any genuine
payer whose row lacks all three would be wrongly downgraded, which is exactly why
the ramp exists.

Do NOT widen `isSubscriptionPaidThrough`. There is a standing rule against it from
an earlier incident where widening it showed Premium while content stayed locked.

### PRIV-427-003, AI training consent. DECISION: split the flag first.

ONE column, `enable_cleanup_data`, carries TWO meanings:
  1. "do not use my data for AI training"
  2. "delete my data after 2 weeks", via `delete_old_user_data()` which selects
     `WHERE global_cleanup_enabled AND up.enable_cleanup_data`

So declining training also silently schedules deletion. That is why the question
cannot be asked honestly yet, and why failing closed would DELETE DATA.

Task one is the server-side split: a separate consent column so declining training
stops meaning deletion. Do NOT flip any existing user's stored value.

Already verified, do not re-derive:
- `toAllowDataTraining(undefined)` returns TRUE, so absence reads as consent.
- V2 onboarding never routes to `DataSecurityScreen`.
- `onboarding-store.ts:295` sends `enableCleanupData: this.enableCleanupData || false`,
  and `false` means ALLOWED.
- `DataSecurityScreen` IS reachable from Settings (`fromSettings: true`), confirmed
  by Astro. Its ONBOARDING branch is dead code: `onPressNext` navigates nowhere and
  it pre-ticks `setIsApproved(true)`.
- DB column default is `false` (allowed), migration `20250828065045`.

After the split lands, where to ask new users is a design question for Astro, noting
the live onboarding length A/B (`full` | `short`).

## START HERE: SEC-427-001

All schemes share the app group `group.com.murror.widget`, and access plus refresh
tokens are written to that app-group `NSUserDefaults` suite, so production,
staging and development credentials share one container with no Keychain-grade
protection. `ios/RNWidgetBridge.m:23-76`, and the production/staging/development
entitlements at `:19-22`.

This needs per-environment app groups AND a migration for tokens already written.
Do not ship the entitlement change without the migration, or existing installs
lose their session.

## Then, in rough value order

- SEC-427-002. `ios/MurrorLiveActivity/LiveActivityPhotoStore.swift:14-49` uses
  `URLSession.shared.data(from:)` with no host, MIME or size checks and writes to
  one shared filename.
- OFFLINE-427-001. `offlineFirst` with `retry: 0` rejects instead of pausing while
  the copy promises changes will sync.
- AUTH-427-001. Deep-link readiness set only on authenticated cold start and never
  reset; Branch hardcodes `isHasUser: true`.
- REL-427-004. Environment selection runs AFTER React Native bundling in the pbxproj.
- QA-427-001. Extension iOS floors 18.1 and 18.5 versus a host floor of 15.5.
- OBS-427-001. No Hermes dSYM in the archive.
- A11Y-427-001. `Text.defaultProps.allowFontScaling = false` disables Dynamic Type
  globally, `app.tsx:63-65`. High visual blast radius, needs device verification,
  so bring a plan to Astro rather than changing it blind.

Older backlog: RevenueCat customer vs subscriptions endpoint; prompt
personalisation; unify the three `resolveName` precedences; restore the weakened
webhook transaction trap; add-a-memory upload loading state; new-user cold-start
walkthrough.

## Already CLOSED, do not redo

REL-427-001, REL-427-003, PRIV-427-005, PRIV-427-006, SEC-427-003, SEC-427-004,
AUTO-427-002, AUTO-427-003, API-001, DEP-427-001/002/003, E2E-427-001, CI-427-001,
plus a newly published h2 CVE (viasr).

## Decided, do NOT reopen

- Lock Screen photo (PRIV-427-006): the photo is INTENTIONAL, Astro chose it, and
  no in-app opt-out is needed. Only a stale comment was wrong, and it is fixed.
- Council personas: old entries keep their stored council, it is a snapshot of its
  moment. Do NOT add a read-side persona pin, it would blank councils.

## TestFlight

Canonical carries several fixes build 427 lacks, so 428 would be materially better
to test. NOT cut yet. Use `./scripts/ios-next-build.sh` for the number, never
hand-pick it, merge the bump PR, then archive. It will be a TESTABLE build, not a
launch candidate: every DEVICE and PROVIDER gate is still open (upgrade from public
1.0.19, StoreKit, APNs, subscriber lock, deletion receipts, VoiceOver).

## If running unattended while Astro is on his phone

Do NOT without him answering first:
- ramp the SUB-001 gate above 0%
- cut a TestFlight build or bump a build number
- deploy anything, to any environment
- change any existing user's `enable_cleanup_data` value
- merge a PR that changes team-wide tooling behaviour

Safe to do freely: open PRs, commit, push, run tests, work the SOURCE-tier items.
When blocked, open a PR with the analysis and move to the next item rather than
waiting.

## Working with Codex in parallel, if you want it

Use `codex exec` from Bash. Two traps, both already hit:
- Give Codex a standalone CLONE, not a git worktree. A worktree's `.git` is a
  pointer OUTSIDE the sandbox root, so file edits work but commits never land.
- Its sandbox has no network egress. Have it write a git bundle, then verify the
  SHA-256 and recover the branch yourself.

Split lanes by top-level directory so a conflict is detectable with one
`git diff --name-only`. Codex took `.github/ e2e/ scripts/ package.json yarn.lock`;
Claude took `src/ app.tsx ios/`. It respected that perfectly. Verify its output
rather than merging on trust: its finding quality is high, but one report claimed
jest exits cleanly while its own finding proved otherwise.
