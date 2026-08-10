# Launch blockers handoff, 2026-08-10

Paste the block below as the first message of a new session.

---

You are continuing production launch hardening for Murror. Astro is the user; call him Astro.

## Read these two ledgers FIRST. They are the source of truth, both pushed.

```
git show origin/codex/ios-production-427-audit-20260810:docs/audits/ios-production-427-evidence.md
git show origin/codex/api-prod-audit-20260810:docs/audits/murror-api-production-readiness.md
```

Mobile ledger verdict: NO-GO for build 427. Backend ledger verdict: NO-GO.
Both use tiered evidence (SOURCE / AUTOMATION / SIGNED_ARTIFACT / DEVICE / PROVIDER).
Never let a lower tier stand in for a higher one, and cite ledger IDs in commits and PRs.

## HARD RULE from Astro: never half-fix anything

A fix is done when every surface, path and consequence of the same cause is closed,
not when the reported symptom stops. This was earned the hard way in the previous
session:

- The OTA fix made the check run again but left the CTA opening the App Store. Codex
  caught it, not me.
- The gendered-pronoun fix landed on the journal prompt while Care Tips had the same
  bug at 65% and relationship_reflection at 100%.
- The journal draft was in plaintext because the conversation draft had been migrated
  and the journal one was left behind.

Before calling anything fixed: grep every sibling with the same shape, follow the
consequence chain past the symptom, and mutation-test the guard (reintroduce the
defect, confirm the test goes red, and verify the mutation actually applied before
trusting a green run). State plainly what you did NOT verify.

## Astro's two decisions, both made

### #27 SUB-001, lifetime Premium. DECISION: make production real.

A retired signup writer left a `Free Plan` / `com.murror.freeplan` placeholder
subscription row on nearly every user, `status = ACTIVE` with a null
`currentPeriodEnd`. `isSubscriptionPaidThrough` reads "ACTIVE with no expiry" as
lifetime paid, so those rows grant Premium. Measured 2026-07-31: 2,813 of 3,067
users (~92%), while only 12 genuinely pay.

`src/subscription/subscription-access.ts` already defines `isFreeTierPlaceholder()`,
it is correct, it has a thorough PASSING spec, and NOTHING in product code calls it.
Verify that yourself with a grep before doing anything: the only references are its
own definition and its own spec. Green tests currently imply a fix that does not
exist.

Astro's instruction: wire it so the production side is as real as possible. Everyone
loses Premium except users who actually subscribed.

Build it BEHIND A GATE THAT DEFAULTS OFF, so merging changes nothing, then Astro
ramps 1% -> 10% -> 100%. The ramp is his call, not yours.

Why the gate matters: the discriminator requires the Free Plan product AND no store
footprint (no `revenueCatUserId`, no `originalTransactionId`, no `lastEventType`).
Any genuine payer whose row lacks all three would be wrongly downgraded. A ramp
surfaces that with a handful of users instead of thousands. Report the count of rows
that would flip BEFORE any ramp.

Do NOT widen `isSubscriptionPaidThrough`. There is a standing rule against that from
an earlier incident where widening it caused Premium to show while content stayed
locked.

### #26 PRIV-427-003, AI training consent. DECISION: split the flag first.

Today ONE column, `enable_cleanup_data`, carries TWO meanings:
  1. "do not use my data for AI training" (consent)
  2. "delete my data after 2 weeks" (retention, via `delete_old_user_data()` which
     selects `WHERE global_cleanup_enabled AND up.enable_cleanup_data`)

So a user declining training also silently schedules their data for deletion, and is
never told. That is why the consent question cannot be asked honestly yet, and why
failing closed would DELETE DATA rather than protect it.

Task one is the server-side split: a separate consent column so declining training
stops meaning deletion. Do not flip any existing user's stored value; that is what
triggers deletion.

Facts already verified, do not re-derive:
- `toAllowDataTraining(undefined)` returns TRUE, so absence of a choice reads as
  consent.
- V2 onboarding never routes to `DataSecurityScreen`; `use-onboarding-signup.ts`
  calls `onboardingStore.submitOnboarding()` directly.
- `onboarding-store.ts:295` sends `enableCleanupData: this.enableCleanupData || false`,
  and `false` means ALLOWED.
- `DataSecurityScreen` IS reachable from Settings (`fromSettings: true`), which Astro
  confirmed. Its ONBOARDING branch is dead code: `onPressNext` updates the store and
  navigates nowhere, and it pre-ticks `setIsApproved(true)`.
