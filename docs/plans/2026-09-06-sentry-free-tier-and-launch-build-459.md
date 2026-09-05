# 2026-09-06 — Off the Sentry bill, and launch build 459

Second stretch of the 2026-09-05 session, from Astro's question "sentry is too expensive, is
there anyway to get away from this?" to build 459 attached to the 2.0.0 App Store record.
Companion to `2026-09-05-qa-sweep-to-build-458.md`.

## The Sentry decision (four-lens panel: atlas / iris / sentinel / north)

**Answer: yes, and most of the escape was free, because most of the bill was self-inflicted.**

| Fact (proven) | Source |
|---|---|
| Org is on the FREE Developer plan; nothing charged. "Too expensive" = the upgrade price | Astro; a parallel session read the billing page: 5,000 errors/period, period Aug 14 – Sep 13, 5,191 accepted, 906 dropped, 0 accepted org-wide in 7d |
| Errors are small (~1-2k/mo real) and 70% of the burn was one slow-API warning at sampleRate 1.0, sampled to 0.1 in build 458 (#1226) | Sentry `errors` dataset |
| Spans were 17M/mo against a 5M cap, **92.5% child spans from Prisma** (`sentry.origin:auto.db.otel.prisma`) | Sentry `spans` dataset by `sentry.origin` |
| Sentry Team ($26/mo) has the **same 5M span cap** — paying would not have fixed the overflow | sentry.io/pricing |
| A second, quota-free error DETECTION pipe already exists: `error-mixpanel-bridge.ts` fans every `captureException` to PostHog + Mixpanel (categorical) | client tree |
| Native crashes are already symbolicated for free: `uploadSymbols: true` in both export plists → Xcode Organizer | `ios/ExportOptions*.plist` |
| 5 of 7 launch-blocking bugs this week were silent no-ops no crash reporter would fire on | sentinel |

**Decision (Astro):** stay on the free plan; cut the span exhaust server-side; send JS error
STACKS to PostHog at the next build; Xcode Organizer for native crashes; a PostHog insight alert
on hourly event volume → Slack `#alert` (pending connector auth); re-decide at day 14. Rejected:
Sentry Team (same span cap), GlitchTip (a second production system for one person), Crashlytics
(Firebase is NOT on the shipped branch; only on the stale canonical checkout). Sentry error
capture returns on its own when the period resets on **Sep 13**.

### murror-api #942 → promotion #943 (deploy run `33976324430`, live 16:22Z)

The entire diff is one string: `'Prisma'` removed from `APPROVED_DEFAULT_INTEGRATION_NAMES`
(`sentry-integrations.util.ts`). Review confirmed the allowlist is the ONLY registration point
(no ESM preload, `auto-instrumentations-node` ships no Prisma, `@prisma/instrumentation` is
pulled only by `@sentry/node`) and that the integration has no `processEvent`, so error capture
is byte-identical. **Effect, clean 1h window after rollout:** Prisma spans **0**, `http.server`
1,310 (positive control), amqplib 26 → ~32k/day ≈ 19% of the cap (was 317%).

Consequences to know before reading graphs: dashboard `486300` widget 14 "Overall DB Spans"
(`span.op:db`, 100% Prisma) is permanently blank; metric alert `419514` "Slow Transactions P95"
baseline halves (~317ms → ~157ms) because the 5,390/day Prisma orphan roots were the slow tail.
Safe direction; an instrumentation artifact, not a win.

### Three corrections recorded along the way

- 🚨 **`<unmatched>` / `<redacted>` are Murror's own privacy scrubber output**
  (`sentry-scrub.util.ts:88`), not route misses. And it is not "UUID routes": `:338-339` is
  unconditional, so **every** `http.server` transaction is `<unmatched>` (37,664/37,664) — the
  scrubber failing closed because it has no provenance to prove a path is a declared template.
  A sampler dropping `<unmatched>` would blind you to all real traffic. Follow-up: give
  `scrubTransactionName` trusted provenance (murror-api #940). Not an Express bug.
- 🚨 **The canonical `Murror/MurrorMobile` checkout sits on `chore/bump-build-437` with divergent
  deps** (Firebase present there, absent on the shipped branch). Read
  `origin/staging-environment-setup` for what ships. I read the wrong tree once tonight.
- 🚨 **`triggerTestError()` has no UI entry point.** Only the context and the service reference
  it. The release gate is therefore one forced failed request in Add Connection: the React Query
  error path captures at `LogLevel.ERROR` (`react-query-error-handler.ts:162/235`), which is what
  `sendToPostHog` forwards → `$exception · $app_build = 459 · error_source = api`.

## Launch build 459 (bump PR #1234, merge `d74e4fd4`, VALID + attached 17:56:45Z)

Astro's ruling: **all fixes go into the launch build.** A shipped build number is immutable
(`ITMS-4238 Redundant Binary Upload`, even after expiring), so the binary carrying the fixes is
459 by necessity; it replaces 458 on the 2.0.0 record. Read back independently: ASC build 459
VALID expired=false; 2.0.0 PREPARE_FOR_SUBMISSION; 26/26 pbxproj; all four slate commits are
ancestors of the tip (negative control: a pre-squash head correctly rejected).

| PR | Merge | What it fixes | Evidence |
|---|---|---|---|
| #1229 | `e537e893` | Slow-network sign-in shows a recoverable surface (Try again, still signed in) instead of the bare poster. Round 3 split `holding` into `buttonHolder` (re-arm clears) and `ranAttempt` (only `beginAttempt()` writes) so a re-entrant do-nothing press cannot tear the surface down | RED against the pre-fix hook (1/14), GREEN after; 10 mutations RED; observer composition proven with a virtual `react-dom` mock running the real `observer` |
| #1231 | `cea593c7` | A person with no `User` row is routed back into onboarding. **The #1190 Home guard had been inert since it shipped**: it compared `getCurrentRoute()?.name` (the focused LEAF, `HomeScreen`) against the tab CONTAINER name `TabController`. Fixed by reading the ROOT route (`rootRouteNameOf`); a leaf set was unsound because `Diary/Knowledge/Reflection/RelationshipScreen` are also root-registered. F2: truthiness had classified the string `'true'` as `ready`; now explicit booleans only | Real `NavigationContainer` + real bottom-tabs spec: RED 3/6 before, GREEN 6/6 after; the fake-navigator specs were tautological |
| #1232 | `0f3b60f7` | JS error stacks to PostHog via a privacy CLONE (safe descriptor as message, header-rewritten frames, no `cause`, own props exactly `stack,message,name`). Autocapture rejected on evidence: `@posthog/core` coercers send `err.message` verbatim and walk `cause` 4 deep. Remote config CANNOT enable autocapture (handlers install only when the local option `=== true`) | Reviewer ran PostHog's real `ErrorPropertiesBuilder` on the clone: `"User person@example.com not found"` → `"API error: SERVER_ERROR"`; both positive controls RED. M6 survived once because `toEqual` ignores undefined-valued keys → fixed with a populated value + `toStrictEqual` |
| #1233 | `c95f4c2c` | The guard reads its verdict at fire time. The navigation `state` listener fires BEFORE React re-renders the provider, so render/layout/effect-captured values are all stale; the React Query cache (`getQueryState`) is written synchronously before observers are notified (`query.js:344-350`), so `readOnboardingVerdictFromCache(queryClient)` is the source of truth. Its `pending` gate is load-bearing: mid-refetch state is `{status:'pending', data:undefined, error:null}`, which the classifier would read as `noAccount` | RED-before on the zero-await ordering; reverting mutation 2/4 RED while all 37 pre-existing guard tests stayed green; five real-`QueryClient` cases; a weakened wiring regex caught in review and re-anchored (dep deletion 18/18 → 1/18) |

Cross-cutting lessons (in memory): a spec that hands a fake navigator the expected route name is
tautological; route logic needs one real-navigator mount. A mutation that survives is a spec bug
first (`toEqual` + undefined). Extract logic into a module the spec can import rather than
retyping it (`feedback_verify_the_artifact_not_a_retyped_copy`).

## Privacy (Aegis)

#1232 makes no existing policy sentence false; it exposes an omission (the live policy never
mentions crash/diagnostic data and names no analytics vendor). Accept with disclosure: one
"Diagnostic data" bullet + "product analytics and error-monitoring providers". Astro relays the
wording to the parallel privacy-docs lane (`rescue/marketing-privacy-docs-2026-08-26`;
SendMessage is disabled in this session). App Privacy label at Submit: Diagnostics **Linked to
You = Yes** (the manifest already declares CrashData/PerformanceData linked) and add **Other
Diagnostic Data**. Deletion proven covered (`posthog.service.ts:161-171` `persons/bulk_delete/`
with `delete_events: true`). PostHog retention (84 months, suspected) to shorten once the
connector is authorized. Pre-existing, separate lane: entity name "Murror, Inc." vs "My Murror
Inc"; no California notice.

## Housekeeping

- Staging backlog triaged: nothing launch-blocking. Closed four dead Codex PRs (#712 false
  premise, #619 and #557 superseded by proven equivalents on staging, #736 infeasible to rebase).
  Salvage later: #883's tombstone-scope fix (surgically; two of its hunks would revert landed work).
- The deletion `conversation_wrapup` vacuous-verification leak was ALREADY fixed by #917
  (`b0ec9703`), on staging and prod; memory and murror-api #940 corrected. The receipt work is
  unblocked.
- `prod-health-check.yml` runs every **2 hours** (not 6) and already holds `SENTRY_API_TOKEN` +
  `sentry-sweep.sh`; Astro declined adding a Sentry accepted-events floor (PostHog alert is the
  one alarm). No workflow posts to Slack; Sentry→Slack was never wired; `#alert` had a Better
  Stack uptime monitor until 2026-06-24.
- My `gh` token lacks the `workflow` scope (confirmed): workflow edits are Astro's to push.
- Memory index was over its 24.4KB cap twice (other sessions append concurrently); demoted two
  link lists into `index_ai_architecture.md` and `index_supabase_references.md`.

## Owed before Submit

1. Astro's device pass on **459** (checklist "Launch Build Device Pass"): sign-in, the
   slow-network surface (Network Link Conditioner 100% Loss; Try again twice), the no-row
   account walk, one forced failed request for the PostHog gate.
2. PostHog connector authorization → I confirm the gate event, create the ingestion alert,
   check retention.
3. At Submit: Duo IAPs unselected; ASC Diagnostics Linked to You = Yes + Other Diagnostic Data.
