# 2026-08-16 — Login fence, onboarding closed loop, and the road to build 434

Mobile lane for the 2.0.0 production launch. Two launch blockers closed, canonical
taken to build 434, and the source lane declared finished.

## Context

Canonical is `staging-environment-setup`. The mission for the session was narrow:
get a submittable, symbolicated iOS 2.0.0 build to App Store Connect. Build 432
must not be submitted; it predates every fix below.

## What shipped

| PR | Commit (merge) | What |
|----|----------------|------|
| #1106 | `af8db1d8` | Release hardening: per-platform toolchain assertion, darwin release tests moved off ubuntu |
| #1107 | `92720d2c` | Three terminal account-fence paths that strand login |
| #1108 | `b99e21b9` | Fourth and fifth fence paths, plus a fail-open regression #1107 introduced |
| #1109 | `5dd6a2d6` | Build number 433 |
| #1110 | `96220156` | Onboarding closed loop for email-authenticated users |
| #1111 | `efa4bc04` | Build number 434 |

Canonical is `efa4bc04` at build **434**. `scripts/verify-build-lane.sh` returns
`BUILD LANE OK — safe to archive build 434`.

**CI cost:** zero hosted macOS minutes and zero Android minutes across all eight
pushes. Pure `src/**` changes fire neither lane, and the build-number bumps hit
the `ci.yaml` allowlist.

## Blocker 1 — the account-transition fence

### The chain

1. `mutations.networkMode: 'online'` means a shut `onlineManager` gate **pauses a
   mutation before its first request**. It never settles: spinner forever,
   force-quit only.
2. The gate is module state in `src/config/account-cache-isolation.ts`.
3. The only thing that reopened it lived **behind** the sign-in the fence was
   blocking. Circular.

`queries.networkMode` is `offlineFirst`, so the fence never gated reads. It is a
**write** fence, which is why reads looked healthy while login hung.

Google and Apple sign-in bypass the fence entirely. Only the email path hangs.

### The five paths

1. Isolation failure
2. Provider-bind rollback
3. **Plain logout** — an ordinary sign-out, not an error path, armed the trap for
   the next login
4. Bare `SIGNED_OUT` with no logout fence (refresh-token expiry after long
   inactivity, or server-side revocation). The population most likely to hit this
   is a returning user opening the app after weeks, which is exactly who a launch
   reactivates.
5. Account deletion — the wipe is a fence owner with no resume and no
   registration

### Two regressions the fixes themselves introduced

- **Fail-open on sign-out.** Supabase reports a failed `signOut()` by *resolving
  with an error* rather than throwing, so the first fix reopened networking under
  a possibly live account. Now fails closed:

  ```ts
  const signOutResult = await supabase.auth.signOut();
  sessionRemoved =
    typeof signOutResult === 'object' &&
    signOutResult !== null &&
    !signOutResult.error;
  ```

- **A fix that skipped itself.** `completeAccountCleanup()` rethrows on a failed
  stage, so the new release line never ran on the exact path it targeted. Fixed
  with `try/finally` in `src/utils/app-context-manager.ts`.

### Where the cleanup registry lives, and why

`beginAccountCleanupFence` / `endAccountCleanupFence` / `isAccountCleanupInFlight`
live in `src/providers/query-network-status.ts`, not in
`account-cache-isolation.ts`. That file already imports the cleanup, so a registry
there would have been an import cycle. `query-network-status` is a leaf.

### Verification

Four adversarial review rounds. Per-path mutation proofs. Then **run in the iOS
Simulator on build 433: an email account that previously hung signed in
successfully.** That is the first execution-level evidence behind these five paths.

**Not device-verified.** Simulator StoreKit cannot bind RevenueCat, and that
binding is itself a hard gate on sign-in, so a phone exercises code the simulator
never reaches.

## Blocker 2 — the onboarding closed loop

Found within minutes of that first successful simulator login.

### Symptom

Sign in with an email account that never finished onboarding:

1. Onboarding restarts with no explanation
2. All 24 answers already given are silently discarded
3. It ends at a sign-up screen offering only Google and Apple

The account is already authenticated, so the screen asking it to sign up again
cannot accept the identity it already holds. No way to finish, no way back.

**634 production users hold an email identity with onboarding incomplete.** Every
one of them meets this the moment they open a build carrying the login fix, so
shipping #1107 and #1108 without #1110 would have delivered the trap.

### Root cause

Duplication drift. The "are we signed in" question was answered in two places and
the two answers diverged. `use-onboarding-signup.ts` looked for a **profile**,
which an unfinished account does not have yet, rather than a **session**, which it
does:

```ts
const [hasSession, setHasSession] = useState(false);
// AuthService.isAuthenticated() probe in useEffect
const isAuthenticated = hasSession || !!appContext.user?.id;
```

The shared helper was **lifted** into `src/common/settle-within.ts` rather than
copied a third time, because copying is what caused this.

`login-view-model.ts` now classifies post-login state explicitly and tells the
user *why* they are being returned to setup. Sign-up and paywall steps are skipped
for a session that already exists.

### A regression review caught

The first attempt moved `resetState()` to where its rejection landed in a
`devError` catch, which is **stripped from release builds**. A visible error on
the highest-traffic path in the app would have become silent stranding in
production only, invisible in every environment anyone would look in. Now wrapped
with a real `errorMonitoringService.logError` call.

### Verification

Tests, mutation proofs, adversarial review. **No execution of any kind.** This
one has less evidence behind it than the login fix and changes the sign-in path
for every user.

## Gotchas worth keeping

**zsh does not word-split unquoted variables.** `jest $SPECS` ran **zero tests**
and printed empty output through a grep, which reads exactly like "no failures".
One keystroke from being recorded as a mutation proof. Caught only because a
baseline was included, and an empty baseline is obviously wrong where an empty
result is not. I then made the identical mistake again later in the same session.

**`git checkout -- file` restores from HEAD, not the working tree.** A
mid-mutation restore destroyed roughly a hundred lines of uncommitted work, and
every mutation measured afterwards produced believable numbers against reverted
code. Commit before mutating.

**Three of four fence fixes had zero regression net** on the first mutation pass.
Break the line, every test still passes. The green suite said nothing about three
of four fixes. A mutation that fails nothing is a finding about the tests.

**The full jest suite hangs.** `__mocks__/globalMocks.js:89` calls
`jest.useFakeTimers()` repo-wide, so awaiting anything resolved by a macrotask
never settles. It does not fail, it stops. Run targeted specs.

**A Sentry presence filter invented a leak.** `has:user.email` matches events
whose email is `[Filtered]`, because the field is present either way. Email is
already scrubbed. `user.id` and city-level geo are the real exposure and need
their own rules.

## Still open, all owner-side

1. Provision `/Library/MurrorRelease/Xcode-26.6.app` (needs sudo)
2. Stage `.env.production` at mode 600, sha256
   `e50fc3c3d129425baf0ca45a6b9bfddc08321b2e5ff23926adb64a0cc41e41bf`
3. Create the 2.0.0 version record in App Store Connect (none exists; 1.1.0 is
   REJECTED, 1.0.19 is READY_FOR_SALE)
4. Archive and upload through the eight owner gates
5. Prove symbolication by effect in Sentry
6. Device-verify on a physical iPhone: email login fail-then-retry, and
   logout-then-login

Do not let macOS update. The release driver pins 26.4.1 / 25E253 and re-measures
Xcode mid-run.

## Related

- Launch board artifact `18706bde-ace5-4d13-b820-38d8dc69e0cd`
- `docs/plans/2026-08-16-launch-observability-sprint.md`
