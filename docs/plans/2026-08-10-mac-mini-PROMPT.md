# PASTE EVERYTHING BELOW THE LINE INTO A NEW CLAUDE CODE SESSION ON THE MAC MINI

Run the setup in `2026-08-10-mac-mini-setup.md` first if the mini has never done
this work. The two checks at the top of the prompt will tell you in seconds if
something is missing.

---

You are continuing production launch hardening for Murror. The user is Astro. Call
him Astro, never Vinh.

## First, two checks. Report both before doing anything else.

```bash
git -C <repo-path>/MurrorMobile push --dry-run
codex --version
```

`push --dry-run` must succeed or nothing can be delivered. `codex --version` must
be **0.147.0 or newer**; an older CLI hangs SILENTLY for 30 minutes against the
configured model, which already happened once and cost half an hour of nothing. If
you are not using the parallel Codex lane, the second check does not matter.

The work spans three repos under one parent folder: `MurrorMobile`, `murror-api`,
`viasr-api`.

## Read these two ledgers FIRST. They are the source of truth, both pushed.

```bash
git show origin/codex/ios-production-427-audit-20260810:docs/audits/ios-production-427-evidence.md
git show origin/codex/api-prod-audit-20260810:docs/audits/murror-api-production-readiness.md
```

Both verdicts are NO-GO. They use tiered evidence: SOURCE, AUTOMATION,
SIGNED_ARTIFACT, DEVICE, PROVIDER. Never let a lower tier stand in for a higher
one. Cite ledger IDs in every commit and PR.

## HARD RULE from Astro: never half-fix anything

A fix is done when every surface, every path and every consequence of the same
cause is closed. Not when the reported symptom stops. This was earned:

- An OTA fix made the check run again but left the button opening the App Store.
- A gendered-pronoun fix landed on the journal prompt while Care Tips had the same
  bug at 65% and relationship_reflection at 100%.
- A journal draft sat in plaintext because the conversation draft had been
  migrated and the journal one was left behind.
- A deep-link fix matched `/home_screen` against `/home_screen_x` until a test
  caught it.

Before calling anything fixed:

1. Grep every sibling with the same shape. Ask "what else looks like this?"
2. Follow the consequence chain past the symptom. One wrong value usually has
   more than one reader.
3. MUTATION-TEST the guard. Reintroduce the defect, confirm the test goes red,
   and **verify the mutation actually applied** before trusting the result. A
   `sed` that silently matches nothing produces a green run that means nothing.
4. Say plainly what you did NOT verify.

## Traps that already cost time here

- **Check your branch before editing.** `git rev-parse --abbrev-ref HEAD`. A
  previous session nearly worked directly on `staging-environment-setup`.
- **Rebase onto canonical before running the suite you intend to quote.** A
  previous session reported a passing suite from a base four commits stale.
- **Exit codes lie.** `gh pr merge` printed failure while succeeding. `sed`
  reports success when it matched nothing. Re-read the actual state.
- **Jest no longer needs `--forceExit`** and it must not be re-added. It was
  hiding a leak that stranded a process for five days.
- Commitlint rejects body lines over 100 chars, `#123` references, and
  line-initial `Word:`.
- No em dashes anywhere: code, comments, copy, prompts, PR text.
- PRs target `staging-environment-setup` (MurrorMobile) or `staging` (murror-api,
  viasr-api). Never push to those branches directly.

## START HERE: SEC-427-001

Every scheme shares the app group `group.com.murror.widget`, and access plus
refresh tokens are written to that app-group `NSUserDefaults` suite. Production,
staging and development credentials therefore share one container with no
Keychain-grade protection.

Evidence: `ios/RNWidgetBridge.m:23-76`, and the production, staging and
development entitlements at `:19-22`.

This needs per-environment app groups AND a migration for tokens already written.
Do not ship the entitlement change without the migration, or existing installs
lose their session on upgrade.

## Then, in rough value order

- **SEC-427-002.** `ios/MurrorLiveActivity/LiveActivityPhotoStore.swift:14-49` uses
  `URLSession.shared.data(from:)` with no host, MIME or size checks, and writes to
  one shared filename.
- **OFFLINE-427-001.** `offlineFirst` with `retry: 0` executes once and rejects
  instead of pausing, while the copy promises changes will sync.
