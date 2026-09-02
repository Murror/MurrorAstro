# Launch readiness, 2026-08-30 to 2026-09-02

Four days of pre-launch work across three code repos plus the Codex web lane.
Target: iOS 2.0.0, App Store, EN only, Duo delayed.

Scope of change in the window:

| Repo | Branch | Commits |
|---|---|---|
| MurrorMobile | `staging-environment-setup` | 43 |
| murror-api | `staging` | 91 |
| viasr-api | `staging` | 34 |
| murror-platform | Codex parity branches | ~120 across branches |

Total token volume for the window (all sessions plus subagents, cache reads
included): 10,284,635,303.

## 1. Connection Reflection, end to end

The CR card had never received the six insight fields it was designed around.

- viasr-api #637 `e59420b` generates all six; `e9255f6` writes the shared
  message in third person when the sender is named.
- murror-api #902 `1886ef92` made Step 4 recognise a Connection Reflection, not
  only a LOG task. Before this, a user who genuinely reflected stayed on Step 4
  forever. Measured in production: a user with two takeaway rows and zero task
  rows still had `self_reflection_completed_at` NULL.
- murror-api #901 `a47c9891` bounded the partner wait; `a0c43713` anchored that
  wait on the takeaway route too.
- murror-api #904 `978bad4d` pins the anchor reduction with a test, so an old
  row cannot expire a live wait.
- MurrorMobile #1196 `be8feee0` made the detail-screen and Home paths actually
  open a card. #1192 `54efb8a2` attributes takeaway self-text to its author and
  discloses shared-insight AI to the receiver. #1195 `0f94702e` derives the past
  sharing banner so it cannot go stale. #1188 `638ddbc9` makes a no-insight
  reflection read as success rather than failure.

### The seam bug, and why it never reached anyone

Widening `bothReflectionCompleted` and `selfReflectionCompleted` in #902 let a
person count as reflected through a `takeaway_reflections` row alone. The wait
anchor in #901 was written against a world with only two routes, so for exactly
that newly recognised population there was no timestamp, `waitStartedAt` was
null, and the wait became unbounded again.

Caught by the rebase forcing both changes into one head, fixed in `a0c43713`,
pinned by #904. Neither commit had been promoted, so no user was exposed.

The ORIGINAL unbounded wait IS live: 5 production connections one-sided, oldest
2025-12-25. They stay stuck until murror-api is promoted.

## 2. Emotion arc vocabulary

0 of 86 production labels were taxonomy values. Producers swallow the error, so
a bad constraint would have emptied every arc silently, with no error and no log.

- viasr-api #639 `f3b3e5e` constrained the arc in prompt AND schema, #642
  `5f4950b` gave the arc its own 45-adjective vocabulary, #643 `a6a4637` keyed
  per-turn chat emotions on the message rather than the conversation.
- MurrorMobile #1185 `37322cf8` colours every value in that vocabulary. Schema
  set must equal the client colour set or users see grey discs.

## 3. Privacy and safety hardening

- viasr-api #636 `05a8fe8` gives every prompt guard a second witness and adds a
  sensitive-category ban; `6c95a29` fails closed when a guard constant is
  emptied; `3e00eae` forbids verbatim quoting across every two-user prompt.
- viasr-api #641 `f809275` and #648 `271e8ee` stop publishing caught exceptions
  and failed-call prompts to the log stream. #650 `ad68811` hides bound SQL
  parameters in database error strings.
- viasr-api #653 `0a56526` guards the journal prompt, journal output and the
  crisis sentinel. #652 `50af2f4` closes four pre-launch holes in auth,
  shutdown, rate limiting and cost. #654 `16f1426` pins the byte-encoding half
  of `api_key_matches`.
- viasr-api #656 `c13238e` stops logging user coordinates and addresses in
  `search_location`. Three missed leak sites and one inverted flag were found on
  review and fixed before merge, see section 6.
- murror-api #896 `a1d50d88` coarsens public `/globe/stats` counts into buckets.
- murror-api #871 `98a24d87` purges takeaway audio captured before redaction.

## 4. Launch readiness sweep

A ten-lane parallel audit produced 9 Criticals, all fixed or in reviewed PRs.

- murror-api #889 `3f2bfc4d` pins four launch-critical gates that no test could
  see, and fixes one double fault.
- murror-api #891 `02937c5b` closes the storage-capture gate and makes
  degradation visible.
- murror-api #890 `71cc52db` advances retry counts and contains cron failures.
- murror-api #899 `c2528afa` dead-letters on confirm timeout.
- murror-api #900 `78fffc3e` bounds high-risk text payloads.
- murror-api #898 `773d16fd` preserves wellness goals on retry.
- murror-api #888 `50ceee21` and #881 `128da8d5` fix boolean query flag polarity
  across eight flags.
- murror-api #882 `8b069fc7` maps degraded and unknown onto down so terminus can
  report them. This is the current production pin.
- murror-api #886 `bc3509a4` recovers and reconciles the relationship next-steps
  feature, whose API had never been merged.

## 5. Builds

- 452 `8b8804fe` on 08-31.
- 453 `ba174586` on 09-01, attached to App Store Connect.
- 454 `08188e93` on 09-02, attached, re-read and confirmed valid.
- 455 is HELD at Astro's instruction until the location work lands.
- MurrorMobile #1191 `10551d0c` stopped the daily macOS E2E cron. Note the cron
  had never actually fired: GitHub only schedules from the default branch and
  `e2e.yaml` on `main` has no schedule. The suite has not passed since
  2025-07-21, deliberately manual-only.

