# 2026-09-08 — Statsig ungating, builds 463/464, and nine launch fixes queued for 465

Repos: `MurrorMobile` (branch base `staging-environment-setup`), `murror-api` (base `staging`).
All times below are +07 (the machine's clock). PDT is 14 hours behind.

## Context

Two tester rounds ran against 2.0.0 on TestFlight. The day's work splits into three
strands that turned out to be connected:

1. A **data-plane probe of Statsig** proved several shipped features were gated behind a
   control plane the app cannot reach. Ungating them is what made builds 463 and 464
   necessary.
2. **Tester feedback** (Dominich, Mona, Khanh, Brian) surfaced four launch blockers, all
   of which are client-side and all of which are queued in 465, not shipped.
3. A **read-only security investigation** on `origin/staging` found an IDOR on two legacy
   quiz routes. Fixed and deployed to production the same day.

## Shipped to TestFlight

### Build 463 (merge `83efb1b5`, bump PR #1250)

- **#1248 `5c7a0dc6`** — Council renders by default. `useFeatureGate` returns `false`
  while unresolved, and the Statsig SDK never resolves in production, so the Council
  surface was permanently absent rather than merely off. Changed to render by default.
  The pre-existing spec could not catch this: its flag mock returned a constant. Made
  the mock flag-aware first (`d5fb027f`), recorded why (`24a62404`), then fixed.
- **#1249 `d414cde3`** — the send button no longer waits on a flag resolving. Same root
  cause, different surface: `deep_chat` gated the send affordance, so on a cold start the
  button was inert until a resolution that never came.

### Build 464 (merge `386f331c`, bump PR #1254, VALID + attached to 2.0.0 at 12:02)

- **#1252 `bde96662`** — ungated five shipped features from an unreachable control plane.
  `src/hooks/use-feature-flags.ts`: five gates replaced with constants matching the
  measured live values. Five gates were deliberately KEPT (Duo, Galaxy,
  relationship-next-steps, hard paywall, onboarding length) because those are genuine
  product decisions, not accidental gating.
- **#1253 `b52af119`** — Memory Room made safe to actually ship. This PR exists because
  #1252 was merged **without** the required adversarial review; the gate hook fired after
  the merge. The review was run anyway before building and found **3 Criticals** in the
  newly-live Memory Room surface. All three fixed here, plus a new
  `src/hooks/use-memory-room-kill-switch.ts` — PostHog-backed (Statsig cannot serve it),
  per-environment keys, fail-safe so only an explicit `true` kills the surface.
  `824686448` fixed prettier formatting on the three locale catalogs, which is the only
  thing "Fast Ubuntu Checks" had flagged.

## Queued for build 465 (branch `fix/composer-draft-data-loss`, PR #1255, NOT merged)

Six commits, nine distinct fixes. Four are launch blockers.

| Commit | What |
|---|---|
| `aab034ec` | **BLOCKER** composer data loss inside a conversation |
| `a9081d40` | **BLOCKER** offline logout wiped the device then reported failure |
| `bb773cd2` | six findings an adversarial review made on the two above |
| `6bf95b5b` | **BLOCKER** new-user signup dead end; **BLOCKER** invite links dead for every non-subscribed user |
| `1e61da73` | a continued conversation did not refresh its thread after saving |
| `0dd5167d` | a declined AI consent no longer blocks saving |

### `aab034ec` — composer data loss

`src/services/journal-draft-service.ts` gained `saveConversationComposer` /
`getConversationComposer` / `clearConversationComposer` under key
`DRAFT_CONVERSATION_COMPOSER_<id>`. The save **rethrows** rather than swallowing, which is
the point: the previous code's silent catch is why nobody knew. `add-log-screen.tsx`:
`onSaveDraftLog` awaits and no longer `goBack()`s inside a `finally`; restore-on-resume
re-checks the id; `clearDraftForGood` and the send path both clear.

### `a9081d40` + the `bb773cd2` correction — offline logout

My first fix was **wrong**, and the review proved it. I had claimed
`signOut({scope:'local'})` is not a network call. Reading the vendored `GoTrueClient.js`:
`_signOut` issues `POST /logout?scope=` for **every** scope, and `_removeSession()` only
runs after that succeeds. So my "fallback" was a retry of the same failing request, and my
spec asserted the false premise in a comment and then mocked it true. The shipped shape in
`src/config/auth-service.ts` removes the stored session directly and then verifies:

```ts
const signOutResult = await supabase.auth.signOut();
const signOutError = signOutResult?.error;
if (!signOutError) return;
if (!isRetryableSupabaseAuthError(signOutError)) throw new Error('Supabase sign-out failed');
await secureStorage.removeItem(SUPABASE_AUTH_STORAGE_KEY);
apiClient.resetAuthCache();
const verifyResult = await supabase.auth.getSession();
if (verifyResult?.error || verifyResult?.data?.session) throw new Error('Supabase sign-out failed');
```

`logout()` also gained `preserveOnboardingDraft`.

### `6bf95b5b` — signup dead end and dead invite links

- `use-onboarding-signup.ts`: fence-wait retry (`FENCE_WAIT_MS = 400`,
  `MAX_FENCE_WAITS = 12`), `probeSessionRef` assigned each render,
  `onPressSignOutUnknown` re-probes and preserves the draft.
- `use-branch-io.ts`: `isCanStartDeepLink: true`, previously
  `isSubscribed || hasActivated || (…)`. Every non-subscribed user's invite link was inert.

## murror-api

### Security: IDOR on two legacy quiz routes — SHIPPED TO PRODUCTION

`fix/legacy-quiz-idor` → **#949 `3a7a856c`** → merged to `staging` → promoted via **#950
`04ddbf16`** → production deploy **succeeded** (deploy job present and green, smoke test
green, `murror.api.ambercare.app`).

Both legacy routes are now scoped to the caller's own connections. 7 tests; **5 go red on
revert**, which is the control that makes the other 2 meaningful. Routes were verified as
still reachable from the mobile client before scoping rather than deleting. Production row
counts were checked first rather than assuming low blast radius.

### `feat/save-without-ai-processing` — #951 `32b7e6f9`, merged to staging

`skipAiProcessing` on `CreateJournalDto`. When set: create the journal + DiaryEntry,
**skip `publishToAI`**, status `COMPLETED`, progress 100, artwork `ERROR`,
`isProcessed: false`.

⚠️ **Ordering constraint.** `ValidationPipe` runs with `whitelist: true,
forbidNonWhitelisted: false`, which **silently strips** undeclared fields. So the client
half (`0dd5167d`) must NOT reach production before #951 does, or the flag vanishes with no
error anywhere.

### `fix/analysis-generating-not-400` — #952, OPEN

Returns `{results: [], status: 'GENERATING'}` instead of `BadRequestException`, in **both**
`requestAnalysis` and `requestLearning`. This is the Council 400. Not merged, not deployed.

## Verification

- MurrorMobile 465 branch: tsc 0 errors, lint at baseline, **649 suites / 6,475 tests**.
- murror-api staging deploy: all jobs green. Production deploy: all jobs green including a
  real `deploy (production, nsp-prod-murror, …)` job, not just a green run.
- Builds 463 and 464 both verified in the artifact (`464 / 2.0.0`) and re-read from App
  Store Connect after attaching.

## Gotchas worth keeping

- **A killed mutation left buggy code in the working tree.** `diary-screen.tsx` still had
  the reverted History fix after a mutation test. Restored from a backup. Had this not been
  checked, the commit would have shipped the exact bug it claimed to fix. Always re-verify
  the tree after mutation testing.
- **`toContain` is not enough for a multi-call-site flag.** The N2 spec stayed green when
  one of two `setPendingJournal` call sites lost `skipAiProcessing`. Changed to count the
  handoffs and require the flag on every one.
- **Locale JSON written by `json.dumps` fails prettier**, and "Fast Ubuntu Checks" runs
  prettier on changed files. Run `prettier --write` on any generated JSON.
- **zsh word-splitting** sends N spec paths as one argument, and jest then reports
  "0 tests found" rather than an error. Use `${(f)…}`.
- **`it.each` is untyped in this repo.** Use a plain loop.
- Two jest runs deadlocked for about two hours (31 stuck processes) while being reported as
  "running". Check for stuck processes before trusting a long-running suite.

## Still open

- Build 465 is not cut. PR #1255 needs the adversarial review, then merge.
- #952 (Council 400) needs merge and deploy.
- Khanh's offline reports #2/#3/#4/#5, including an offline banner that falsely promises
  "changes will sync".
- 16 stuck quiz days (the earlier "65% of days broken" figure was wrong: 91 of those were
  future days by design).
- Duplicate user messages (web only), tab-switch delay.
- Four product/copy items, including Brian's "would you open this tomorrow? No."
- Waiting on Mona: did she tap the notification body, or the "Manage Notifications" button?