- **AUTH-427-001.** Deep-link readiness is set only on authenticated cold start and
  never reset. Branch hardcodes `isHasUser: true`.
- **REL-427-004.** Environment selection runs AFTER React Native bundling in the
  pbxproj.
- **QA-427-001.** Extension iOS floors are 18.1 and 18.5 against a host floor of
  15.5.
- **OBS-427-001.** No Hermes dSYM in the archive, so Hermes frames will not
  symbolicate.
- **A11Y-427-001.** `Text.defaultProps.allowFontScaling = false` in `app.tsx:63-65`
  disables Dynamic Type app-wide. High visual blast radius, needs device
  verification. Bring Astro a plan rather than changing it blind.

Older backlog once the above is done: RevenueCat customer vs subscriptions
endpoint; prompt personalisation; unify the three `resolveName` precedences;
restore the weakened webhook transaction trap; add-a-memory upload loading state;
new-user cold-start walkthrough.

## Astro's two decisions. Both made. Neither built.

### SUB-001, lifetime Premium. DECISION: make production real.

A retired signup writer left a `Free Plan` / `com.murror.freeplan` placeholder
subscription row on nearly every user, `status = ACTIVE` with a null
`currentPeriodEnd`. `isSubscriptionPaidThrough` reads "ACTIVE with no expiry" as
lifetime paid. Measured 2026-07-31: **2,813 of 3,067 users (~92%)**, while **12**
genuinely pay. The soft paywall does not exist until this is fixed.

`src/subscription/subscription-access.ts` already defines `isFreeTierPlaceholder()`.
It is correct and has a thorough PASSING spec, and **nothing in product code calls
it**. Verify that with your own grep before touching anything: the only references
are its own definition and its own spec file. The green tests currently imply a fix
that does not exist.

Astro's instruction: everyone loses Premium except users who actually subscribed.

**Build it behind a gate that DEFAULTS OFF** so merging changes nothing, then Astro
ramps 1% then 10% then 100%. The ramp is HIS call, never yours. Report the count of
rows that would flip BEFORE any ramp is discussed.

The discriminator requires the Free Plan product AND no store footprint: no
`revenueCatUserId`, no `originalTransactionId`, no `lastEventType`. Any genuine
payer whose row lacks all three would be wrongly downgraded, which is exactly what
the ramp is for.

Do NOT widen `isSubscriptionPaidThrough`. There is a standing rule against it from
an earlier incident where widening it showed Premium while content stayed locked.

### PRIV-427-003, AI training consent. DECISION: split the flag first.

ONE column, `enable_cleanup_data`, carries TWO meanings:

1. "do not use my data for AI training"
2. "delete my data after 2 weeks", via `delete_old_user_data()` which selects
   `WHERE global_cleanup_enabled AND up.enable_cleanup_data`

So declining training also silently schedules deletion. That is why the question
cannot be asked honestly yet, and why failing closed would DESTROY DATA rather than
protect it.

Task one is the server-side split: a separate consent column so declining training
stops meaning deletion. Do NOT flip any existing user's stored value.

Already verified, do not re-derive:

- `toAllowDataTraining(undefined)` returns TRUE, so absence of a choice reads as
  consent.
- V2 onboarding never routes to `DataSecurityScreen`; `use-onboarding-signup.ts`
  calls `onboardingStore.submitOnboarding()` directly.
- `onboarding-store.ts:295` sends `enableCleanupData: this.enableCleanupData || false`,
  and `false` means ALLOWED.
- `DataSecurityScreen` IS reachable from Settings (`fromSettings: true`), confirmed
  by Astro. Its ONBOARDING branch is dead code: `onPressNext` navigates nowhere and
  it pre-ticks `setIsApproved(true)`.
- The DB column default is `false`, meaning allowed. Migration `20250828065045`.

After the split lands, where to ask new users is a design question for Astro, noting
the live onboarding length A/B (`full` and `short` arms).

## Already CLOSED. Do not redo.

REL-427-001, REL-427-003, PRIV-427-005, PRIV-427-006, SEC-427-003, SEC-427-004,
AUTO-427-002, AUTO-427-003, API-001, DEP-427-001, DEP-427-002, DEP-427-003,
E2E-427-001, CI-427-001, plus a newly published h2 CVE in viasr.