## 6. Review findings, which is where the value was

Adversarial review found defects in the authors' own fixes at least eight times:

- A liveness-probe placement that would have CrashLooped the deployment.
- Guards that were deletable with tests still green.
- A privacy leak inside a privacy fix.
- Two missed leak sites in viasr-api #656, plus `coordinates_present` inverted
  for None because the schema declares `Optional[float] = None` while the check
  read `not (lat == 0.0 and lng == 0.0)`.
- murror-api #903: the claim "cannot send a coordinate anywhere by itself" is
  false. The shipped App Store client sends coordinates and no cycle token, so
  every guard in front of the upsert is skipped and the edited branch is live.
- MurrorMobile #1198: mutating `check(` to `request(` in the permission gate
  left the ENTIRE 4601-test suite green. The no-prompt property that Option A
  rests on had zero coverage.

## 7. In flight, not merged

- murror-api #903, destination-recommendation backend. Sent back. Turning the
  coordinate clear into a preserve removes the only mechanism that ever erases
  stored coordinates, while `completed_at` still advances. Open hypothesis: once
  the mobile half sends coordinates on every write, the preserve may not be
  needed at all.
- MurrorMobile #1198, the mobile half. Sent back for a test pinning the
  no-prompt property, `position.timestamp` as `capturedAt`, snapshot clearing on
  fix failure plus wiring `clearLocationSnapshot` into
  `account-cache-isolation.ts`, and removal of two dead `metaData` coordinate
  lines.
- MurrorMobile #1197, query defaults. `setDefaultOptions` was discarding the
  configured payload, so `gcTime` was 5 min not 24h, `staleTime` 0 not 5 min,
  `networkMode` online not offlineFirst, and the ApiError retry predicate was
  lost. Held pending Astro's call on whether it rides 455.

## 8. Production measurements taken in the window

Read-only, prod `dcftszkbpamgeivhtuzl`.

- `takeaway_reflections`: 9 rows, 2 PENDING, 6 distinct senders, oldest
  2026-03-20. 4 of 6 sender/connection pairs already anchor past the 7 day
  partner-wait limit; 1 of those is still one-sided.
- `user_connection_tasks`: 11 rows, 5 with real non-zero coordinates, 5 distinct
  users, dated 2026-01-23 to 2026-03-10, aged 176 to 222 days. ALL 5 are
  one-sided, so nothing will ever reap them. Cleanup requires both users to have
  completed.

## 9. Open decisions for Astro

1. The 5 stale coordinate rows above. No feature reads them, nothing cleans them
   up. Recommendation: delete before launch.
2. Whether a second Connection Reflection replaces the text or stays a no-op.
   Today it returns 201, creates nothing, discards the new words and echoes the
   OLD text back. `create-takeaway.use-case.ts:179` is a lone `logger.warn`. The
   server already returns `existing: !created` at :259 and MurrorMobile ignores
   it entirely. 2 production users can hit this today.
3. Whether the Personalize location toggle needs a real persisted opt-out. It is
   currently a live mirror of the OS permission, stored nowhere, so switching it
   off dies on unmount. Confirmed independently by two traces.
4. Whether #1197 rides 455.
5. Whether the two co-location prompts should stop sending two identified users'
   street addresses to OpenAI. The decision only asks same-state or
   same-city-and-country, which needs no street.

## 10. Gotchas worth carrying forward

- nestjs-pino discards a trailing object. `logger.warn('msg', {obj})` emits
  nothing of `obj`. Log object-first. `severity` IS the pino level key, so a
  payload field of that name produces duplicate JSON keys.
- TanStack Query paused state: `networkMode: 'offlineFirst'` plus `retry: 3`
  means offline gives `fetchStatus: 'paused'`, `isFetching: false`, therefore
  `isLoading: false` AND `isError: false`. Branching on those two alone renders
  a blank dead-end.
- terminus `Object.assign({status}, data)` lets a `status` key inside `data`
  overwrite the real one, and the executor's `if up / else if down` has no else,
  so the indicator is silently dropped.
- viasr-api deploy topology: `production` branch is prod, `main` deploys ALPHA.
  `viasr-api/CLAUDE.md` states the opposite and is FALSE.
- The merge gate hook resolves the repo from the SESSION working directory, not
  `--repo`. A `cd` inside the same command runs after the hook, so the `cd` has
  to be its own prior call.
- An awaited macrotask under fake timers makes the suite HANG rather than fail,
  so silence reads as success. Jest's own `--testTimeout` does not rescue it.
- macOS has no `timeout` binary. `timeout 150 npx jest` exits 127 and an earlier
  "pass" may be jest never having run.

## Verification

- viasr-api: 2073 pytest passed. #656 mutation-proven per leak site, each
  interpolation restored one at a time and seen red.
- murror-api: 918 tests in `src/connections`, tsc baseline 7 (the declared
  `sharp` / `heic-convert` absence).
- MurrorMobile: 4601 tests across 484 suites.
- Builds 453 and 454 attached to App Store Connect and independently re-read.
- Not device-verified: the offline onboarding fix, #1197, and #1198's
  no-prompt behaviour. Static analysis and jest only.
