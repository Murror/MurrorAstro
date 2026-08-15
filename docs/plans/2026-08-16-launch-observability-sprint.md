# 2026-08-14..16 — Launch observability sprint (mobile + api), Codex co-review lane

Session goal evolved: fix Sentry symbolication for iOS 2.0.0 → full launch push. Everything below
merged after adversarial review by both an internal reviewer lane AND Codex (`mcp__codex__codex`),
per the new standing rule.

## Shipped, MurrorMobile (`staging-environment-setup` @ af8db1d8)

- **#1104** fix: make production crash reports usable. Three root causes, none the "missing token"
  the plan assumed: (a) `beforeSend` rebuilt exceptions as `{type,value}`, deleting `stacktrace`
  AND `mechanism` (which also broke `isHardCrash` → fatal JS reports could be lost on the async
  store path); (b) `sentry.properties` pointed at personal org `canhnv`/`murrorlocal`, and a wrong
  destination uploads *successfully* to nowhere; (c) `Sentry.setTag` on the shared scope leaked
  `apiStatusCode`/`apiErrorType` between events (status-0 network errors are falsy so they inherit
  the previous 404). Frame redaction is an allowlist; CI guard now pins org/project with
  sentry-cli's real grammar (last assignment wins, `=`/`:`/space) after a reviewer defeated my
  first fail-open version with a shadowed duplicate key.
- **#1105** fix: Relationship Next Steps fails closed. Its API routes exist on NO branch (404 in
  prod+staging); kill-switch-only gate meant absent Statsig = ON. Now `enabled && !killed`.
  Confirmed empirically via the Statsig `/v1/initialize` probe: prod key is live, 14 gates, all
  four `*_disabled` kill switches missing.
- **#1106** feat: Codex's iOS production release pipeline landed (49 files, ~13k lines): pinned
  Xcode trust-tree verifier, Hermes dSYM attach, source-map debug-id pairing, TTY-token uploader.
  Four CI rounds to green; fixes en route: cocoapods gem patch moved out of npm `patches/`
  (patch-package applies EVERYTHING there), Darwin tests platform-gated with a macOS step pinned by
  the workflow-contract verifier, per-platform toolchain assertions. `android.yaml` no longer
  triggers on `scripts/ci/**` and gained `cancel-in-progress`.

## Shipped, murror-api (`staging` @ 6b9d787c; backport `main` @ 4545f2d4, alpha live)

- **#766** notification-window 500 → graceful degrade. `user_activity_hourly_ca` missing everywhere
  (timescale migrations force-marked applied, `applied_steps_count=0`); 500 for EVERY user each
  cold start; 3AM cron died as unhandled rejection. Predicate: P2010 AND 42P01, meta.code
  authoritative by property presence, line-anchored fallback (bare `^` would never match: Prisma
  prepends `\nInvalid prisma.$queryRaw()...`). Once-per-process latched ERROR + per-occurrence WARN
  (nestjs-pino drops string-first objects into printf slots — object-first only).
- **#767** Prisma 5xx → Sentry, four review rounds vs Codex: (1) `integrations: []` MERGES with
  defaults (`RequestData` attaches headers/cookies/body/url); (2) transactions bypass `beforeSend`
  (need `beforeSendTransaction`), fetch breadcrumbs record `http.query` (live via RevenueCat email);
  (3) route heuristic leaked slugs on every matched request via `http.target`; (4) declared-route
  or `<unmatched>` only, `db.statement`/`db.query.text` dropped. Transport-level canary proofs each
  round; `baggage` header (percent-encoded path copy) found beyond Codex's list.
- **#768** dead `notification-window` BullMQ queue removed (no `@Processor`; consumer
  `getSmartTimeSlotForUser` has zero callers; article gen uses `getNextTimeSlotForUser`). DI proven
  from compiled Nest metadata, not the green build.
- **#769** P2003 → 400. Mobile retry predicate treats VALIDATION_ERROR terminal / SERVER_ERROR
  retryable (the override in `setupQueryErrorHandler` wins over `query-client.ts`'s `retry: 3`), so
  prod was retrying FK violations twice then blaming the server.
- **#770** backport of all four onto `main` → alpha auto-deploy verified by pod roll (0.129.3-alpha,
  17:26Z). Conflict exposed: main still had unhardened Sentry (`setUser`, raw url, raw exception)
  and logged full URLs+messages on every non-404; took staging's hardened forms, kept main's
  local-only logging improvements.

## Config shipped

Sentry org `murror` (browser, verified by reload): Require Data Scrubber ON, IP storage OFF,
sensitive fields `email userEmail userId deviceId`. Live 1.0.19 was storing real emails + Supabase
UUIDs (106,678-occurrence issue). Not retroactive; geo survives IP scrubbing.

## Proven, fix in flight

**Login hang** (launch blocker): circular fence. `networkMode:'online'` mutations +
`query-network-status.ts` gating `onlineManager` on module state + only resume on isolation SUCCESS
(post-`signInWithPassword`, which the fence gates). THREE terminal paths wedge it: isolation catch,
provider-bind rollback, and PLAIN LOGOUT (`finally` only releases the latch). Email path only
(Google/Apple bypass the mutation). Suite green because the spec mocks the fence module. 6-case
executed repro incl. control. Fix (narrow: resume on all three, owner-guarded) implementing on
`fix/account-fence-resume-on-terminal-paths`.

## Gotchas recorded

- murror-api deploy topology: main→alpha(SFO2), staging→staging(SFO2), production ONLY via
  workflow_dispatch on the `production` BRANCH (659 ahead/52 behind main; CLAUDE.md is wrong).
  Dispatch on main = every job silently SKIPPED. Prod = SGP1 only.
- Stale-worktree trap bit twice more (`build-lane` 126 behind → false "committed token" alarm, and
  empty login-latch greps). Verify against `git show origin/<trunk>:path` always.
- Actions: `scripts/ci/**` was in android.yaml paths (fixed); `scripts/` forces macOS smoke;
  ~4 Android runs + 2 macOS builds spent landing #1106.
- Statsig console account owns only an empty `murror-app` project; the app's prod key belongs
  elsewhere. Kill switches inert. Key swap decision open.

## Open

Fence fix → merge → `ios-next-build.sh` bump → archive (needs sudo pinned-Xcode provisioning,
script given to Astro; /Applications/Xcode.app IS 26.6). Prod promotion of api = third backport onto
`production` branch, own session. Continuation prompt: `Logs/2026-08-16-launch-continuation-prompt.md`.