- The DB column default is `false` (allowed), migration `20250828065045`.

After the split lands, where to ask new users is a normal design question to bring to
Astro, noting the live onboarding length A/B (`full` | `short`).

## Immediate state

Merged this session: mobile #1064-#1068, viasr #605-#609, api #753.

Open PRs:
- api #754, invitation takeover (API-001). CLEAN, ready to merge.
- mobile #1070, account-switch partial wipe (SEC-427-003). CLEAN, ready to merge.
- mobile #1069, Codex CI/deps lane. Needs Astro's eyes: it changes `yarn lint` for
  the whole team (raw ESLint moves to `yarn lint:raw`).

## Open SOURCE-tier work, highest value first

- AUTO-427-002. Leaked `QueryClient` GC timers keep jest alive forever. Codex traced
  two; I found the defect in TEN spec files that create a `QueryClient` and never
  dispose it. PROVEN LIVE: a `--detectOpenHandles` run sat at 0% CPU for nearly three
  hours after assertions finished, and a jest in the `codex-android-parity` worktree
  had been stranded for five days. Both killed. Fix all ten, do not accept
  `--forceExit` as closure. Mobile #1069 does NOT close this despite its report.
- SEC-427-001. All schemes share `group.com.murror.widget` and access/refresh tokens
  are written to that app-group `NSUserDefaults`. Cross-environment credential
  exposure. `ios/RNWidgetBridge.m:23-76`.
- SEC-427-002. `LiveActivityPhotoStore.swift:14-49` uses `URLSession.shared.data(from:)`
  with no host, MIME, or size checks, writing to one shared filename.
- SEC-427-004. Deep links typed `any` with substring matching, `src/common/linking.ts`.
- OFFLINE-427-001. `offlineFirst` with `retry: 0` rejects instead of pausing, while
  the copy promises changes will sync.
- AUTH-427-001. Deep-link readiness set only on authenticated cold start and never
  reset; Branch hardcodes `isHasUser: true`.
- REL-427-004. Environment selection runs AFTER React Native bundling in the pbxproj.
- QA-427-001. Extension iOS floors 18.1 and 18.5 versus host 15.5.
- OBS-427-001. No Hermes dSYM in the archive.
- A11Y-427-001. `Text.defaultProps.allowFontScaling = false` disables Dynamic Type
  globally, `app.tsx:63-65`.

Older backlog: RevenueCat customer vs subscriptions endpoint; prompt personalisation;
unify the three `resolveName` precedences; restore the weakened webhook transaction
trap; add-a-memory upload loading state; new-user cold-start walkthrough.

## Decided, do not reopen

- Lock Screen photo (PRIV-427-006): the photo is INTENTIONAL, Astro chose it, and no
  in-app opt-out is needed. Only the stale comment was wrong and it is fixed.
- Council personas (Thanh Loc): old entries keep their stored council. It is a
  snapshot of its moment. Do not add a read-side persona pin, it would blank councils.

## TestFlight

Canonical `staging-environment-setup` now carries five fixes that build 427 lacks, so
428 would be materially better to test. NOT cut yet. Use `./scripts/ios-next-build.sh`
for the number, never hand-pick it, merge the bump PR, then archive. It will be a
TESTABLE build, not a launch candidate: every DEVICE and PROVIDER gate is still open
(upgrade from public 1.0.19, StoreKit, APNs, subscriber lock, deletion receipts,
VoiceOver).

## Working with Codex in parallel

It works. Use `codex exec` from Bash, NOT the MCP tool, until Claude Code restarts
(the MCP server holds a stale 0.142.3 binary; the CLI was upgraded to 0.147.0 because
the configured `gpt-5.6-sol` model needs a newer CLI, which is what made it hang
silently for 30 minutes).

Two traps, both already hit:
- Give Codex a standalone CLONE, not a git worktree. A worktree's `.git` is a pointer
  OUTSIDE the sandbox root, so file edits work but commits can never land.
- Its sandbox has no network egress, so it cannot fetch or push. Have it write a git
  bundle, then verify the SHA-256 and recover the branch yourself.

Split lanes by top-level directory so a conflict is detectable with one
`git diff --name-only`. Codex took `.github/ e2e/ scripts/ package.json yarn.lock`;
Claude took `src/ app.tsx ios/`. It respected that perfectly. Verify its output rather
than merging on trust: its finding quality is high, but its report claimed jest exits
cleanly while its own finding proved otherwise.