19 pull requests merged on 2026-08-10 across the three repos. Canonical
`staging-environment-setup` was at `9a95a943`.

## Decided by Astro. Do NOT reopen.

- **Lock Screen photo** (PRIV-427-006): showing the photo is INTENTIONAL, Astro
  chose it, and no in-app opt-out is needed. Only a stale comment was wrong and it
  is already fixed. An auditor filed this as a privacy violation by reading that
  stale comment as current policy.
- **Council personas**: old entries keep their stored council. It is a snapshot of
  its moment. Do NOT add a read-side persona pin, it would blank councils whose
  stored panel lacks the pinned persona.

## Two open PRs, and one of them is YOUR work

**#1074 (deps, lint, E2E)** is the green split of Codex's CI lane. Astro merges it.
Do not touch it. It cuts dependency advisories from 213 groups to 40 with 0
critical, repairs the E2E harness, and swaps `yarn lint` to an exact-baseline
checker with raw ESLint at `yarn lint:raw`.

**#1069** is now ONLY the job that compiles the production Release scheme in CI,
and it is RED:

```
** BUILD FAILED **
ios/MurrorMobile.xcodeproj: error: Unable to open base configuration reference file
exit code 65
```

That is not a regression. The production scheme had NEVER been compiled in CI
before, so this job found on its first run that it cannot resolve its `.xcconfig`
on a clean runner. Real finding, and it is IN YOUR LANE (`ios/`).

**Work it as CI-427-001b, and check REL-427-004 first.** The strong hypothesis,
untested: the missing xcconfig is produced by a build phase that runs LATER, which
is the same defect as REL-427-004 (environment selection running after React
Native bundling). If so, one fix closes both. Verify that rather than assuming it;
it is a hunch, not a finding.

Do not merge #1069 yourself. Fix the cause, push to its branch, and report.

## TestFlight

Canonical carries several fixes that build 427 lacks, so **428 would be materially
better to test**. It has NOT been cut. If Astro asks for it: run
`./scripts/ios-next-build.sh` for the number, never hand-pick it, merge the bump PR
first, then archive from `staging-environment-setup`. Hand-picking numbers forked
build 251 twice and produced a phantom 253.

It would be a TESTABLE build, not a launch candidate. Every DEVICE and PROVIDER
gate is still open: upgrade from public 1.0.19, StoreKit purchase, APNs, subscriber
lock, deletion receipts, VoiceOver.

## If Astro is away and this is running unattended

Do NOT do any of these without him answering first:

- ramp the SUB-001 gate above 0%
- cut a TestFlight build or bump a build number
- deploy anything, to any environment
- change any existing user's `enable_cleanup_data` value
- merge a PR that changes team-wide tooling behaviour, such as #1069

Safe to do freely: open PRs, commit, push, run tests, and work the SOURCE-tier
items above. When blocked on a decision, open a PR with the analysis and move to
the next item rather than stalling.

## Optional: running Codex in parallel

Use `codex exec` from Bash. Two traps, both already hit here:

- Give Codex a standalone CLONE, never a git worktree. A worktree's `.git` is a
  pointer OUTSIDE the sandbox root, so file edits work but commits never land.
  This produced 10,000 log lines and zero commits.
- Its sandbox has no network egress, so it cannot fetch or push. Have it write a
  git bundle, then verify the SHA-256 and recover the branch yourself.

Split lanes by top-level directory so a conflict is detectable with one
`git diff --name-only`. Codex took `.github/ e2e/ scripts/ package.json yarn.lock`;
Claude took `src/ app.tsx ios/`. It respected that perfectly.

Verify its output rather than merging on trust. Its finding quality is high, it
found a defect a previous Claude fix had left half-closed, but one of its reports
claimed jest exits cleanly while its own finding proved otherwise.

## Keep the board current

There is a live launch board Astro reads. Update it as things land:

```
https://claude.ai/code/artifact/18706bde-ace5-4d13-b820-38d8dc69e0cd
```

To update it from a new session, pass that URL as the `url` parameter to the
Artifact tool, or it will mint a new one and Astro will lose the link.
