# Murror Progress

## 2026-09-03 (PDT): The August investor letter, a password gate that did not hold, and nine emails

The letter did not exist at the start of this. It is now written, reviewed, gated,
deployed and delivered to nine investors. Full writeup:
`docs/plans/2026-09-03-investor-letter-gate-and-send.md`.

### The letter

`apps/marketing/content/investor-updates/2026-08.md`, live at
`murror.app/investors/2026-08/`. Product shots are the real 2.0.0 App Store
submission screenshots pulled from App Store Connect and cropped out of their
marketing composition, so `PhoneFrame` supplies the chassis rather than nesting one
frame inside another. `03-insight` is the Connection Reflection detail page.
`02-reflect` was rejected because it is a chat view, which is the one thing that
section must not show.

It carries a full work ledger: **503 merged PRs** between 08-05 and 09-02 across the
five codebases, classified first-match-wins so the ten printed group counts sum to
503 exactly. 246 were fixes, 74 features. The first draft summed to 481 against a
claimed 503; a programmatic arithmetic check caught it before anyone else could.

### The gate did not hold

An adversarial review found **thirteen ways to read the letters with no password**.
Root cause was not a weak check. **The check never ran.** `_routes.json` decides
which paths wake the worker and that matching is literal and case-sensitive, so
`/Investors/...` was never in the include list, Pages skipped the worker, and served
the letter straight off the CDN. `GET /Investors/2026-08/` returned the complete
letter, proven byte-identical to the authenticated response by SHA-256. A second
hole sat on top: the worker compared the raw pathname case-sensitively too.

Fixed by making the worker unskippable (include `/*`) and normalising the path
before matching. HEAD is now gated like GET, other methods get an explicit 405 from
us rather than relying on the asset server, and authed responses set
`private, no-store` with `Vary: Cookie`.

**Turnstile** now protects the login, fail-closed. A probe found the old password
`investor2026` in **seven guesses**, at ten guesses per 90ms with no rate limit.

Verified 0 leaks locally, on a Cloudflare preview against the real edge, and on
production.

### The merge, and why it mattered

The branch was **313 commits behind** `feat/marketing-site`. Deploying as-is would
have reverted the feedback form, early-access review, Meta CAPI and a month of
articles from production. 470 files merged clean; `_worker.js` conflicted, and the
naive resolution produced a syntax error because the boundary cut through the middle
of `sha256Hex`. Resolved by taking their file wholesale and re-applying the gate as
a deliberate additive port. PR #441 merged after CI went green.

### The Resend key was never a Resend key

The first send failed with `API key is invalid`. A key-shape diagnostic (length,
whitespace, `re_` prefix, never the value) showed the stored secret was **29
characters with no `re_` prefix**. That is why Murror marketing email has never
sent, once. Beta-signup acks and early-access mail had been failing on the same
credential the whole time, and are now fixed as a side effect.

One further gotcha: **Pages binds secrets at deploy time**, so the running
deployment still held the old value after the new key was set. A redeploy picked it
up. Without that the retest would have wrongly condemned a good key.

### Operating notes

- `_routes.json` include matching is literal and case-sensitive. Never a security
  boundary, and never let it silently double as scope for unrelated logic.
- Assets the login page references must live outside the gated prefix. The signature
  portrait was under `/investors/`, so every email would have shown a broken image.
- Never resolve a conflict in a security file by stitching markers.
- Do not hand a mutating task to a subagent in a shared worktree. A review agent
  asked to build from an older revision checked out a file and destroyed uncommitted
  work in it.
- `lint-staged` fails on `apps/web-client/helm/templates/deployment.yaml`, a Helm
  chart prettier cannot parse. Merge commits stage it; `--no-verify` plus a separate
  typecheck and build is the workaround.

### Still open

Medication-topic guardrail in viasr-api is not built (brief filed, not blocking, the
letter never claims code enforcement). The new Resend key has Full access where
Sending would do. WAF rate limit on the login remains optional behind Turnstile.

---

## 2026-09-03 (PDT): Both backends promoted to production, and a red deploy that had actually succeeded

Astro set a standing rule: **production is the PRIMARY environment**, not the last
stop. It is the launch target and the surface he tests on, because his accounts
live there. Staging is secondary and inherits. The consequence for reporting is
that "merged to staging" is HALF DONE, and every status must say whether a fix
still needs a promotion, a build, or both. Staging had drifted 45 commits ahead,
which is exactly why none of the four Connection Reflection bugs he reported from
his phone could be verified. Full writeup:
`docs/plans/2026-09-03-production-promotion-and-build-455.md`.

### Landed then promoted

murror-api #903 (`03ec16f4`) and MurrorMobile #1198 (`63521a3a`) merged after
re-review. #903's coordinate-preserving change was reverted entirely; the merged
diff is three log calls plus a spec locking the clearing in, verified by
comment-stripped diff against trunk. Then murror-api #906 (`1fc36891`, 45
commits) and viasr-api #657/#659 promoted to production.

Payload diffed before every dispatch. The one migration is purely additive with
zero destructive statements and is registered in the production set. Reverse
direction checked in both repos: 0 files unique to production, so no hotfix was
reverted.

### The deploy that lied

Run 33707247142 reported **failure** at `Deploy to Kubernetes` with
`timed out waiting for the condition` after logging "1 out of 2 new replicas have
been updated". The CI job gave up at 5 minutes; Kubernetes finished anyway.
Verified by effect: `/api/health` 200, the next-steps route (which had NEVER
existed in production) returns **401** while a made-up route under the same
prefix returns 404, the migration table and both new columns exist, and no
migration was left broken. **A red deploy run can mean a succeeded rollout.**

### Two advisories, handled differently on purpose

- **nltk PYSEC-2026-3740 (viasr): suppressed.** The advisory contradicts itself,
  naming 3.10.3 as the fixed version in its structured data while its prose says
  "through 3.10.3". We are on 3.10.3, the newest release. It cannot be removed
  (transitive via llama-index and newspaper3k) and every reference in `app/` is
  commented out. Production already ran it, so blocking removed no exposure while
  holding back the privacy fix. Scoped ignore, review by 2026-10-03.
- **@humanfs/node GHSA-p498-v437-472g (mobile): patched.** This one had a real
  fix, so 0.16.8 was pinned through the existing `resolutions` block rather than
  suppressed. Lint-time only, never in the shipped bundle.

### Review catches worth keeping

- #903's source guard was **defeated by a Prettier line wrap**, proven by
  mutation: the bug came back and all 7 tests stayed green. Measured headroom was
  4 and 9 characters. `[ATOMIC_TASK_RESET]` had no other test.
- #1198: nothing guarded the Info.plist key. We ship
  `NSLocationAlwaysAndWhenInUseUsageDescription`; the library greps for
  `NSLocationAlwaysUsageDescription`, one word away. Adding it would make every
  reflection request an authorization upgrade. Now guarded.

### Operating notes

- macOS has no `timeout` binary; `timeout N cmd` exits 127 having run nothing.
- The GitHub API token lacks `workflow` scope, so workflow files must be pushed
  over git, not changed through `gh api`.
- zsh globs an unquoted `?` in a `gh api` URL.
- A step marked `continue-on-error` reports **success** while a later gate fails
  the run, so reading step conclusions alone points at the wrong step.

### In flight

MurrorMobile #1201 (humanfs), the viasr production deploy, and the ship chain,
which will produce build **456** rather than 455 since the bump was already
consumed.

## 2026-09-02 (PDT): Four days of launch readiness, 168 commits, and two PRs sent back

Window 2026-08-30 to 2026-09-02 across MurrorMobile (43 commits), murror-api (91),
viasr-api (34), plus the Codex web parity lane in murror-platform. Builds 452, 453
and 454 attached to App Store Connect. 455 is HELD pending the location work.
Full writeup: `docs/plans/2026-09-02-launch-readiness-aug30-sep02.md`.

### Connection Reflection finally works end to end

The CR card had never received the six insight fields it was designed around
(viasr-api #637). murror-api #902 made Step 4 recognise a Connection Reflection
rather than only a LOG task, which had left genuinely-reflected users stuck on
Step 4 forever. #901 bounded the partner wait, `a0c43713` anchored it on the
takeaway route, and #904 pinned the reduction with a test. MurrorMobile #1196
made the detail-screen and Home paths actually open a card, #1192 fixed takeaway
attribution and disclosed shared-insight AI to the receiver, #1195 stopped the
past-sharing banner going stale.

**The seam bug.** Widening who counts as having reflected (#902) broke the wait
anchor (#901) for exactly the newly recognised population, making the wait
unbounded again. Caught by the rebase forcing both into one head. Neither commit
had been promoted, so nobody was exposed. The ORIGINAL unbounded wait IS live:
5 production connections one-sided, oldest 2025-12-25, stuck until promotion.

### The emotion arc would have emptied silently

0 of 86 production labels were taxonomy values, and producers swallow the error.
viasr-api #639 constrained the arc in prompt AND schema, #642 gave it its own
45-adjective vocabulary, MurrorMobile #1185 coloured every value. Schema set must
equal the client colour set or users see grey discs.

### Privacy hardening

viasr-api stopped publishing caught exceptions (#641), failed-call prompts (#648)
and bound SQL parameters (#650) to the log stream; guarded the journal prompt,
output and crisis sentinel (#653); closed four holes in auth, shutdown, rate
limiting and cost (#652); and removed coordinates and addresses from
`search_location` logging (#656). murror-api coarsened `/globe/stats` (#896) and
purged pre-redaction takeaway audio (#871).

### Review is where the value was

Adversarial review found defects in the authors' own fixes at least eight times,
including a liveness probe that would have CrashLooped the deployment, a privacy
leak inside a privacy fix, and two PRs sent back this window:

- **murror-api #903** claimed it was safe to land alone. False: the shipped App
  Store client sends coordinates and no cycle token, so the edited branch is live
  in production. Its change also removes the only mechanism that ever erases
  stored coordinates while `completed_at` still advances.
- **MurrorMobile #1198** holds the no-prompt guarantee, but mutating `check(` to
  `request(` in the permission gate left the ENTIRE 4601-test suite green. The
  property Option A rests on had zero coverage.

### Production measurements (read-only)

- `takeaway_reflections`: 9 rows, 6 senders, oldest 2026-03-20. 4 of 6
  sender/connection pairs already past the 7 day wait limit, 1 still one-sided.
- `user_connection_tasks`: 5 rows carry real coordinates, 5 distinct users, aged
  176 to 222 days, ALL one-sided. Nothing will ever reap them, because cleanup
  requires both users to have completed.

### Operating notes

- The merge gate hook resolves the repo from the SESSION cwd, not `--repo`. The
  `cd` must be its own prior call.
- macOS has no `timeout` binary; `timeout 150 npx jest` exits 127 and a prior
  "pass" may be jest never having run.
- An awaited macrotask under fake timers HANGS the suite instead of failing, and
  jest's own `--testTimeout` does not rescue it.
- The daily macOS E2E cron removed in #1191 had never actually fired: GitHub only
  schedules from the default branch, and `e2e.yaml` on `main` has no schedule.

### Open for Astro

The 5 stale coordinate rows, whether a second Connection Reflection replaces its
text or stays a no-op (today it 201s and discards the words), whether the
Personalize location toggle needs a real persisted opt-out, whether #1197 rides
455, and whether the co-location prompts should stop sending street addresses to
OpenAI.

## 2026-08-25 (PDT): Build 446 attached, production deployed, and a placeholder guarding billing

**Build 446 is attached to the 2.0.0 record** (build id `5db830d2-408b-4a64-a6a6-2c773d41c6b9`,
VALID), superseding 445. The production API was deployed for the first time this cycle, and a
live security hole was closed that nobody was looking for. Full writeup:
`docs/plans/2026-08-25-launch-hardening-446-production-deploy-and-webhook-secret.md`.

### The launch blocker: nobody could sign up after logging out

`probeSession` showed the "We couldn't load your profile" screen when EITHER the session probe
could not answer OR the account storage generation was not current. The logout fence
deliberately leaves storage writes suspended and says so, so after any logout that second
condition held for the whole process. TRY AGAIN re-probed into the same fence, USE A DIFFERENT
ACCOUNT called logout again which cannot lift it, and only a force quit cleared it. Fixed by
applying the generation check only when the probe reports authenticated: a signed-out person has
nothing to commit. Review then found a second door onto the same dead button via
`appContext.user?.id`, closed in the same PR.

### Account deletion could never reach COMPLETED in production

The pipeline called `refresh_continuous_aggregate` unguarded while production has no timescaledb
extension, no such routine, and neither `_ca` relation. That step runs after purge-user-data and
before verify-and-receipt, so the throw purged the user's rows and then stranded the request with
`purgedAt` never stamped. Guideline 5.1.1(v) requires in-app deletion. The guard already existed
on staging and had simply never been promoted. It is a degradation, not a cure.

Promoted via the reconcile pattern rather than a fast-forward: production carried 17 commits
staging did not, including the `user_id`-label removal from business metrics. Zero conflicts,
verified byte-identical after merge.

### The webhook secret was the string "secret-value"

The only one of 18 keys in that state, on a public internet-facing endpoint that mutates
subscription state. Found by accident when the value was pasted into a terminal and zsh reported
command-not-found, which made it readable. An earlier probe returned 401, proving the secret was
SET but unable to reveal it was a default. Rotated, rolled, and proven: `Bearer secret-value` now
returns 401, with a 503-vs-401 discriminator confirming a real secret is loaded rather than
missing. The production webhook was then configured and a RevenueCat test event landed and
processed, so `webhook_logs` is non-empty for the first time in the system's history.

### Operating notes

- `strings BIN | grep -q PATTERN` exits **141** under `set -o pipefail`: grep -q quits on the
  first match, strings dies of SIGPIPE. It stopped the ship script on both 445 and 446 with
  "production API host NOT baked into the binary" on archives that contained the host. On 445 it
  was misdiagnosed as a copy race and a settle-wait was added, which could not have fixed it. Use
  `grep -c`.
- A grep exclusion can hide its own target: `-vE 'plan-state\.ts'` also matches
  `use-sync-plan-state.ts`, which turned into a confident wrong claim and a whole PR built on it
  (#1146, closed).
- The consent default is correct on the server and **inert against the shipped client**, which
  sends `|| false`, an explicit ALLOWS. It only takes effect once 2.0.0 ships.

### Still open

446 is not device tested. Account deletion has never been exercised in production, 0 requests all
time. Journaling remains the only generation flow with no safety pass. Hermes dSYMs never upload.
Production GitHub environments have empty protection rules.

## 2026-08-21 (PDT): Build 441 uploaded, and the archive path was the bug all along

**Murror 2.0.0, build 441, is archived, uploaded to App Store Connect and attached to the
2.0.0 record.** First successful production archive since build 432 on 08-13, ending sixteen
consecutive failures. Full writeup:
`docs/plans/2026-08-21-ios-archive-restored-441-uploaded.md`.

### The cause was a date, not a defect

Build 432 uploaded at 16:46 PDT on 08-13. `d3dce65e` landed at 21:04 the same evening and
rewrote the app's own production bundle build phase so that `install:iphoneos:Release`, exactly
what `xcodebuild archive` sets, routes through the hermetic lane's wrapper under `env -i`.
From that commit a production archive was structurally impossible outside the lane. Nothing
about the app broke. CI compiled it green the whole time.

The lane could not finish because its read-only seal asserts the build never writes to its
dependency trees, which is false for React Native. Three writers were found and patched
individually (Hermes swap, 15 compat-header modulemaps, `react-native-config` codegen), each
costing a re-baseline and a build number. The rest are not enumerable by inspection: the
writes happen inside tools the phases invoke.

Confirmation came from a stranded task found on 08-21 whose 08-20 run had reproduced the Pods
digest **exactly** and still been rejected by the lane.

### Shipped

- **#1127** into `staging-environment-setup`: restored the build-432 stock bundle phase.
  8 files, +18 / -3,189. One pbxproj line, checksum-verified against `5b1c2c67`.
- **#1128**: scripted 441 bump via `ios-next-build.sh`, max(canonical 440, ASC 432) + 1.
- **Build 441 uploaded** 21:52 +07, `VALID` in ASC by 21:57, attached to version record
  `c89c6942`, replacing build 141 from April. Record moved `REJECTED` ->
  `PREPARE_FOR_SUBMISSION`.
- **#1119** vendored `@rneui` as tarballs, killing the umask-dependent lockfile hash that
  had killed build 436.

### CI caught a wrong revert target, and that was the good outcome

The first attempt reverted to `d3dce65e^`. CI rejected it because that intermediate wrapper
calls BSD `stat -f '%u'` unconditionally, which cannot pass the Ubuntu runner that has run
every `scripts/ci` test since 08-11. **That intermediate never had a green CI run.** The only
state proven both green and able to archive is `5b1c2c67`, where the wrapper and its
2,143-line contract test did not exist at all.

### Codex review blocked the merge, correctly, on four findings

All verified against the code before acting: archive-time Sentry upload could re-enable (in
fact it **fails** the archive when the token is invalid, and ours is revoked); the retained
driver still `verify_tracked_tool`s the deleted wrapper; the 432 release checklist would
resurrect Android, Fastlane and manual build-number guidance; and source changes invalidate
440 so a scripted 441 was mandatory. Codex's separate recommendation to retry the lane from a
standalone clone was **not adopted**: that fixes only the `.git` guard, while the wrapper still
needs the driver-only `MURROR_RELEASE_*` bootstrap.

Codex's own diagnosis of the worktree failure was right and is recorded: 440 archived from a
linked worktree whose `.git` is a pointer file, and CI never caught it because CI builds a
simulator with `ACTION=build`.

### Operating notes

- `pod install` under the repo's pinned toolchain (Ruby 3.4.1 + bundler) **reproduces**
  canonical's `Podfile.lock`. Bare system CocoaPods under Ruby 3.2.0 rewrites ~47 spec
  checksums. The earlier belief that canonical's lockfile was hand-maintained drift was wrong.
- CocoaPods throws `Encoding::CompatibilityError` on its own install path when `LANG` is unset.
- Two sets of orphaned background processes were killed: seven `gh pr checks` watchers from a
  dead peer session running 3d21h whose `--required` exit condition can never fire on a repo
  without branch protection, and a 22h task whose measurement had finished but whose `ugrep`
  child had wedged.

### Codex lanes in parallel

- **Web parity** (murror-platform, `staging`): #356-#374, authenticated routes and contracts,
  Home and Diary aligned with production iOS, recovery OTP completed, Family and Subscription
  locale parity, global locale-key guard, Duo policy contracts, English-only picker.
- **Marketing** (`feat/marketing-site`): early access became a reviewed application (#372),
  and #378 fixed approvals that mailed nobody while claiming otherwise. Plus signup lifecycle
  and attribution (#355), feedback-form analytics (#375), feedback media into the CRM (#367).
- **Android** (MurrorMobile): 338 commits on branches, **zero reachable from canonical**.
  iOS-only scope holds.

### Still unverified

Build 441 has never run on physical hardware. Sentry dSYM upload pending a rotated token. The
demo account password and `MurrorTester107` offer code need human confirmation before submit.

## 2026-08-17 (PDT): Production moved, and the Sentry scrubber took four rounds

First production change of the 2.0.0 push. `murror-api` went `0.41.1` -> `0.41.2` on
SGP1 `nsp-prod-murror`, rollout revision 10 -> 11, verified by pod image, fresh pod
start times and the change-cause annotation rather than by the workflow conclusion.
Full writeup: `docs/plans/2026-08-17-murror-api-production-deploy-and-sentry-scrub.md`.

### Shipped

- **#774** into `staging`: every CI contract runs in the loop. The old skip-list
  coupled the loop to an earlier fail-fast step, so deleting that step would have
  stopped both production contracts running anywhere while CI stayed green.
- **#773** into `staging`: the Sentry PII scrubber, 8 commits across 4 review rounds.
- **#771** into `production`: the staging-to-production reconcile, zero conflicts,
  production's own commit proven byte-identical by md5 before and after.
- **#777** into `staging`: corrected the production promotion path in CLAUDE.md.
- **Production deploy** dispatched on the `production` ref, run `31921391503`.

### Seven Important scrubber findings, every one of which passed a green suite

Unscrubbed `event.user` / exception messages / `event.extra` on the transports that
bypass the Nest filters; `Error.name` is writable so the exception `type` was
attacker-settable; both key-validator maps reachable through the PROTOTYPE CHAIN
(`constructor` resolves to inherited `Object`, truthy and callable, so the value
survived); `event.spans` spread rather than rebuilt; `stacktrace` passed by reference
carrying local variable values; the uuid guard anchored on both validators so neither
caught an embedded id; and the six span-identity fields validated in one place and
trusted in another.

### Operating notes

- The agreed Sentry precondition was UNSATISFIABLE. Alpha and staging have no
  `SENTRY_DSN`, so "trigger a 500 on alpha and confirm no PII" passes instantly and
  proves nothing. Production is the only tier with a DSN.
- The documented promotion path was wrong. Production gates on `workflow_dispatch`
  AND a `production` ref; a dispatch from `main` skips every job and reports green.
- A diff count needs its baseline. "659 ahead of main" made a routine reconcile look
  dangerous; against `staging`, which feeds production, it was 7 ahead / 16 behind.
- The worktree staleness trap produced three separate wrong conclusions in one day,
  including a Critical security finding built on an unfetched file.

### 2.0.0 API readiness

All 147 API paths the client can call, diffed against the 312 routes production
registers at boot: 143 served, 4 dead code with zero callers, 4 gated dark and
failing closed, **0 reachable gaps**.

### Still unverified

The PII scrubbers are deployed and have never executed anywhere. Sentry has recorded
zero events since the roll. That is a test that has not run, not a pass.


## 2026-08-06 (PDT): Builds 417 and 418 shipped, and the paywall footer root cause

Astro's build-416 TestFlight feedback, worked through to two shipped builds. Full
writeups: `docs/plans/2026-08-05-build-416-feedback-ui-and-paywall-footer.md`
(investigation), `docs/plans/2026-08-06-builds-417-418-shipped.md` (what shipped),
`docs/plans/2026-08-06-build-418-feedback-handoff.md` (open items).

### Shipped

- Builds **417** and **418** uploaded to TestFlight. PRs #1034, #1035, #1036, #1037.
  Each verified: app and every `.appex` at the same build number,
  `staging.api.murror.app` present in the native binary, Alpha and prod hosts
  absent, and both runbook markers (`** EXPORT SUCCEEDED **` plus
  `Uploaded MurrorMobileStaging`).
- **Paywall footer is genuinely see-through.** Root cause after five failed
  attempts: the sticky footer was a plain **flex sibling** of its `ScrollView`, so
  it occupied its own space and page content never passed behind it. Builds 353,
  399, 413 and 415 all tuned a blur or gradient on a layer with nothing behind it.
  Fixed with `position: absolute` plus the app's card glass recipe.
- **Home background** matched to the shared gradient and much darker. An opaque
  `#05070F` absolute-fill base in `home-orbital-background.tsx` had been covering
  the app gradient entirely, so Home never showed the shared tint. Aurora washes
  cut, and the shared bottom stop taken `#323245` to `#15151D`. Measured bottom
  went (62,52,84) to (25,23,33).
- **Nav pill and the deep-chat butterfly FAB are neutral.** The R10 purple retint
  lived in two independent copies, `tab-controller.tsx` and `murror-bubble.tsx`,
  which is why fixing one did not fix the other.
- **One paywall appearance.** The switch-account link is now unconditional, so the
  cold-start gate and the Settings-initiated paywall stop reading as two different
  screens. Verified four ways that only ONE full paywall exists.
- Feedback button opens `murror.app/feedback` instead of a `mailto:`.
- Memo last-word flicker: the screen passed an inline `onComplete`, and
  `FadeMarkdownText` carries it in the deps of the effect owning the completion
  timer, so a fresh identity every render restarted that timer in the branch that
  only runs once the last word is on screen. Handlers are now cached per index.

### Caught before shipping

An adversarial review before the archive found three blockers, all real:

- Making the switch-account link unconditional newly exposed **immediate sign-out,
  no confirmation, no undo** on every in-app soft-paywall gate and the upgrade
  sheet. Now behind a confirm dialog reusing the settings logout copy, with a
  dedicated test that fails if the dialog is removed.
- The "ONE derivation" claim was **false**: 15 hand-rolled copies of the old
  gradient remained, nine of them full-screen, which manufactured new same-flow
  brightness steps. Nine aligned; five sheet and card fills left deliberately.
- Padding the `ScrollView` by the FULL footer height was self-defeating, since the
  padding that stops content being trapped is the same padding that guarantees
  emptiness behind the glass. Now a fraction.

11 specs were rewritten rather than deleted, because they locked the old R10 purple
direction and the conditional link.

### Operating notes

- **Read the runbook before declaring a blocker.** The TestFlight upload was called
  impossible twice. `docs/runbooks/ios-build.md` had the `-authenticationKeyPath` /
  `-authenticationKeyID` / `-authenticationKeyIssuerID` flags all along. The API key
  IS the account, and with `-allowProvisioningUpdates` xcodebuild fetches the
  distribution certificate itself. "No Accounts" meant not authenticating.
- **`scripts/ios-next-build.sh` MUTATES.** It was run as a read-only App Store
  Connect query and wrote a stray 419 that had to be reverted. Never use a
  number-claiming script as a status probe.
- **Verify which screen is on the simulator before trusting a pixel sample.**
  Numbers were reported from the wrong screen three times. A dark-pixel probe is not
  a screen identity check; assert on a known glyph.
- A correct measurement of the wrong thing is worse than no measurement. The footer
  ramp measured "correct" five times while the real cause was structural.
- zsh does not word-split unquoted variables, so `for f in $FILES` over a
  newline-separated string passes one giant filename.

### Still open

- **MTC card overlap** did not reproduce across four simulator configurations, so no
  seventh fix was written. The build-414 geometry telemetry cannot report a bad
  frame (it early-returns on a non-positive slot width), so its in-code conclusion
  is not settled fact. Recommendation is a latching diagnostic capturing real
  geometry from Astro's device.
- Build-418 feedback: paywall and premium confused for a paying subscriber (highest
  severity), connection prompt pronouns still wrong (the fix is uncommitted in
  `viasr-api` AND likely targets the wrong surface, since prompts come from a
  server-generated pool the client merely cycles), keyboard pushes the note field
  under the header, zodiac cards black on black, orbit dots less vivid on Home than
  in onboarding. The last two may be side effects of the 417 background darkening.
- Notion Engineering Log still blocked: the database is not shared with the Composio
  integration. Re-verified 2026-08-06.

## 2026-08-03 (PDT): Isolated web and Android staging parity lanes

The cross-platform parity work was reorganized around Murror-only lanes so it
cannot collide with the active iOS staging repair. The iOS checkout remains a
protected reference owned by the parallel Claude work; no iOS files, builds,
archives, merges, pushes, deployments, or migrations were touched here.

### Workspace and safety completed

- Confirmed the canonical Murror root is `/Users/astro/Projects/murror-transfer/Murror`.
  Uni and the Google Drive folder with the same visible name are outside this
  workstream. Murror has iOS, Android, and web scope only; there is no Murror
  macOS app target.
- Added the Murror workspace identity marker and cross-platform isolation plan,
  with guards that accept only the web parity, Android staging parity, and
  Together API contract lanes. The guards reject the protected iOS checkout,
  canonical API checkout, Uni, and the misleading Drive folder.
- Kept work in separate branches/worktrees: web
  `feat/web-core-loop-parity`, Android `codex/android-staging-parity`, and
  Together API `codex/together-contract`. The pre-existing web dependency
  symlink and all unrelated dirty files were preserved.

### Staging and contract protection completed

- Made Android staging manual and fail-closed: the shared iOS staging branch
  no longer starts an Android staging build, staging source/ref and
  `BASE_API_URL` are validated, staging signing is isolated, and concurrency is
  target-aware.
- Made web staging explicit and serialized by target, validated the approved
  source branch, preserved all existing capability flags, and limited the
  staging deploy target to the web client where repository values are present.
- Hardened the web staging verifier to require the Memory Room and Connection
  Journey Docker build arguments as well as their environment wiring, so those
  parity flags cannot silently disappear from a staging image.
- Added/verified checked-in typed client foundations and source-backed generated
  declarations for web and Android. Generators fail closed when hosted staging
  OpenAPI is unavailable instead of silently generating from an unknown schema.
- Added the isolated Together companion DTO contract and pinned the caller-scoped
  family-plan member-leave route without changing runtime data or migrations.
- Added the daily voice-summary route to both fail-closed generated-client route
  sets and tied Android's general client plus web's Diary query to the generated
  route key. The isolated Together API contract lane now documents the existing
  response as `VoiceSummaryResponseDto`; a source-backed 311-path Swagger probe
  confirmed the shape and both checked-in declarations reference it instead of
  `Object`. Hosted staging schema publication and authenticated runtime proof
  remain explicit gates.
- Verified the Android private journaling lifecycle in the isolated staging lane:
  draft persistence, resumable history, quota terminal states, streamed status,
  retry, and completion return pass 10 focused suites and 48 tests. This remains
  source and client-contract evidence until authenticated staging and device
  validation are completed.

### Web parity completed in the isolated lane

- Added personal Memory Room with feature-flagged route, month/detail/summary
  reads, deep-link handling, and Home/Diary entry points.
- Added Your Growth detail lifecycle states, connection journey timeline, and
  the mobile-compatible notification callback/quiet-hours behavior.
- Localized the existing web notification toggle and mobile-parity permission
  prompt in EN/VI/JA, including callback-pings errors and browser permission
  recovery. The focused notification suite passes 12 tests; web TypeScript,
  formatting, and diff checks pass.
- Closed the shared locale-contract gap for `takeaway.syncError`: web EN/VI/JA
  now carry the same recovery key already present in Android. The recursive web
  locale audit passes with 2,455 keys per locale.
- Localized the generic web AI chat connection/auth fallbacks in EN/VI/JA while
  preserving server-provided error messages. The focused deep-chat and notification
  run passes 2 files and 21 tests; web TypeScript, formatting, and diff checks pass.
- Hardened Android quiet-hours storage handling with a fail-safe parser that accepts
  the shared numeric format and the web time-string format while preserving the
  existing mobile serializer. Malformed values now fall back safely instead of
  producing an unhandled parse error; the new contract suite passes 4 tests.
- Added web support for the mobile-compatible `/memory_room/:id` Memory Room deep
  link, while preserving the existing `/memory-room?memoryId=...` route and
  canonicalizing follow-up selection/close actions. The focused Memory Room suite
  passes 4 tests; web TypeScript, formatting, and targeted ESLint pass.
- Added web aliases for the remaining shipped mobile linking/widget/share paths:
  `/home_screen`, `/relationship_screen`, `/knowledge/:articleId`, and
  `/takeaway/:relationshipId/:takeawayId`. They reuse the existing protected
  home, Friends, article, and relationship-takeaway screens; the route contract
  suite covers these aliases alongside Memory Room and voice summary.
- Hardened Android daily voice-summary deep links with explicit ready/loading/
  empty/error state handling, localized retry copy, stale-content preservation,
  and playback controls that remain hidden until content is ready.
- Matched the web daily voice-summary page to that recovery contract: inline or
  stale content remains playable, first-load failures show localized retry, and
  playback controls stay hidden until content exists. The focused page check,
  full TypeScript check, client/staging guards, production build, formatting, and
  diff checks pass. A missing `note` member in the existing Personal Note
  carousel union was corrected as a narrow type-contract fix.
- Added a PR/manual-staging Android workflow gate for the focused Connection
  Journey, voice-summary, Memory Room lifecycle, Your Growth, AI chat
  resume/history, and quiet-hours suites before JDK/Gradle setup.
- Extended that same Android gate with AI chat resume isolation, Diary-to-chat
  continuation, conversation-history rendering/close coverage, quiet-hours
  storage coverage, and the native linking path contract. Ten suites and 49
  tests pass; authenticated staging, cancellation, Gradle packaging, and device
  validation remain separate gates.
- Closed a shipped deep-link drift in Android: `/relationship_screen` was already
  declared in the native linking table and mapped on web, but the raw URL
  interception list and widget fallback did not route it. Android now registers
  the path and reuses the existing Connections tab; the focused linking suite
  passes 6 tests.
- Added shared-plan Settings and subscription management states for Duo/Circle,
  organizer/member privacy, grace periods, member leave, and entitlement refresh.
- Added the partner-only personal-note exchange: composer, daily cap handling,
  crisis-safe inline prompt reuse, received-note card/dialog, message typing,
  API mutation, and tests for privacy and error states.
- Matched Android's shared Our Memories freshness behavior on web: the wall now
  refreshes when the visible browser regains focus or returns from a hidden tab,
  then on a calm 15-second visible cadence; failed seen markers receive one
  bounded retry. Web TypeScript, Prettier, client/staging contract guards, and
  diff checks pass. The focused Vitest runner remains blocked by the retained
  offline mirror's broken React/Testing Library links; no browser or authenticated
  staging claim is made.
- Hardened the web staging image workflow to reject unapproved source refs
  before Docker push, using the same `matrix-config.json` allowlist as the
  deploy workflow. This prevents an iOS/shared staging ref from being mislabeled
  as the web parity image.
- Made the web staging flag plumbing explicit for Care Tips and the Memory
  Recall chip across Docker, local builds, GitHub image builds, and deploys.
  Care Tips preserves its existing client default (`true`, with backend gating);
  Memory Recall remains explicitly off unless staging opts in.

### Android parity completed in the isolated lane

- Centralized the typed client foundation and generated declarations for the
  parity surfaces, including shared auth reset and unauthorized handling.
- Added Your Growth detail lifecycle states and Memory Room lifecycle parity:
  initial and stale errors with retry, month/deep-link validation, cursor
  pagination, load-more errors with retry while preserving loaded memories,
  localized copy, and screen regression coverage for missing deep links, load
  more, and stale-page retry.
- Pinned the caller-scoped Together member-leave contract and kept development
  and staging workflow paths separate.
- Scoped Android push and pull-request workflow triggers to Android/shared
  client inputs. Xcode-only changes under `ios/**` no longer start Android
  validation, while shared React Native changes still exercise the parity gate.

### Evidence and cleanup

- Web and Android workspace/staging/client guards, locale checks, formatting,
  syntax checks, focused tests, workflow checks, and diff checks
  passed for the isolated changes. The focused web Personal Note run passed 3
  files and 45 tests; the prior Android parity gate passed 8 suites and 40 tests,
  and the latest rerun including quiet-hours and native-linking coverage passed
  10 suites and 49 tests. The workflow contract verifier pinned that
  ten-suite baseline before the gate was expanded in the latest parity pass.
  The new Android helper also passes isolated TypeScript validation; a full
  workspace typecheck against the recoverable mirror is not treated as release
  evidence because that mirror produces broad dependency-resolution errors.
- Read-only staging probes reached the health endpoint with `200`; protected
  parity routes returned `401`, and candidate Swagger docs returned `404`.
  These prove gateway/route behavior only, not an authenticated user flow.
- A final shared-memory/native-capability source audit found the Android and web
  detail surfaces aligned for comments, optimistic rollback, private reporting,
  speech/share/clipboard fallbacks, and notification gating. No additional source
  rewrite was justified; the remaining end-goal work is staging deployment and
  authenticated browser/device/native-build validation.
- The hosted `https://staging.app.murror.app` shell returns `200`, but its current
  headers show a July 28 `Last-Modified` timestamp and an older API-domain CSP.
  It is therefore not evidence that this dirty isolated parity lane has been
  deployed; no staging dispatch was triggered from it.
- Android Gradle/device validation remains open because this machine has no Java
  runtime. Authenticated staging and real browser/device checks remain open.
- Reused task-owned dependency mirrors only for validation, then moved disposable
  artifacts recoverably into dated Trash. The Android Yarn dependency tree used
  for the journal lifecycle check was approximately 1.2 GB and now lives at
  `/Users/astro/.Trash/murror-android-parity-node_modules-2026-08-03-journal`.
  No broad cache purge occurred, the pre-existing web symlink was not changed,
  and the task-owned Watchman metadata was absent after the final audit.

### Progress page

- Removed the internal latest-update/live ledger from the investor-facing
  public `/progress` page. The existing timeline remains public; parity status,
  test counts, workspace details, and staging gates stay in this internal log
  and the parity matrix.
- Added a public-page contract test that keeps the timeline populated in EN/VI/JA
  and rejects the internal live-ledger markers from the marketing component.
  The focused contract test passes 2 tests with Prettier and ESLint clean.
- Redeployed the existing Cloudflare Pages preview alias
  [`progress-parity-2026-08-03.murror.pages.dev`](https://progress-parity-2026-08-03.murror.pages.dev/progress/).
  The new preview deployment is `1d2347d9.murror.pages.dev`; English,
  Vietnamese, and Japanese routes returned `200`, no longer contained the
  internal ledger markers, and still contained their normal timeline heading.
  This is a preview deployment, not a production promotion.

### Still open

- Authenticated staging flows, Android Gradle packaging, hosted CI, real Android
  device/emulator checks, and browser acceptance.
- Human review before any merge, deploy, distribution build, or feature-flag
  change. Claude's active iOS staging repair remains independent and protected.

## 2026-08-02 (PDT): Codex iPhone auth and subscription release handoff

Codex consolidated the recent iPhone-only staging work into a production-readiness
handoff. Android, iPad, and Apple Watch work remain out of scope.

### Verified

- Staging build 409 (`app.murror.mobile.stg`, version 2.1.0) archived, exported,
  uploaded, and later reported `VALID` by App Store Connect.
- Focused auth, account-isolation, onboarding, and subscription checks passed with
  9 suites and 67 tests. Targeted lint, formatting, i18n, release-contract, and
  diff checks also passed.
- The latest checked-in iOS lane commit is `8924a795`, reconciling Duo entitlement
  refresh, purchase recovery, plan syncing, membership/sharing, and invite flows.

### In flight

- The current isolated Codex iOS worktree still contains uncommitted auth-session,
  fresh-OAuth profile, soft-paywall, localization, and subscription-management
  fixes. They are preserved for Claude to inspect and reconcile rather than being
  silently merged or overwritten.
- A real-device report still shows login failing immediately after Google
  authentication. The exact device log and authenticated backend request/response
  are required before another build or TestFlight cycle; build 409 validity does not
  prove the device flow.

### Operating notes

- Task-owned iOS dependencies, Pods, archive/build outputs, and temporary upload
  logs were removed after App Store Connect validation, reclaiming approximately
  6.7 GB. Shared DerivedData and unrelated dirty worktrees were preserved.
- No GitHub Actions workflow was manually dispatched for this handoff. The JA/VI
  staging release, clinical sign-off, production promotion, and DEV/Alpha P3009
  migration decision remain separate gates.

Full technical record: `docs/plans/2026-08-02-codex-ios-production-handoff.md`.

## 2026-08-02 (PDT): Vietnamese and Japanese PHQ-9/GAD-7 staging release

Completed the coordinated Vietnamese and Japanese mental-health questionnaire
release on staging. Production and DEV/Alpha remained untouched.

### Shipped

- murror-api PR #710 merged into `staging` at `75ddb94d`, carrying the corrected
  Vietnamese content, Japanese PHQ-9/GAD-7 questions and answers, Japanese
  severity response handling, and connection-insight Japanese infrastructure.
- MurrorMobile PR #996 merged into `staging-environment-setup` at `bba7bddf`,
  versioning the check-in cache by locale and disclosing the two-week timeframe
  before launch in English, Vietnamese, and Japanese.
- Staging deploy run #30727859628 applied the three localization migrations,
  rolled out the API, passed the smoke test, and passed the release gate.

### Verification

- The deployed legacy Prisma read path returned all 16 questions with complete
  Vietnamese and Japanese question and answer sets, including reviewed item 9
  wording.
- API and mobile CI passed their existing validation suites. No additional
  workflow was manually dispatched, and the mobile merge did not create a new
  Actions run.
- Storage cleanup removed task-owned temporary artifacts while preserving
  pre-existing dirty worktrees.

### Operating notes

- The DEV/Alpha P3009 migration-lane jam remains a separate decision boundary.
  No DEV/Alpha migration repair or `prisma migrate resolve` was attempted.
- This was a staging readiness release, not a production promotion.

Full technical record: `docs/plans/2026-08-02-ja-vi-staging-release.md`.

## 2026-08-01 (PDT): Duo grace copy, the build-lane collision, Sentry live, and the DO bill explained

Multi-day production-readiness push. Full writeup:
`docs/plans/2026-08-01-production-readiness-duo-sentry-infra.md`.

**Duo: ex-member saw plan-owner copy.** Someone who left a plan and a Solo
subscriber who cancelled were byte-identical on the wire (SOLO / NONE /
cancelAtPeriodEnd), so the client could not tell them apart. murror-api #701 adds
`seatGraceUntil`, deliberately the DATE not a flag beside a date, so discriminator
and printed value come from one read of one seat. MurrorMobile #988 renders
member-specific copy and excludes it from `endingSoloGrace`. Deployed and verified
live: exactly one of four harness accounts returns a date, matching the seat's
`entitled_until` to the millisecond. Copy stays neutral on cause, because the field
is set for any REMOVED seat (left OR removed by organizer). An existing test had
encoded the bug as a requirement; kept and renamed to lock back-compat instead.

**Avatar preset URLs were hardcoded to staging.** #989 gave Manage Account the
butterfly placeholder and surfaced a production landmine: the only URLs the app
BUILDS and then PERSISTS as user data pointed at the staging Supabase project, with
a comment asking a human to remember to swap it. Now derived from
`Config.SUPABASE_URL`, with a test naming all three project ids. Measured exposure
on the production DB: **0 users affected**. Preventive, no backfill.

**Build 403 was already on TestFlight while trunk said 402.** `ios-next-build.sh`
read git only, so it would have emitted a colliding 403; Apple rejects the duplicate
and the fix silently never ships (the 251/253 failure again). #990 now takes
`max(git, App Store Connect)`. Build 404 archived, verified (app + both appex at 404,
staging host only in the binary), VALID.

**Sentry.** #703 first: `NODE_ENV` is `production` on EVERY tier (verified in the
running pods, not the ConfigMaps), so staging noise would have been filed as
production the moment a DSN existed. Then enabled in production using the existing
`murror-api` project. Verified the DSN inside the pod, not just the patch output.

**TLS certificate broken 105 days.** #704. Two Certificates fighting over one secret;
the ingress-shim one held a valid cert the whole time so only the loser reported
failure. Safe to remove because the deploy has no `--prune`.

**DigitalOcean 4x bill.** Nothing orphaned: July 4 ADDED sgp1 and never
decommissioned sfo2. Run-rate ~$240. HA cannot be disabled (DO restriction), sfo2 is
memory-bound so cannot shrink, and consolidation saves ~$52/mo not $148 because
workloads carry their compute. Real lever is over-declared requests (sfo2 requests
6.4 CPU, uses 0.83). Split into its own session; tasks #35-38.

**Production RevenueCat Duo path complete.** Both SKUs registered under the live app
and attached to `app.murror.premium`, verified via API.

### Operating notes

- **Two near-misses, both "remove the unused thing".** `insights.murror.app` was
  returning 200, and `murror.api.ambercare.app` is what `.env.production` points at,
  so the live App Store app calls it. Checking live state before deleting is what
  caught both.
- **Three corrections.** Claimed prod had no Duo products (I had created them the day
  before), claimed a DSN would tag prod as `development` (inverse was true, and the
  code comment already said so), and framed the expected state of staging-first work
  as a discovery. Pattern: check what exists before building it.
- **Build environment traps:** CocoaPods needs a UTF-8 locale; the vendored
  `xcodeproj` needs the `objectVersion 70` patch and the gem set copied from build 400
  did NOT carry it; and `pod install | tail` reports success even when it failed.

## 2026-07-31 (PDT): Onboarding length A/B built, staging pinned to the short arm

Brainstormed, designed, built, and shipped a full-vs-short v2 onboarding A/B
in response to user feedback that the funnel felt long, then armed staging to
the short arm at Astro's request. Full detail:
`docs/plans/2026-07-31-onboarding-length-ab.md`.

### Highlights
- **Four-agent panel (forge/heart/prism/oracle) brainstormed the cut before any code.** Consensus: Act 1 (orbital hook -> chip -> Share -> AI "their side" Merge reveal) stays untouched in every variant, it is the entire value demo. Only Act 2/3 (the 15-beat question block) shortens, using Heart's rule: keep beats that GIVE the user something, cut beats that only TAKE.
- **A visual screen-by-screen storyboard was shown to Astro and approved before implementation** (phone mockups in the app's dark orbital language, the flag-switch diagram, the experiment design).
- **Mobile PR #976** (`staging-environment-setup`, merged): `ACT23_STEPS_SHORT` cuts Act 2/3 from 15 beats to 4 (`identity`, `hearUs`, `relImprovement`, `insightPreview`); the arm is resolved once at the letter -> Act 2/3 transition and **persisted per install** so a relaunch can never switch someone between arms mid-experiment; RevenueCat subscriber gets re-tagged with the arm after `Purchases.logIn` (RC does not merge anonymous attributes on login, so the pre-signup tag alone would have been unattributable). 2 adversarial review rounds, all findings fixed. 52 tests green.
- **murror-api PR #687** (`staging`, merged + deployed both namespaces): made `gender`/`goalIds` optional on `POST /onboarding/complete`, a hard prerequisite found by verifying the backend rather than assuming it (the short arm defers those questions and would have 400'd on every signup otherwise). Round-2 review caught a cross-DB asymmetry (absent gender wiped murror but left legacy stale on redo) and a round-trip trap (`goalIds: []` would have 400'd the profile-edit save for every short-arm user); both fixed. 2,753 tests green.
- **PostHog flag `onboarding_v2_length`** (id 792796) created disabled first, multivariate full/short 50/50, then armed scoped to `env=staging` only at 100% short. Verified live against the `/decide` API for staging, production, and no-env; production is untouched two ways over (condition excludes it, and no prod build carries the code yet).

### Operating notes
- **Kill switches, zero build:** flip the flag's condition to serve 100% `full`, or disable the flag entirely (client fail-safes to `full` either way).
- `evaluation_runtime: 'client'` (the PostHog create-flag default) silently excludes a flag from `/decide` responses; use `'all'` for any flag you need to verify or that a server-side path might read.
- The next staging TestFlight build cut from `staging-environment-setup` carries the short arm; existing builds predate the merge and ignore the flag. Alpha/dev already defaults to the short arm (no PostHog key ships there).
- Open: an end-to-end signup-without-gender/goals proof against a live staging harness account was blocked by the permission classifier twice this session; covered today by the passing test suites and the verified-deployed API image, true end-to-end confirmation lands with the first staging TestFlight walkthrough.
- For the real 50/50 launch A/B (not staging-only): replace the flag's `env=staging` condition with the launch targeting and drop the forced `short` override.

### Docs
- `docs/plans/2026-07-31-onboarding-length-ab.md`

### Still open
- Real 50/50 launch targeting on the flag (currently staging-only, 100% short).
- Live-device end-to-end proof of a short-arm signup completing.
- Cut the next staging TestFlight build to actually surface the short arm to testers.

## 2026-07-26 (PDT): Duo/Together reaches a real staging test surface

### Highlights
- **Staging and alpha are at API + web parity** and both run the Duo rule set clean: the state-machine harness scores **14/14 on BOTH** environments, including `Duo resolves to 2 seats`.
- **The RevenueCat silent-success bug is dead.** Root cause was Prisma dropping an `undefined` `eventId` from a where clause, so the idempotency lookup matched an unrelated processed event and discarded the purchase while answering 201. Fixed at three sites; two were found by grepping consumers rather than by the repro. `storeAnonymousEvent` was arguably worse than the original, silently dropping pre-login purchases.
- **The Duo claim flow works end to end on staging.** `staging.app.murror.app/family/join` is live, the seat token now survives the sign-out/sign-in switch, and new invitees are routed back to the claim page after sign-up (previously they finished onboarding and silently never claimed, which hit every new invitee).
- **V1 onboarding is retired.** V2 is the only funnel; a stale `murror_ob_variant: "control"` session is actively repinned so no flag, outage, or pin can resurrect V1.
- **Staging purchase lane is configured**: RC webhook created and app-scoped, secret rotated off a placeholder, seat map set with the `.stg` product ids, and cross-environment webhook pollution closed.
- Mobile build **372** carries Duo enabled for staging testers, with production still gate-only.

### Operating notes
- **Merging to `staging` does NOT deploy alpha.** The deploy matrix fires only `nsp-staging-murror`; alpha needs a separate `Build & Push Image` dispatch. Assuming otherwise leaves alpha silently on the old image.
- **A `web-client` deployment has existed in `nsp-staging-murror` for 49 days** at `staging.app.murror.app`. The missing `staging` git branch in murror-platform was never the blocker for a staging web surface.
- **RC enforces one webhook per URL per project** (409 on the second). A distinguishing query param makes the URL unique while hitting the same endpoint; verified live that auth still enforces.
- The staging `REVENUECAT_WEBHOOK_SECRET` was the literal placeholder `secret-value`. Rotated on both sides and proven three ways.
- Staging had **no** `REVENUECAT_FAMILY_PRODUCT_SEAT_MAP` at all (absent key, `optional: true`), so a Duo purchase would have created a personal subscription with no plan and no seats while answering 201.
- `Config.ENV !== 'production'` is fail-open for a money-adjacent flag. Use an explicit allowlist.
- A mock that does not do what production does converts a guard into false confidence: the join-page "keeps the token" spec passed throughout because its logout mock never ran the storage sweep.

### Docs
- `docs/plans/2026-07-26-duo-staging-parity-week.md` (this week, full detail)
- `docs/plans/2026-07-25-duo-claim-and-webhook-silent-success.md`

### Still open
- Device pass on staging. Everything proven so far is rules-level; the harness says so itself.
- Alpha's webhook secret is a literal `kubectl set env` value drifted from the k8s Secret.
- V1 stage 2: delete the ~29 unreachable pages/routes. `/onboarding/invite` is shared with v2 and must survive.

## 2026-07-18 (PDT): Alpha Duo goes purchasable (RevenueCat) + the "Alpha is the dev backend" correction

Took Together Duo on Alpha from UI-only to a real sandbox purchase, stood up the RevenueCat store side in the correct project, and corrected a stale infra assumption that had sent a session chasing a dead cluster. Full detail: `docs/plans/2026-07-18-alpha-duo-revenuecat-and-infra-truth.md`.

### Highlights
- Mobile Duo Milestone B, builds 174 -> 346 (dev scheme, flag-dark): first Duo UI (picker, invite, joined pop-up, stop-sharing), a Home crash fix (unwrap the murror-api envelope), a stale-plan-card fix (focus refresh), device-feedback rounds (night-sky Settings card, no stock photo/butterfly, right-side stop-sharing, honest Manage Subscription), and finally real RevenueCat sandbox purchases (PR #778 + bump #779). Duo matcher fixed to the real custom-package shape; buy path wired purchase -> refresh -> invite. 53 tests green, sentinel review = SHIP.
- RevenueCat store side complete in project MurrorDev (projb32bb370): two Duo products attached to the Premium entitlement + custom packages in the current offering; matching App Store Connect subscriptions readied via the ASC API. Earlier RC work in the PROD project was the wrong project and is orphaned (a prod launch-gate risk noted below).
- Seat map corrected on the real dev backend (nsp-dev-murror, sfo2): was phantom ids (app.murror.mobile.duo.*), now app.murror.premium.duo.{monthly,yearly}:2; rolled out on image staging-effdd8a which carries the seat-count code.
- Infra correction: "Alpha" is the dev backend (dev.api.murror.app = nsp-dev-murror on DigitalOcean sfo2), NOT the retired self-managed sg3 cluster (nsp-alpha-murror / alpha.murror.api.ambercare.app, HTTP 000). The alpha-testing-guide skill doc still points at the dead env and misled a session; corrected across five memory files + a new reference_alpha_env_decoder.

### Operating notes
- RC project projb32bb370 is shared by dev AND staging; RC fans webhooks to every configured URL, so make webhook changes additive.
- OPEN blocker for a fully end-to-end purchase test: the RC webhook still points at the dead ambercare host, so real purchases reconcile nowhere until a dev.api.murror.app webhook is added (Astro-gated). The purchase + premium unlock work without it; only the invite/plan step needs it.
- Prod launch gate: the mobile Duo buy path is not env-gated and an orphaned Duo package sits in the live prod offering, so never flip ENABLE_TOGETHER_DUO in prod before the prod webhook->plan pipeline is verified.
- Production untouched throughout.

## 2026-07-13 (PDT): Connection Reflection orbital redesign, contacts-tab parity, unified colors

Redesigned the Connection Reflection detail page in the onboarding/home orbital visual language, iterated it through a device-feedback round, graduated it to staging, extended the same look to the contacts tab, and unified per-person colors app-wide. Fixed the Alpha avatar-revert bug. Full detail: `docs/plans/2026-07-13-connection-reflection-orbital-and-contacts-parity.md`.

### Highlights
- Connection Reflection detail redesign (mobile PR #675, flag `enable_connection_reflection_orbital`): two-node circular constellation hero replacing the random stock photo, one dark sky with dark-glass section cards, and a vertical "sharing journey" of past reflections you can tap to revisit. Flag-off byte-identical. Backend needed nothing (origin date already in the bundle). 2 adversarial reviews + compassion review; freemium star-gate finding fixed.
- v3 device-feedback round (PR #685): plain "sharing" language (no star/sky jargon), yearless dates + "You are here" on every journey stage, tappable-dot rings + chevron, a full-width "PAST SHARING · <date>" banner when a dot opens an old sharing, Dive Deeper moved to the page bottom, no text truncation.
- Graduated to staging (PR #687): resolver env default now includes staging (production stays gate-controlled). Staging build 310 cut for MurrorStg testers.
- Contacts tab orbital re-skin (PR #689, flag `enable_connections_tab_orbital`): same dark sky, dark-glass rows, per-person hue avatar ring, a "Since <month>" trace (origin date, never last-activity), and calm invitation copy (no dashed rejection box). Dev-only default. Flag-off byte-identical.
- Unified per-person color (PR #692): one canonical `personColor()` (reorder-stable hash-into-PAL); share sheet + journal picker migrated off the ordinal scheme, and the Home constellation realigned (it was doubly divergent and could even paint someone gold). Same person now reads the same color everywhere. 54 targeted tests green.
- Avatar-revert bug fixed: root-caused to the dev backend running a pre-#595 image returning un-versioned avatar URLs that immutable FastImage pinned to old pixels. Rolled nsp-dev-murror murror-api 0.211.0 -> 0.214.0-staging (code-only, no migrations), health green.
- Builds: Murror Alpha 173/176/177/178 (dev sequence, isolated worktrees) + staging 310. All appex-parity + baked-ENV verified before upload. Production untouched.

### Operating notes
- Build recipe: set build numbers AFTER provisioning completes (a concurrent yarn/pod-install reverts the pbxproj -> mismatched appex numbers -> App Store rejection); verify appex parity in the archive pre-upload; ExportOptions.plist is untracked, copy per worktree.
- Investigate in a lane-tip worktree, never the main checkout (was 35 commits stale mid-day and produced an invalid bug diagnosis on the first pass).
- Everything flag-dark on staging until an Astro Alpha device pass; VI/JA copy drafts owed his native pass.

## 2026-07-12 (PDT): Freemium locked-card gates, staging activation, TestFlight build 302

Extended the dark freemium soft-paywall into real feature gates, activated it on staging, and cut build 302. Full detail: `docs/plans/2026-07-12-freemium-locked-cards-staging-activation.md`.

### Highlights
- Locked-card gates (mobile PR #655): Connection Reflection, daily Research, and Your Day in Voice now frost + lock for free-tier users (card visible, detail blocked). Reuses the existing LockedCard, so all 7 runtime files are byte-identical no-ops until the paywall flag flips. Chat stays 1 session/day.
- Backend entitlement keys (murror-api #590/#591): connectionInsights + dailyResearch added, deployed 0.209.0 -> 0.210.0-staging, verified live in the container + Swagger DTO.
- Upgrade sheet redesign (mobile #652): "Talk more, learn more" + an honest cost line + a 5-item benefit checklist of the real gated features. Layout made clip-proof (bounded scroll copy area + pinned footer + device-aware heightFraction).
- viasr durability fix (#583): committed FREEMIUM__ENFORCEMENT_ENABLED + wind-down=4 into ci.yaml (staging-scoped) + values-beta.yaml so a future deploy cannot silently wipe them.
- Build 302 uploaded to TestFlight; the whole free-plan experience is live end-to-end on staging for device QA. Production untouched (frozen, flag off).

### Operating notes
- Grounding found only 2 of Astro's 5 candidate premium features were actually gated; the other 3 were free. We built the missing gates rather than advertise free features.
- The mobile archive stalled before export; the upload was finished manually (verify the "Uploaded" line, not just exit 0).
- Two gh self-merges (#591, #583) hit denied-but-executed permission-classifier anomalies, flagged to Astro.
- Flag-flip device QA still needed: clearHeight frost-line per card (96/120/150), sheet scroll on small phones across EN/VI/JA, redirect goBack targets.

## 2026-07-05 (PDT): Web mobile parity, default avatars, account controls, and billing portal

The last several days focused on bringing `apps/web-client` closer to mobile staging behavior, then hardening account and subscription flows on both staging and production. Full detail: `murror-web-codex/docs/plans/2026-07-05-web-parity-account-billing-rollup.md`.

### Highlights
- Web mobile parity refresh: song cards, challenge CTAs, AI Chat resume, quiz compare reveal, CRI detail, home copy, history detail naming, and For Us card behavior were aligned with mobile truth in targeted slices.
- AI Chat and retired journal cleanup: stale local drafts stopped coming back, prompt-started AI Chat now starts fresh, and old journaling state no longer leaks into the active chat surface.
- Home and card polish: streak copy and layout were simplified per feedback, duplicate voice story card behavior was removed, voice artwork moved toward mobile, and avatar cropping plus confusing card prompt copy were fixed.
- Onboarding profile: Date of Birth stayed for the under-16 safety requirement, copy now explains why, and three selectable butterfly placeholder avatars were added for users without uploaded photos.
- Settings and subscription: family plan was hidden, Manage Account now shows and edits the backend-synced username, cancel subscription works in-app on production, and active users can now open the standard billing portal to manage, resume, upgrade, or downgrade.

### Deploy notes
- Staging and production web deploys were completed for the subscription cancel and billing portal flows.
- Latest billing portal deploy anchors: staging image `staging-51bf67a9`, production image `prod-51bf67a9`, both health checked with HTTP 200.
- Production Helm still has a known image field ownership conflict; the working production path used `kubectl set image`.

### Operating notes
- The current `murror-web-codex` worktree is on `feat/pixel-scope-down-presignup`; confirm the active branch before making follow-up web-client changes.
- Token accounting for this writeup used the closest Claude transcript windows, but the implementation was done in Codex, so the numbers are best read as broad work-window volume rather than exact Codex-only effort.

## 2026-07-02 evening (PDT): QA260 -> build 261, then PRODUCTION PROMOTION (staging is now live)

Two things: the QA260 polish sprint (build 261), and the big one - promoting the validated staging codebase to LIVE production, zero downtime. Full detail: `docs/plans/2026-07-02-builds-259-261-and-production-promotion.md`.

### QA260 -> build 261
- Pending Reflection card: centered body + `connection_reflecting` background artwork + "Remind them" copy (centering was a scoped one-line bug).
- Share-confirm popup reframed as an invitation ("Invite {name} to reflect on this too?... Your full entry stays yours") + warmer icon (was a red exit-door).
- Quiz AFTER-flow built (before/during/after rule): anticipation -> no-rush wait -> "you both answered" card -> a COMPARE DETAIL PAGE (reuses the detail-page design system) with both users' answers side-by-side + insight; backend answer-payload privacy-gated to COMPLETED days.
- History loading card fix (MobX observer read the store only in effects, never render body, on a frozen tab -> never subscribed).
- PRs #525-#528 -> build 261 (canonical f66ef3e).

### PRODUCTION PROMOTION (get-prod-current on DOKS)
- CORRECTED premise: live prod is healthy on DOKS (nsp-prod-murror), not the dead Vietnam-k3s env the first scan named. "Move to DOKS" was already done.
- DIVERGENCE caught pre-write: `production` had 33 murror-api + 6 viasr commits applied DIRECTLY to prod (bypassing staging) - security + prod-data-loss fixes. A naive fast-forward would have dropped them.
- RECONCILIATION (Opus): staging is a strict SUPERSET (the QA sweep re-implemented every prod hotfix). Reconcile merges tree-identical to staging (0-file diff); DATA-LOSS guard + data-integrity + crisis fixes confirmed surviving; 626+137 tests pass.
- GATES: 9 migrations proven ADDITIVE (local Postgres dry-run); crisis eval CLEARED fresh 100% (the "0%" was a DNS artifact); crisis-gate fail-open HARDENING added (Statsig error never silently disables 988); restore point = daily backup 2026-07-02 21:35 UTC (PITR held).
- PROMOTED both (Opus): ff `production` -> reconcile; deployed via workflow_dispatch. murror-api migration Job Complete (9 additive, gated) -> 0.37.0, 131 migrations, RLS verified intact. viasr -> prod-9e9ccb2, Statsig+crisis healthy. ZERO downtime.
- FOLLOW-UPS: cronjob RBAC fixed (restored a MISSING prod daily-voice-summary CronJob); drift guard merged to staging (#548/#567, merge-tree-based, false-positive-free). OPEN: flip prod `shared_photos_enabled` Statsig gate ON; prod mobile build held; PITR deferred; rotate the pasted Supabase token.

### Lessons
- Verify LIVE topology before acting on an infra assessment (first scan named the dead cluster).
- `git rev-list staging..production` before promoting - production had 39 direct hotfixes.
- Post-merge-promotion, rev-list AND git cherry false-positive; `git merge-tree --write-tree staging production == staging^{tree}` is the accurate in-sync check.
- Safety feature-flags must fail-open to ON on ANY flag-service error (a Statsig 401 silently disabling 988 is the anti-pattern).

## 2026-07-02 (PDT): QA258 + QA259 sprints, quiz revamp, two P0 incidents -> build 260

Same-day QA loop: build-258 feedback (7 items, shipped build 259), build-259 feedback (5 items) plus a full quiz-experience revamp (shipped build 260), and two independently-resolved P0 incidents. Full detail: `docs/plans/2026-07-02-qa258-qa259-quiz-revamp-p0-incidents.md`.

### Highlights
- **QA258**: glass buttons reverted (SHA256-verified byte-identical to pre-glass); the actually-missed "Connection Streak" title surface found + benefit subtext added; unscalable persona chips removed from card titles (both journal + chat); eye-icon bottomsheet reworked from a horizontal slide to expand-in-place; History story-card now uses the same bundled image as Home (was a hardcoded gradient with no image); educational progress-bar copy; connections + button matched to the memory-photo + button.
- **P0 incident 1 - LLM fallback chain collapse**: 4-rung cascade (Claude truncated at a too-small token budget -> OpenAI wrongly skipped because a renamed status-page component made our health check fail closed -> Groq transiently open -> Gemini disabled). Fixed: status checks are now fail-open (a broken status page can never disable a healthy provider); Claude requests retry once at 4x budget on detected truncation.
- **P0 incident 2 - staging web/beta auth fully broken**: the rebuilt staging Supabase signs ES256 tokens; the platform relay in front of every Edge Function only accepted HS256, rejecting every web request before our own code (which handles both fine) ever ran. Fixed by deploying with the relay check disabled, after auditing all 28 deployable functions to confirm each authenticates in its own code. Also found + fixed a second, unrelated bug in the same investigation: mobile avatar upload rejected iOS camera photos (mislabeled HEIC).
- **QA259 + quiz revamp**: fixed a stale-cache bug where a submitted Connection Reflection's "waiting" card never appeared (traced to a query-key migration that missed 3 mutation hooks); added a share confirmation that never existed before completing a reflection from a connection; and rebuilt the quiz feature entirely - the backend always generated 3 real multiple-choice questions but mobile silently discarded 2 of them and routed the first into the plain reflection screen, which is why quizzes felt identical to reflections. Quiz is now its own card with its own in-chat answering experience, fully separate from the reflect-task streak cycle (a cycle-freeze bug was caught and fixed during the build). Quiz questions are now grounded in the users' actual journal/chat history and memories, gated by privacy and filtered for crisis content at the database level.
- **AI voice fixes**: explore-deeper questions flip from first-person ("I") back to second-person ("you") per direction; shared-reflection cards stop misgendering (pronoun-first resolution, gender only when explicitly known) and a latent crash on missing profile data is fixed. Both verified with live adversarial generations against staging (planted names, romantic-bait phrasing, empty profile rows) since the eval harness turned out to have a silent coverage gap for these suites (now flagged as a follow-up).

### Gotchas
- Query-key migrations must sweep every mutation hook that invalidates the old key, not just the screens reading the new one.
- A platform-level auth relay can reject requests before your own middleware runs; fixing the middleware does nothing if the infrastructure in front of it is stricter.
- Provider status-page health checks must fail open; a broken status page must never disable a healthy provider.
- HTTP 200 + empty structured output = token-budget truncation, not a real empty response.
- When two branches rewrite the same function for different reasons, prove the two behaviors compose before trusting a real merge, not just that the diff resolves.

## 2026-07-01 evening (PDT): QA257 sprint, streak redesign, journal/AI-chat unification -> build 258

Astro's build-257 QA produced 8 feedback items; all fixed/built, plus the streak UX redesign and the "journal and AI chat are ONE, clean this up" mandate - full parity audit + 8 violations fixed across 3 repos. Full detail: `docs/plans/2026-07-01-qa257-sprint-streak-redesign-journal-chat-parity.md`.

### Highlights
- **Explore-deeper perspective fix deployed** (viasr #553): questions are now perspective-neutral by contract (reader = "I", other person = "them"/"our connection", never a copied name or "your partner"); root cause was name-anchored prompting + empty staging profile names.
- **Bedtime story, actually fixed this time**: the cron fires at 3:30 UTC but evening-PST users reflect after it; now the story generates on the FIRST reflection of each day (on-demand path un-gated from milestones) + a 30h rolling cron window as backstop + once-per-day push dedupe.
- **Challenge card "disappearance"**: never left the DB; the paginated feed endpoint didn't fetch challenges (only /latest did). Also found all 4 expiry crons firing at :00 and exhausting the DB pool (challenge expiry had NEVER completed) - staggered.
- **Streak redesign**: read-path bucketing fixed (canonical streakDay), progress bar, goal-vs-earned butterfly placement corrected, rest-day grace (1 missed day rests, 2 resets), invitation-style evening nudge (Statsig-gated), "Connection Streak"/"History" renames.
- **Journal==AI-chat unification**: chat completions now send the artwork-ready push, sync keywords to recentInterests, and are counted by weekly themes + ping eligibility + notification input; the QA248 grounding fix finally applied to the chat screen; streak twin use-cases unified (-127 lines, original specs byte-unchanged as behavior lock). Astro ruled chat-joins-History-at-completion LEGIT (pinned in memory).
- **Build 258** shipped via the lane: 6 mobile branches merged in review-simulated order (zero conflicts, composed-tree tsc green), bump #514, uploaded ~23:32 PDT.

### Gotchas
- Fixed-time daily crons miss same-day activity created after they run; event-driven + rolling-window backstop is the durable shape.
- Suppression keys must carry the full identity of what they dedupe (memory-burst key lacked the sender; collapsed two recipients into one window).
- App-wide component restyles must respect caller overrides on every channel (bg prop, style bg, textColor).
- Deep-chat prompt rotation ships wired but dormant: the chat wrapup does not generate journaling questions yet (chip task_73dd67d2, needs prompt change + evals).

## 2026-07-01 (PDT): Single build lane, AI Chat memory + resume, Challenge v1, full card audit + P0 reaper fix, Smarter AI program -> build 257

Continuation of the card-system hardening entry below. Full detail: `docs/plans/2026-07-01-single-build-lane-ai-chat-memory-challenge-v1-card-audit.md`.

### Reflection-card + truncation fix (viasr #547)
- Root cause was NOT one bug: `min_items=3` on `prevQuestionAnswers` 422'd for users with 1-2 prior answers (not 0, not 3+); separately, `MAX_TOKENS=800` with no `stop_reason` check truncated replies mid-word. Both fixed + deployed; mobile got a graceful `REFLECTION_NOT_READY` state instead of a silent no-op.

### Single build lane (the recurring build-number collisions, finally fixed at the root)
- Build 253 was archived off-repo on another machine and never pushed, so the live TestFlight 253 lacked the challenge fix entirely. Rebuilt as 254 off canonical. Shipped `scripts/ios-next-build.sh` (computes next build = max(canonical, local)+1 across pbxproj + 4 Info.plists) + a documented single-build-lane / single-owner rule in CLAUDE.md and the cross-session web HANDOFF.md.

### AI Chat cross-session memory + resume (build 255)
- 3-repo "pre-fetch spine": murror-api reads cheap stored memory, hands viasr a capped prose string; viasr injects it and skips its own slow inline retrieval. Mobile "Continue this chat" resume affordance. Gates: memory eval 100%, TTFW **1747ms -> 884ms p50** (faster, not slower).

### Challenge v1: adaptive completion-mode CTA (build 256)
- Real-world challenges ("cook a meal together") no longer force a Journal CTA. `completionMode` (reflect/do_together/do_solo/quick_gesture) classified by viasr, carried through murror-api metadata, drives a one-tap "We did it"/"Mark as done" on mobile with an optional note. Softened progress dots, warmer copy.

### Full FOR US / Moments-to-Care card audit + P0 data-integrity fix
- Astro requested a full mechanics audit of both feed surfaces. Found: the takeaway reaper shipped THIS MORNING (#527) had inverted semantics - it was treating the legitimate "waiting for the human partner to reply" state as a stuck job, and had already destroyed 10 staging rows (dead, unactionable cards for both users). Fixed same day (#531): reaper now scans the true stuck window (COMPLETED + no insight yet), a data-repair migration restored all 10 rows, and the fix was proven live (the reaper's next tick left the restored rows untouched).
- Full P1/P2 hygiene pass followed: reaper pattern rolled out to reflection cards + individual reflections + a genuine journal text-gen stall; challenge/song/place expiry crons; `do_together` completion made atomic; song invite creation + realtime parity; silent-failure mutations now surface a gentle message; Home/FOR US card-rendering drift fixed (2 real gaps, NOT a full builder unification - that was evaluated and rejected as too risky).

### Smarter AI program: thinking-status + connection-aware intelligence + care-ping safety
- A second session TDD-built 7 branches (independently reviewed for correctness, privacy, and AI-copy compassion); this session merged in the required deploy order, ran the gates, and shipped. AI Chat now shows warm "thinking" status lines (crisis turns show none, verified live via SSE); care tips/insights/reflection cards/MTC chats receive privacy-gated relationship context (viewer-owned only, partner mood behind their own share-level); care pings never surface pure-heavy memories and go quiet on a heavy-mood day.
- Pre-merge review caught a real gap: the care-tips crisis filter let "suicidal" through at intensity <=7 or null intensity. Fixed same day before merge.
- Consolidated into **build 257** with all card-hygiene work - the largest single build of the day.

### Live perspective bug, in flight (viasr PR #553)
- Beta tester saw "Explore deeper" reflect questions written from the WRONG person's perspective (asking her how to support herself). Root cause: name-based perspective anchoring + empty staging profile names. Fix: perspective-neutral, reader-first-person prompt contract ("them"/"our connection", never "your partner", never a name copied from the insight). Awaiting deploy sign-off.

### Gotchas
- Verify state semantics before writing ANY reaper - a human-wait state (PENDING) is not a stuck-job state. Applied prospectively twice more the same session (declined to build a specified artwork reaper after proving the wedge impossible; declined to heal seed data into COMPLETED without an exact atomic-write fingerprint).
- Mobile's real-time transport is Supabase Realtime, not the NestJS Socket.IO gateway - confirmed against the movie-invite precedent before wiring new broadcasts.
- "Your partner" is the wrong generic term for the other person in a connection (friends/family too) - use "your connection" / "them".

## 2026-06-30 evening -> 07-01 (PDT): Card system hardening (migration drift, guards, reapers) + curation design + builds 250/251

Continuation of QA248. More card QA surfaced systemic backend gaps, all fixed + deployed to staging. Full detail: `docs/plans/2026-07-01-card-system-hardening-and-curation.md`.

### Backend (staging)
- viasr #544 (dive-deeper single-call + model rebalance + reflection-card system prompt), #545 (V20 user_profile partial-unique-index repair + universal `safe_validate_suggestion` guard against the provider-failure fallback-string crash), #546 (V21 user_persona column types -> learned-persona writes now succeed + below-baseline hot indexes).
- murror-api #527 (takeaway stuck-row reaper, mark-FAILED-only, 5-min cron), #528 (care notification default-on: TWO enable_notification columns - app wrote the murror `User` one, viasr read the legacy `public.user_profiles` one; set default true on both + backfilled 143 users, verified 143/143).

### Mobile
- Build 250: self-stopping Home feed poll + dead-code. Build 251: Challenge card fix (tap -> details popup, body truncated, removed wrong Dive-deeper->CRI, receiver-only Accept; no Decline per Astro, X dismisses).

### Audits + design
- Card-health audit: 11/14 card types healthy on staging; Takeaway (fixed #527), Challenge (fixed b251), Daily prompt (stale 8 days, kept OFF per Astro).
- "When to show what" curation panel (Heart/Prism/North/Iris): consensus = ONE hero card (core reflection always shown), everything else EARNED via tiers + state + cooldowns, silence/empty as a feature, never manufacture filler. Build path (Iris): pure `curateCards()` behind a `FEED_CURATION` Statsig flag (flag-off = today), Stage 1 allowlist delivers "suggestions on / daily-prompt off / challenge simplified" now. NOT built - awaiting Astro's direction on the forks.

### Gotchas
- Flyway baseline-at-V15 means V1-V14 never ran (V7 index + V4 persona types silently missing on staging). Audited V1-V14; only user_persona types + hot indexes (V21) were genuine gaps, rest obsolete.
- The provider-failure fallback string reaching an unguarded `model_validate_json` crashes the whole insight; guard centrally with a detectable signal.
- Two `enable_notification` columns (app-facing vs viasr-read); fixing one alone would not work.

## 2026-06-30 (PDT): QA248 fix sprint (build 248 review) -> build 249/250 + 5 backend PRs

Driver: Astro. Build 248 QA = 6 issues; live-staging-DB forensics corrected three root causes and surfaced two more bugs (notification spam, bedtime not generating). Shipped build 249 to TestFlight + five backend PRs to staging; build 250 + card optimizations followed. Full detail: `docs/plans/2026-06-30-qa248-sprint.md` + `docs/card-mechanics-audit-2026-06-30.md`.

### Mobile (build 249; 250 in progress)
- #1 blank prompt pills: removed shake-to-switch (it flipped any card into the prompt view; only surfaced on real devices with an accelerometer). Question view now opens only via the Dive button.
- #3 voice button un-froze (setLoading moved out of the 1s deferred stop). #4 JED persona on all 3 sections (grounding fallback). #5 "they" -> "your connection" (en/vi/ja). Voice limit -> 120s.
- Build 250: self-stopping Home feed poll + dead-code removal.

### Backend (staging only; alpha HELD per Astro until beta validated)
- murror-api #525: #2A health-check regeneration loop (thread dayId so findMissingInsights clears), #2B reflected-today UTC filter, #1 explore-deeper guard. #526: disabled the autoFixMissingInsights cron + suppressed pushes for system-generated insights + closed the normal-path dayId gap.
- viasr #542/#543/#544: explore-deeper empty/meta guard; eval() removal + connection-insight meta guard + deep-chat nightly bedtime; dive-deeper single-call + model rebalance + reflection-card system prompt.

### Operating notes / gotchas
- #2 daily-limit block was a 30-min cron regeneration loop (generated insights had dayId=NULL so the day never cleared findMissingInsights), not stuck rows; the same loop fired the spurious "Khanh reflected" push each tick. Only root-caused via the live staging DB.
- #6 birth time persists fine (was never entered before, not a save bug). Bedtime needed the deep-chat cohort merged into the nightly cron.
- Journal + deep-chat are ONE (Astro directive): any feature/eligibility keyed on one must apply to both.
- Session teardowns repeatedly killed background agents mid-run; preserve partial work as WIP commits immediately. A background task hijacked the main MurrorMobile worktree onto a chore branch with cross-session uncommitted files; stashed them to build 250 cleanly (stash: "cross-session wip relationship files").

## 2026-06-28 to 06-30 (PDT): Deep-chat / reflection UX feedback loop (TestFlight 244-247) + AI emotional-safety backend

Driver: Astro. Rapid on-device QA loops on the deep-chat / reflection experience: Astro tested each staging TestFlight build and sent batches of findings (with screenshots); each was root-caused (often via parallel specialist agents), fixed, reviewed, and rolled into the next build (244 through 247). Four backend PRs (3 viasr-api, 1 murror-api) shipped to staging in parallel.

### Mobile (MurrorMobile, builds 244-247)
- QA243 (244): LockIcon viewBox (was clipping); Journal rail refetch-on-focus so saved entries appear without manual refresh; birth time survives reinstall (rehydrate onboarding store from server /me, never clobbering in-progress input).
- Deep-chat copy/UX (245-247): connection-picker section title; ALL reflect prompts in second person ("you" not "I", en/vi; ja already second-person); dual privacy copy (original encryption line + the new between-you-and-Murror line) with "Learn more" rewired from CBT to a privacy popup; council attribution dedup; save-draft contrast; reflection-card prompt-subtext removed (was clipping under the CTA); For-Us carousel loop disabled + the care-tip "Reflect" no longer collapses the carousel; CRI "Dive deeper" spinner; tab-switch white-flash killed (neutralBlack scene/card backgrounds); voice Done waits 1s so a trailing word is not clipped; persona attribution confirmed on all 3 summary sections.

### Backend (staging deploys)
- viasr-api: reflection-card AI meta-leak fix (empty deep_chat summary made the model reply conversationally and that leaked to the receiver's card; input + output guards + warm fallback) [#537]; mood-aware daily care notifications (reads the daily mood check-in, 24h recency, mood-as-floor never crisis-grade, tunes cadence + tone, failure-isolated + fallback bank) [#538]; second-person AI journaling/reflection prompts [#539].
- murror-api: regenerate legacy connection reflections with empty quote/insight so the CRI "Quote" + "What both can do" sections render [#522].

### Operating notes / gotchas
- Background agents that die mid-task can leave PARTIALLY committed work; build 245/246 shipped only part of a copy batch because an agent process exited and I built on top without verifying each item. Fix: require every agent to commit + report its hash, and verify the hash AND the actual strings/behavior landed before cutting a build. 247 was verified item-by-item.
- The reflection-card meta-leak was an emotional-safety bug on the empty-data path (new connections, the most fragile moment). Guard empty inputs AND validate model output before it reaches a human.
- Japanese second-person: do not mechanically add explicit pronouns; the language already reads second-person and explicit pronouns feel clinical.

### Verification
- Builds 244-247 archived + uploaded (app + extension build numbers verified equal each time). Build 247 self-reviewed after the review agent died (tsc 0 new errors, 3 locales parse, no first-person left, gating + carousel + nav props confirmed). All 4 backend PRs: passing CI + deploy success; unit tests + compassion-review 10/10 on the two prompt changes.

Doc: docs/plans/2026-06-30-deepchat-reflection-ux-and-ai-safety-builds-244-247.md

## 2026-06-24 to 06-28 (PDT): Voice/Bedtime Story across the stack, mobile polish batch (TestFlight 236-243), Claude/Codex two-agent model

Driver: Astro. Two-agent sprint: Claude on MurrorMobile + murror-api (+ this docs repo), Codex on the murror-platform web client, coordinated via a shared HANDOFF.md operating model (Claude owns mobile truth, Codex owns web implementation, API Lock gates shared contracts). Mobile shipped to staging TestFlight builds 236 through 243; murror-api shipped 4 PRs to staging; the web client reached voice/bedtime + Moments + For Us parity.

### Backend (murror-api, PRs to staging)
- Daily voice summary is a first-class diary entry (#518); generated same-day on a streak milestone (#520); takeaway "poke" to remind the receiver to reflect back (#519); memories photo uploads allowed through ingress (proxy-body-size 50m); song-invite accept/cancel (#521, additive migration, merged + deployed to staging, API healthy).

### Mobile (MurrorMobile, builds 236-243)
- Voice/Bedtime Story: render voice_summary entries as a playable bedtime card in the home Journal (was a plain card opening the wrong screen); redesigned with 10 bundled night-sky watercolor backgrounds (date-rotated, FastImage cover, serif title, 260x280 height parity, fixed clipped moon, legibility scrim).
- Glass toast (frosted pill, web parity); retired the butterfly shimmer loader for a spinner everywhere; voice player now follows the highlighted paragraph + thicker, colorful, scrubbable progress bar (added seek()); Get Help localized JA/VI wired to app language; Thanh Loc persona shown only to Vietnamese users; song-invite accept/cancel receiver UI; fixed a pending challenge mislabeled "NEW".
- Earlier in the window: Moments to Care rework + slide-to-next + streak milestone wrap-up; takeaway poke UI; relationship-type + privacy port to match web; QA batches 2 and 3.

### Web (murror-platform, Codex, feat/web-app-from-mobile)
- For Us parity + playable voice/bedtime cards + takeaway songs + Moments parity; toast glass-pill styling + brand alignment; profile loading/date-picker + onboarding signup polish; TikTok pixel + commerce funnel events.

### Operating notes / gotchas
- iOS build number lives in BOTH project.pbxproj (CURRENT_PROJECT_VERSION, 24 occurrences) AND the per-scheme *-Info.plist CFBundleVersion (staging app reads the plist; OneSignal extension reads pbxproj). Bump BOTH with surgical sed/perl on the plist (not PlistBuddy Set, which reformats). Caught a 240/241 app-vs-extension mismatch. See memory ios_build_number_mechanism.md; an ios-build.md runbook fix is filed.
- FastImage accepts a local require() webp source; bedtime backgrounds bundled locally (not Supabase) since the app builds artwork URLs from the env-specific Config.SUPABASE_URL.
- song-invite migration is safe because the new enum values are never used in-file (avoids the Postgres "unsafe use of new enum value" transaction error).

### Verification
- Builds 236-243 archived + uploaded (app + extension build numbers verified equal before each upload). song-invite PR #521 deployed to staging (CI success, API 200), with Sentinel + Iris pre-build reviews on the final batch.

Doc: docs/plans/2026-06-28-bedtime-voice-story-and-mobile-batch-builds-236-243.md

## 2026-06-11 (PDT) — Staging web app: the log view becomes deep chat, 5 QA batches, a backend emotion fix, the voice diary ported, and a persona showcase world

Driver: Astro — iterative QA on the staging web app (`apps/web-client`, staging.app.murror.app). Astro tested in rounds and sent findings with screenshots; each batch was root-caused against the MOBILE source (MurrorMobile is always ground truth), fixed, gate-checked (tsc + full vitest), harness-verified end-to-end against live staging, deployed (CI image -> helm, nsp-staging-murror), and logged (PARITY_LOOP_LOG.md + Notion Engineering Log). Staging only; production untouched. 7 web deploys (helm rev 78-84), 1 viasr backend PR, 4 showcase accounts.

### The headline arc: the journal writer IS the deep chat now (mobile-exact)
1. **Conversation mode v1** (`staging-09ec8b2`) — Submit sends the entry into the AI conversation; rainbow streaming reply; Save completes through the diary pipeline. Shared settle-hold extracted to `use-streaming-settle` (deep-chat-page refactored onto it).
2. **Astro: "I still see journaling screen" -> fused screen** (`staging-947a673`) — read mobile's add-log-screen properly: there is NO mode swap. Rebuilt as ONE surface: SEND arrow visible from the start (mobile InputAccessoryView), bubbles grow above the persistent textarea, header Save = mobile's tick (plain journal if you never chatted / complete-conversation if you did).
3. **Calm pass** (`staging-54f64cc`) — streaming 15->90ms/word (mobile component default is 60), all card chrome removed (only the trust pill remains boxed, like mobile), mic+send as mobile's exact pink/blue radial-gradient circles in a frosted accessory pill, bubbles 13px.
4. **Polish batch 7** (`staging-70ad660`) — bubble color pinned to the reply's slot (was flipping twice at stream->settle because it derived from messages.length), MurrorIconCircle avatar (exact mobile SVG: white circle/black ring/4-color butterfly) on bubbles + typing indicator, prompt auto-fetches on open + regenerate, EmotionalJourneySection wired on conversation details, header chips to ~80% white / dark glass (readable over artwork heroes).
5. **Batch 8** (`staging-45fda74`) — voice input continuous + error toasts (was single-shot + silent), invitation dialog opaque (was 10% glass mud), user messages render as PLAIN PAGE TEXT like mobile (no bubble/timestamp - the real spacing fix), header non-sticky, **daily voice diary PORTED to web** (was never built: VoiceSummary entity + getVoiceSummary query + moon card playing narration over the bedtime piano; found+fixed diary-api's split-base routing /v1/connections/* to the dead legacy Supabase host; today-or-yesterday date logic).
6. **Batch 9** (helm rev 84) — drafts restored (Draft button; X = save-and-leave; restore on return), entrance fades (writer text + Reflection sections), consistency pass (Knowledge -> warm canvas + renamed "Research" + non-sticky; Diary/Reflection headers aligned).

### Cross-cutting fixes
- **Light-theme contrast sweep** (batch 5, `staging-09ec8b2`+) — built a runtime WCAG scanner (walks every text node, reads the actual painted layer stack via elementsFromPoint, canvas-resolves Tailwind v4's oklch/oklab colors). Confirmed-broken + fixed: settings account form (white labels + invisible typed text), settings premium card, subscription error/loading, home cards (pinned dark - home ignores the theme like mobile; shared cards gained an `appearance` prop), shell chrome on always-dark routes. Light + dark scans clean on 11 routes. Scanner lessons saved to agent memory.
- **Cold-load routing fix** (`staging-c9f73a8`) — refreshing/deep-linking any inner page bounced to home: one-render race where auth resolves but the profile query hasn't started (RTK initiates in an effect), guard read "uninitialized" as "not onboarded" -> /onboarding -> /. Both profile guards now hold for data-or-error. TDD: regression spec failed on old code, green after; 449/449.
- **Home background pixelation** — daily watercolor confined to the centered max-w-2xl column (1206px asset downscales instead of stretching) with a radial mask into the dark gradient.

### Backend: conversation emotion gap (viasr-api #446, merged + auto-deployed)
Completed conversations got empty emotionArc while plain journals were fully analyzed - breaking "emotion detection on every journal entry" for the type the web log flow now creates. Root cause traced 3 layers: murror-api's completion handler accepts+persists the fields and the web renders them, but viasr's rabbitmq_deep_chat completion flow never computed them (the journal pipeline's `conversation_emotion_arc` function - literally named for this - was never wired in). Fix: detect_emotions() in PARALLEL with summary (asyncio.gather - zero added latency), non-fatal, producer carries emotionArc/emotionJourneyText; payload regression tests. **E2E proof**: fresh web conversation -> arc ["anxious","reflective"] + journey on the FIRST poll -> Emotional Journey renders on the detail. Pre-fix conversations keep empty arcs (no backfill).

### Persona showcase world (for website + ads)
4 staging accounts built through the REAL product APIs (no DB stuffing): Maya Chen (24, marketing), Jaylen Brooks (26, engineer), Ava Reyes (21, student), Noor Rahman (23, nurse) - `*.murror@example.com` / `MurrorPersona2026!`. Higgsfield SOUL portrait avatars (512px via /me/avatar), full onboarding (POST /onboarding/complete), 4-edge friend circle (invitation-link flow), 9 hand-written journals with deliberate emotional arcs, ALL FOUR edges with completed takeaway-reflection loops -> INSIGHT_READY shared insights (titled cards + song suggestions, e.g. "Showing Up for Each Other" + "Lean on Me"), 2 movie invites (Past Lives PENDING for the CTA state, The Farewell ACCEPTED). Mini Challenge waits on the next connections-cron cycle (challenges FK-validate against cron-generated connection insights).

### Verification discipline
Every batch: tsc + full vitest (440->449 tests grew across the session) -> vite build -> harness E2E against live staging (real sockets, real pipelines) -> CI image -> helm -> live-chunk verification (grep the deployed JS for the new code markers) -> PARITY_LOOP_LOG + Notion. Hidden-tab artifacts (framer freezes, timer clamping, cold-load auth races) documented and worked around rather than trusted.

### Engineering lessons (also in agent memory)
- **Tailwind v4 computed colors are oklch/oklab** — regex hex/rgb parsers fail silently BOTH ways (false positives AND skipped elements). Canvas fillStyle -> getImageData resolves any CSS color exactly.
- **RTK Query skip-flip gap** — when `skip` flips false, the fetch starts in an EFFECT; the same render reports isLoading:false with no data. Guards must treat "no data AND no error" as loading.
- **diary-api split base** — endpoints default to the LEGACY Supabase host unless allowlisted to murror-api; new /v1 endpoints must be added to `isBackendEndpoint` or they silently die.
- **Takeaways/invites use MODERN connection ids** (cuid), not the legacy relationshipId (uuid) — match partners via connectionDetails userIds. Movie invites need a takeawayId/insightId anchor; challenges FK-validate insightId against cron-generated connection_insights.
- **Profile rows exist only after onboarding/complete**; /me/avatar is PNG/JPEG-only and the ingress 413s over ~1MB (512px PNGs fit).

---


## 2026-06-10/11 (PDT) — murror.app experience overhaul: content engine, cinematic film homepage, living library, trilingual launch

Driver: Astro — build the SEO content engine, then turn the homepage into a cinematic scroll experience (hubtown.co.in reference), the resources hub into a phantom.land-style draggable field, and finally take the whole site trilingual (EN/VI/JA) with automatic language + location routing. All in `apps/marketing` (`murror-platform`, branch `feat/marketing-site`), deployed via wrangler to Cloudflare Pages. Backend/mobile untouched. **Engineering reference for all of these systems now lives at `apps/marketing/README.md`.**

### Shipped & LIVE on murror.app (9 ships, ~8 production deploys)
1. **/resources content hub (EN)** — content engine (md loader, 3 pillars) + 9 articles, Article/Breadcrumb/FAQPage JSON-LD, canonicals, crisis note (988), immutable `_next/static` caching, hero `fetchPriority`. Merge `1bac76b`+`ba0ffeb`.
2. **Vietnamese mirror /vi/resources** — locale engine (STRINGS map, shared renderers), 9 VI twins (same slugs), EN|VI toggle, bidirectional hreflang + x-default, VI crisis note (115), +10 sitemap URLs. Merge `45d054b`.
3. **AI-journaling reframe + verified research** — all 18 articles rewritten around the AI-companion thesis with **13 verified citations** (PubMed/JMIR/Nature/SAGE; adversarial fact-check fixed a ratio-vs-proportion misread before ship) + 5 Higgsfield butterfly-motif illustrations per article (no in-image text — EN/VI share assets). Merge `503ce56`. Editorial serif titles + brand-tint cards on the hub followed (`3a774ee`…`0550c11`).
4. **Daily article autopilot** — scheduled task (7am PT) drafts one bilingual article/day into the same content system (slug-inventory → research → EN+VI → Higgsfield illustration → cwebp). First scheduled run produced `gratitude-journaling` (EN+VI) on its content branch.
5. **Cinematic scroll-film homepage** — 7 Higgsfield city-journey scenes (kling3_0 pro 10s → ByteDance 4K upscale → 240 webp frames/scene @24fps; 1920px desktop ~136MB lazy + 960px mobile set ~61MB), canvas player with frame cross-blending, **autoplaying scenes where scroll only turns the page**, blur-materializing copy that holds until the next gesture, sparkle-star/grain/vignette overlays + dark wash, sticky transparent nav, mobile beat mode (long sections as sub-slides), bold-sans stat numerals. Pivot story: started as three.js forest world (`d16a865`…`a0c7374`), Astro redirected to real film. Merge `2f42ad1` + `14d0fca`.
6. **Phantom-style resources field** — the article library as a draggable infinite card plane above the classic list: real DOM cards (illustration + pillar tint + serif title), rAF drag/momentum/wrap, ambient drift, perspective dome bend, full-opacity cards with a 180px edge fade band. Reduced-motion/crawlers keep the canonical list (zero SEO impact). Merge `187b0be`.
7. **Page-turn scroll turnstile + 3:3 features** — wheel/touch/keys no longer move the page; they request page turns (gsap scrollTo between act/beat stops). One gesture = exactly one page; momentum tails recognized via 300ms gesture-gap; mid-flight gestures swallowed; a fresh post-arrival gesture queues exactly ONE turn (fixes "feels stuck" without allowing skips). Features grid rewrapped to even 3:3 columns on desktop (was 4:2). Merge `7bcd3a6`.

8. **Chapter rail nav + a critical crash fix** — vertical left rail (xl+) replacing the top nav links: Why Murror / Features / How it works / AI companion / Resources, click-to-glide via the turnstile machinery, scrollspy highlight (theater broadcasts the act on stage), `mix-blend-difference` so labels auto-invert on any background. Shipped with a **critical fix**: ScrollTrigger pin-spacers re-parent the act sections, and React route changes removed DOM before passive cleanups ran → `removeChild` crash → blank site on ANY internal link away from the homepage (live since the film homepage; surfaced as "support is not working"). Theater teardown moved to a mutation-phase layout effect; Theater pinned above the acts in JSX. Merge `81f5b30`.

9. **Trilingual site: English + Vietnamese + Japanese, with language & location routing** — 9 JA articles (translated by 9 parallel agents), full VI+JA homepages (film copy via a locale dictionary, shared `HomeExperience`), locale-aware header/footer/rail, EN|VI|JA switcher, JA crisis line, hreflang across all 42 pages (sitemap 36 URLs). Routing is two-layer: a pre-paint client script (browser language) plus a Cloudflare Pages `_worker.js` scoped by `_routes.json` to the EN entry paths (location: VN→vi, JP→ja; cookie choice > browser vi/ja > geo > en; bots and assets never redirected). Verified: 13/13 browser-language puppeteer checks, 11 live-edge checks, 10/10 unit tests on the shipped worker with mocked countries. Mid-publish race caught: origin gained the Meta Pixel (#52) during the work — merged and redeployed so production has both. Merge `a87e740`.

### Verification
- **Turnstile gauntlet on LIVE murror.app: 12/12 green** — violent flick = 1 page, continuous grind = 1 page, mid-flight swallowed, post-arrival queues 1, up/keyboard correct, 3:3 columns measured, mobile beats + queue, zero JS errors (desktop + mobile).
- **Rail + navigation: 13/13** (section glides land pixel-perfect with the right highlight, scrollspy tracks the wheel, cross-page jumps, crash-path round trips clean) and **overlap re-scan at 1366/1440/1512: zero text under the rail**.
- **Trilingual: 13/13 puppeteer** (overridden `navigator.languages` — JA/VI/EN routing, mixed preferences, remembered choice, lang attributes), **11 live-edge checks on production** (VI/JA browsers 302 to twins; Googlebot, images, film frames untouched; Meta Pixel intact), **10/10 unit tests on the shipped `_worker.js`** with mocked `request.cf.country`.
- Every deploy live-verified by curl sweep: all pages 200, sitemap correct, prior features intact.

### Engineering lessons (also in agent memory)
- **GSAP pins vs React teardown**: ScrollTrigger pin-spacers re-parent DOM; route changes remove DOM before passive `useEffect` cleanups → `removeChild` crash → whole app unmounts. Teardown must be a (mutation-phase) layout effect, and the Theater component must precede the pinned sections in JSX.
- **Cloudflare Pages upload throttle**: bulk frame uploads EPIPE-fail; fix = paced half-scene deploys (~120 files, 150-220s gaps). Production deploys then reuse preview-warmed hashes (3,636 files in 3.5s).
- **Pages `_worker.js` must be scoped**: `_routes.json` limiting invocation to `/` + `/resources/*` keeps the film's thousands of asset requests off the 100k/day free-tier Functions quota. In-worker guards: never redirect bots, non-GET, or extension paths (article images live under `/resources/*.webp`).
- **Hidden tabs freeze animation**: scroll/animation behavior must be verified via puppeteer-core headless (rAF runs; `page.mouse.wheel` sends trusted events); the local preview tab can't. Production homepage needs `waitUntil: domcontentloaded` (film frames never go network-idle on cold cache). Prefer full-viewport screenshots (`clip` flakes in headless).
- **Gauntlet design**: assert landings relative to the previous landing (absolute indices cascade one failure into five); CDP round-trip latency stretches synthetic burst timing; localStorage persists across pages in one puppeteer browser (a stored-preference test can poison the next test — use fresh contexts).
- **Shared branch hygiene**: fetch origin before deploying — the Meta Pixel (#52) landed mid-rollout and one production deploy briefly shipped without it.

### Open / follow-ups
- **Astro: review the Vietnamese homepage copy natively** (murror.app/vi/ — my translation); commission a native Japanese pass before any serious JP marketing push.
- Submit sitemap.xml to Google Search Console (needs Astro's Google login) — now carries all 3 locales.
- PR #48 (`feat/marketing-site` → dev) repo hygiene; `fix/insights-seo` + viasr-api `fix/ai-docs-noindex` still awaiting their PRs/deploys.
- VI title capitalization normalization (pending Astro's call); cancel Squarespace site plan (site live + stable since 06-05).

---

## 2026-06-05 (PDT) — murror.app marketing launch: Cloudflare cutover + SEO + email fix

Driver: Astro — "create a new website for murror.app without Squarespace, save costs," then take it live and harden discovery + email. Marketing site is the new `apps/marketing` static app (Next.js `output: export`) in `murror-platform`, deployed to **Cloudflare Pages (free)**. No backend/mobile touched (continue-never-rebuild; `apps/web` SSR routes left alone).

### Shipped & LIVE on murror.app
1. **DNS cutover off Squarespace → Cloudflare** — full nameserver move (`hank` / `heather.ns.cloudflare.com`). Verified the entire zone from Cloudflare's NS *before* flipping the registrar. Email preserved 100% (Google Workspace MX ×5 + DKIM + DMARC untouched); live subdomains preserved (api / insights / track). Custom domains `murror.app` + `www` attached to the `murror` Pages project; apex + www resolve to Cloudflare anycast, valid SSL, HTTP 200.
2. **SEO foundation** (`feat/marketing-site`, commit **c27926c**, 14 files, +191/-2) — `robots.ts` + `sitemap.ts` (`force-static` for static export), JSON-LD (Organization + WebSite site-wide, MobileApplication on home, FAQPage on support), `og.png` 1200×630 built via ffmpeg (dreamy hero + white wordmark — fixes the broken social card), canonical URLs on all 4 pages, `manifest.ts` + apple-touch-icon + 192/512 icons + theme-color. Build green, types green across all 10 packages. Deployed to Pages production (`--branch=main`); verified live: JSON-LD inlined, robots/sitemap/og all HTTP 200.
3. **Email deliverability fix** — apex SPF was **12 DNS lookups** (over the hard limit of 10 → PermError → SPF failing) because `mailgun.org` was included twice (directly + nested via `spf.onesignal.email`). Trimmed apex to `v=spf1 include:_spf.google.com ~all` (**1 lookup**; Astro confirmed Google Workspace is the only apex sender — app emails ride subdomains `email.` / `mail.` which keep their own SPF). DKIM (google) + DMARC (`p=quarantine`) already healthy. **mail-tester.com = 10/10.**

### Side quest
- **`/remote-control` "did nothing"** — root cause: shell alias `claude='claude --dangerously-skip-permissions'` injected a flag *before* the subcommand, breaking arg parse (`Unknown argument: remote-control`). Fix: use the flag form `claude --remote-control` (alias-friendly, order-independent). CLI v2.1.142; version + auth were both fine.

### Open / follow-ups (all optional, none blocking)
- Submit `sitemap.xml` to Google Search Console (needs Astro's Google login + domain verify; TXT verify record then dig-confirm).
- DNS housekeeping: delete junk `test.murror.app "test2"` TXT; remove proxied `_domainconnect` Squarespace-leftover CNAME.
- Decide AI-bot policy in Cloudflare managed robots.txt (currently blocks GPTBot / ClaudeBot / Google-Extended; search crawlers allowed).
- Rotate DB passwords baked into `~/.claude/settings.json` allow-list (surfaced during the remote-control probe).
- Push `feat/marketing-site` + open PR (deploys are direct `wrangler` uploads from `out/`; nothing pushed to GitHub yet — ~18 local commits).
- Lock loneliness-stat citations before any public push (footnote still "to be finalized").
- Cancel Squarespace site plan after a few days verified live (keep the domain registration).

### Cost outcome
Squarespace marketing hosting (~$16–49/mo) → Cloudflare Pages **$0/mo**.

---

## 2026-06-05/06 (PDT) — ambercare.app → murror.app migration + notifications audit

Driver: Astro — "centralize everything to murror.app, retire ambercare.app." Both zones are in one Cloudflare account (`astrovinh@gmail.com`). Design + implementation plans + kill-list committed under `docs/plans/`.

### Backend migration — DONE (zero user impact)
1. **Dead-DNS cleanup** — deleted **44** dead ambercare.app records (58 → 14): abandoned multi-region/KOL, the whole unused `murror-platform` suite (auth/admin/web/statistic/notifications — live auth=Supabase, push=OneSignal), VN/sg3/OVH infra, wildcards, 2 typos, 9 stale ACME. Prod health green after.
2. **Phase 2 twins** — `api.murror.app` + `ai.murror.app` → do-sfo2 `159.89.222.109` (DNS-only); added to the live prod ingresses (additive `kubectl patch`); cert-manager `letsencrypt-prod` auto-issued certs (HTTP-01). Parity verified (identical 200s; originals untouched). Precedent: `insights.murror.app` already ran this way.
3. **Apex redirect** — Cloudflare Redirect Rule 301s `ambercare.app` + `www` → `murror.app` (path+query preserved); live API/AI/files subdomains unaffected.

### The retirement gate (hard constraint)
`MurrorMobile/.env.production` hardcodes `murror.api.ambercare.app` (API) + `files.ambercare.app` (emergency-contacts). **No remote-config lever** (checked — `BASE_API_URL` is compiled in). So retiring the domain REQUIRES a mobile build flipping 2 lines to murror.app, then old-app age-out. No backend-only path. The 2-line change rides the next app release.

### Remaining (all gated to Astro): files.murror.app R2 custom-domain click · mobile `.env.production` (next release) · Phase 6 dev box · then retire ambercare.app.

### Notifications audit — push is HEALTHY
Confirmed live: daily push nudges WORK on prod (in-app **APScheduler** → `push_notification_task` → OneSignal, personalized EN+VI, idempotent — NOT beat). Missing `murror-ai-beat` only affects beat features (voice summaries, weekly reflections, theme aggregation, callback-pings) — **all deferred to 2.0 by Astro**, so prod having no beat is intentional (not Bug H).

### Live image state (end of session)
- `murror-api` = **`0.34.3`** · `murror-ai` = `main-5f350b4` (unchanged)
- ambercare.app: 14 records (down from 58); apex on murror.app; api/ai twins live

---

## 2026-06-05 (PDT) — Stuck-article cost fix + backlog purge

Driver: Astro flagged daily-article OpenAI cost bleed + "remove the stuck articles, they're outdated." All work on **live prod = do-sfo2** (`nsp-prod-murror`).

### Root cause
`ArticlePublishRetryService` (cron, every 5 min) re-published every `PENDING` article older than 10 min with **no upper age bound** — the historical stuck backlog (oldest 2026-02-13) was re-sent to OpenAI every 5 min = ongoing spend on stale content. The legacy `error:{not:null}` filter also hid published-but-never-completed articles (a successful re-publish clears `error`, so they stayed PENDING forever).

### Shipped to LIVE prod (do-sfo2)
1. **Code guard** (murror PR #409, image **0.34.2**) — mark `PENDING` FAILED when older than 2 days OR retries exhausted; bound recovery to `requestedAt` within the last 2 days; dropped `error:{not:null}`. Build green, scheduler specs 37/37. Deployed via `deploy-doks` image-only (production "Deploy" workflow still hits the wrong US cluster — Landmine A — so bypassed). Pod `murror-api-684d5dd9b8-4w6nd` healthy on `0.34.2`.
2. **One-time backlog purge** (Astro-approved, scoped `deleteMany` via pod Prisma) — deleted **897** non-completed rows (98 PROCESSING + 799 FAILED). Verified pre-delete they held ZERO content/keywords — empty transport/failure shells, not salvageable AI output (Astro asked if reusable as research data; answer: no, the real signal is in source `public.journals`/`public.deep_chat`, kept forever). After: **1498 COMPLETED only**, stable on re-query.

### Useful artifact: FAILED error-reason breakdown
609 `No AI completion received after max retries` (RMQ completion-loop break) · 150 `HTTP publish failed: fetch failed` · 23 retry/`Connection lost` · 4 OpenAI `401` · 2 `psycopg2 UndefinedFunction/connection`. The 609 ties to the known `ai.mood.updated`-on-article-queue mis-routing follow-up.

### Result
✅ Cost bleed stopped (0 PENDING = nothing to re-publish), backlog cleared, guard in place so it cannot recur. Logged to Notion Engineering Log + memory `project_activity_based_articles.md`.

### Then: off-cluster scheduler-leadership hijack (vps40) — root cause of the whole thing
Verifying the retry guard revealed it was **dormant**: the article-scheduler leader (DB-row lock `scheduler_lock`, 60s TTL) was held by an **off-cluster** instance `vps40-optimal-us` (REGION=us) — a leftover standalone murror-api connected to the prod DB, actively renewing the lock. So the cluster pod was never leader; vps40's OLD unbounded retry was what re-published the backlog. Couldn't reach vps40 (pooler-masked IP; PC tunnel down/CF-1033; doesn't resolve; not in any namespace).
- **Fix — murror PR #410, image 0.34.3:** cluster-eligibility gate in `SchedulerLeadershipService` — only `REGION` starting `doks` may lead; an in-cluster pod **preempts** a valid lock held by a non-cluster holder. Basic acquire path unchanged (alpha/staging unaffected). Prefix is bare `doks` (sentinel caught CI sets `doks` while live ConfigMap is `doks-sfo2`). 8/8 new spec, 37/37 scheduler specs. Sentinel adversarial review (no flapping/dual-leader; vps40 yields gracefully). Deployed via `deploy-doks`.
- **VERIFIED LIVE:** lock flipped `vps40-optimal-us` → `murror-api-79846d4f57-d7b4k` (doks-sfo2); `Leadership acquired` + retry job configured + `No articles needing retry`. Stable across renew cycles; vps40 cannot reclaim (maintained every 30s; restart self-heals via preempt).
- **⚠️ OPEN (security):** vps40 still alive with live prod DB creds (+ maybe a shared-Redis worker). Power off + rotate creds when reachable. Scheduler control fixed; box not yet decommissioned.

### Live image state (end of session)
- `murror-api` = **`0.34.3`** (bounded retry + backlog purge + cluster-only leadership)

---

## 2026-06-04 (PDT) — Prod reliability sprint + personalized articles

Driver: Astro reported "article is not generating." Turned into a full prod-reliability day. All work targeted **live production = do-sfo2 cluster** (`nsp-prod-murror` / `nsp-prod-murror-ai`). murror-api commits today: ~20; viasr: ~9.

### Shipped to LIVE prod (do-sfo2)
1. **Article generation pipeline fixed** — un-gated the new-article RMQ consumer + replaced the dead `save_to_db` with `send_response` (completed articles now reach users). Made **durable in `main`** (viasr PR #431) after discovering it was deployed-from-branch-but-not-merged.
2. **Quotes: stop AI generation → curated library** — onboarding 404 fixed by serving from the existing legacy pool (~5,952 quotes, EN+VI); read-path fallback for quote-less users; journal-quote saving disabled (murror PR #403). Stopped ALL viasr AI quote generation: journal + reflection + dead article-quote line (viasr PR #430). Closed the AI-route PR #429.
3. **Connections-cron fixed** (murror PR #406) — 2 cron jobs (insight health-check + stuck-task recovery) had errored every tick "for weeks"; schema-qualified the raw SQL to `murror_api.*` (pgbouncer drops search_path). Stuck-task recovery safety net restored.
4. **Activity-based daily articles** (murror PR #407, image 0.34.0) — NEW: one personalized article/day for each recently-active user, built from their recent journals + deep chats, all backend (no mobile change). Activity-only scope. Scheduler every 6h, idempotent. **2 bugs caught pre-deploy by a read-only prod dry-run** (wrong table name `"User"`; prod data lives in LEGACY `public` schema, not modern). LIVE + healthy; scheduler registered.

### CI / infra fixed (the "CI green ≠ live prod" landmines)
- **Landmine A** — murror CI "production" deploys to the wrong (US-migration) cluster, never live do-sfo2. Built a safe **image-only `deploy-doks` workflow** + least-priv `murror-api-deployer` SA + `KUBE_CONFIG_DOKS` secret (murror PRs #404/#405). One-click: `gh workflow run deploy-doks.yml --ref main -f image_tag=<tag>`.
- **Landmine B** — viasr deploy steps had a kubeconfig clobber ("Config not found"); pinned `KUBECONFIG` path (viasr PR #432).

### Live image state (end of day)
- `murror-api` = `0.34.0` (articles + quotes + cron fixes)
- `murror-ai` web + worker = `main-5f350b4` (article durable + stop-gen)

### Open / follow-ups
- murror **#402** (quote library on `staging` lineage) — parked; staging is 202 commits ahead of production, separate lineage.
- Verify ONE real article generation end-to-end post-deploy (write path; read path dry-run-validated).
- 16 pre-existing timezone/notification-schedule spec failures (DI/constructor drift) — separate cleanup.
- Optional: `@@unique([userId, requestedDate])` race-hardening (needs migration); systemic pgbouncer `search_path` fix.

See `~/.claude/.../memory/reference_prod_engineering_lessons_2026_06_04.md` for the recurring patterns (read before any prod / raw-SQL / deploy work).

## 2026-07-04: Builds 264-268, pre-production QA sweep, prod hardening

**Summary:** Four TestFlight builds in one day (264-268) closing QA263/265/266 feedback; the quiz-card-stuck bug fixed for real (4th attempt, proven with live data); challenge feature reshaped end-to-end (single "We did it" CTA + share-a-thought + streak wiring, compact card face + details popup); then a 6-area pre-production QA sweep that found and CLOSED two prod-side gates under approved freeze exceptions.

**Key accomplishments:**
- Builds 264-268 shipped (single lane): QA263 batch + 429 invalidation coalescing; challenge CTA v2 + Connection Streak wiring (backend #553/#554, streak E2E proven for both test users); QA266 batch (accept-toast double-fire, card chrome unification, stacked-deck removal, prompt name-leak filter) + challenge insight-rotation fix (#555); tilt animation restored + moment prompt single-CTA + compact challenge card.
- Pre-prod QA sweep (frontend/backend/AI/data/security/privacy, 6 parallel auditors): 1 Critical + 4 High found, 2 prior "launch blockers" retired with evidence (CALLBACK_ALLOWED_HOSTS fails safe; lodash patched).
- Prod hardening EXECUTED: app_storage RLS lockdown (advisor 6 ERROR -> 1) + murror_api emotional compat (Memory Vault writes were silently failing on prod since image e0678d6 - view over public.emotional_snapshots + new emotional_memory table). Verified live.
- Hygiene: 8 orphan staging tables classified; murror-api PR #556 removes the 6 dead Prisma models that regrow empty shells (open, unmerged).

**Operating notes:**
- Always verify against the DEPLOYED IMAGE (`git show <sha>:path`) + live DB, never a checked-out branch tip - the branch lied twice today (viasr production branch behind its own deployed image; a worktree grep on a stale branch).
- After every promotion: confirm the `staging` branch still exists (delete_branch_on_merge incident).
- New standing design rule: every design proposal must match the app's existing design language (pill under name, vertically centered card bodies).

**In flight:** build 269 (card flip to dark-glass back + carousel peek), crisis-eval fresh run, prod promotion punch-list in `incident_prod_hardening_2026_07_04.md`.

**Doc:** `docs/plans/2026-07-04-builds-264-268-preprod-sweep-prod-hardening.md`

## 2026-07-05: Builds 271-276, backend challenge-cancel + milestone fix, analytics buildout

**Summary:** Six TestFlight builds (271-276) closing rounds of Astro's app-review feedback, plus two backend features (challenge cancel/decline endpoint, milestone de-dup bug fix), the onboarding web-parity port, and a full mobile+web analytics buildout (PostHog + Mixpanel across both platforms, identity-merge bug fixes, ad-pixel FTC-pattern scope-down). Capped by root-causing and fixing the dead voice-dictate button (old library incompatible with RN New Architecture).

**Key accomplishments:**
- Builds 271-276 shipped (single lane): 271 app-review flip/card fixes; 272 sync consolidation + challenge-decline wiring + onboarding port; 273 milestone bug + streak unify + We-did-it idempotency + Read More scroll; 274 Share-a-thought tap (real fix, build-271's zIndex was 3 levels too deep) + streak goal regression + upcoming-milestone calendar ladder; 275 reflect-card overlap + CR responder popup + voice diagnostics; 276 voice New-Arch library swap.
- Backend: challenge cancel/decline endpoint (murror-api #560, schema migration + first-ever challenge notification); milestone de-dup bug (all-time lockout since 2026-03-19, ~8 prod users) scoped to current run (#561); onboarding-complete avatar URL + preset hosting (#559).
- Analytics: mobile PostHog (fanned from single dispatcher, no autocapture/replay; reverted once on a Metro bundle break then re-fixed via scoped deep import); web Mixpanel (5th fan-out); identity-merge bugs fixed on mobile PostHog + web Mixpanel (were orphaning all events as anonymous); ad-pixel scope-down (OnboardingCompleted + StartTrial moved off Meta/TikTok/CAPI to internal-only, compile-enforced type split).
- Voice: root-caused visible-but-dead mic to `@react-native-voice/voice@3.2.4` (legacy RCTEventEmitter dropping events under New Arch); swapped to New-Arch fork `@dev-amirzubair/react-native-voice@1.0.4`; build 276 archive succeeded (TurboModule compiled+linked = native verification).

**Operating notes:**
- Verification discipline tightened: SDK/native-dep changes now require a REAL Metro bundle preflight + a REAL archive as the compile/link gate (tsc/lint alone missed the PostHog bundle break). objectVersion-70 pod-install failures in worktrees are env artifacts; main checkout is fine.
- Ad-pixel scope for this mental-health-adjacent app is Astro's explicit per-case call, not an automatic "close every leak" rule (the 3 TikTok purchase pixels are intentionally kept).

**Doc pointers:** `Murror/docs/plans/2026-07-05-builds-271-276-analytics.md`; memory `incident_voice_newarch_library_swap`, `incident_sgp1_migration_2026_07_04`, `feedback_tiktok_purchase_pixels_intentional`, `feedback_ui_visual_loop`, `project_mobile_prod_release_v200`.

---

## 2026-07-10: Onboarding v2 ships (five-day sprint 07-05 to 07-10)

**Summary:** The orbital onboarding went from approved prototype to the OFFICIAL onboarding on web production (100% of new users) and a device-polished mobile TestFlight (nine builds, 284-292). Along the way: a prod split-brain incident found and fixed, real AI their-side guess live on prod, crisis-safety client nets on both platforms, a founder's letter with rainbow streaming, a large device-QA fix train, and a new hard blast-radius process rule.

**Key accomplishments:**
- Web v2 LIVE at 100% (PostHog flag `onboarding_funnel_v2`, control preserved at 0% for one-call rollback). Act 2/3 chromeless redesign + Codex refinements + signup handoff stabilization.
- Mobile port: core verbatim + Skia orbital; builds 284-292 through rapid Astro device-QA loops (entry gating, web fidelity, z-order/avatar/keyboard fixes, founder letter + rainbow chat-renderer reveal, soft fade system, v2 sign-in screen + auth scaffold, voice locale/punctuation/audio-session fixes, persona persistence, streak/chart/prompt/challenge-card fixes).
- Prod: split-brain resolved (rogue sfo2 image + partial DNS flip), api.murror.app -> sgp1 via Cloudflare API, viasr+murror-api their-side deployed, sfo2 scaled to 0.
- Crisis-safety client net on web (Codex) + mobile: no AI guess ever shown for crisis input, offline-safe, reduced-motion race closed.
- Gesture redesign approved (new 6-palette + 3 mechanics); backend personalized bilingual push MERGED to staging (found: live app's gesture send never fired a push - legacy endpoint).
- VI/JA translations: onboardingV2 namespace (102 keys) PR #620 awaiting Astro's native review; memories namespace in flight.

**Operating notes:**
- New HARD RULE + commit hook: blast-radius protocol (map callers, gate shared changes, prove untouched, verify, adversarial review, report). Born from repeated shared-code regressions; first real test passed (the 289 two-session combined build, zero-overlap proof, 130/130 specs).
- Build-lane gotchas now recorded: envfile pin before CLI archives; yarn install in build lane after patch/dep merges; verify patched source pre-archive.
- murror-api/viasr PR base must be `staging` (develop deploys nowhere).

**Doc pointers:** `Murror/docs/plans/2026-07-10-onboarding-v2-ship-five-day-sprint.md`; memory `project_orbital_onboarding_funnel` (the full build-by-build log), `feedback_no_regressions_blast_radius`, `infra_cloudflare_domain`.

---

## 2026-07-11 — Personal Note polish: card redesign, Letter, Home envelope badge (builds 298 + 299)

Astro design + QA pass over the received-note feature. Three feedback rounds, each
built behind the agent-panel + mockup-confirm flow and adversarial review, shipped as
TestFlight builds 298 (note card redesign) and 299 (Letter + Home badge).

**Key accomplishments:**
- Note card no longer black glass: artwork background (same bundled pool + 24% scrim as
  Connection Reflection cards, seeded by message id, never note content) + a "candlelit"
  cream glow that breathes behind the pill; sibling-consistent `"A note ✉️"` pill with the
  sender name in a `"From {name} · Tap to open"` footer; the Letter opens onto the same
  artwork. Gesture icon above the avatar pair breathes at 2% scale (size unchanged). Crisis
  notes keep the calm dark wash everywhere, byte-identical. (mobile PR #635)
- Letter text vertically centered + serif center-aligned; the previously-dead bottom CTA now
  lands the user in the note composer (new `popTo` nav helper; plain stack-v7 push made a
  phantom duplicate detail). (mobile PR #637)
- Home ring shows an envelope badge on a connection who sent an unopened note, cleared by the
  same per-note opened flag the Letter writes; badge state kept out of the entrance-animation
  path so it never re-fades the ring. (mobile PR #638)
- Backend: `latestNote {id, createdAt}` on the friends payload (one batched DISTINCT ON query,
  id + timestamp only for privacy) + composite `(relationship_id, created_at DESC)` index.
  (murror-api PRs #582/#583/#584, deployed `0.203.0-staging`.)

**Operating notes:**
- Cross-session conflict sweep is now a standing rule (Astro runs a parallel onboarding
  session): before merging to a shared branch or bumping a build, check other sessions' open
  PRs / bump PRs / file overlap. Memory `feedback_cross_session_conflict_check`.
- Scope `eslint --fix <files>` explicitly; a repo-wide `--fix` swept another session's files
  into commits twice.
- Every design round went agent-panel -> animated mockup -> Astro pick -> build -> review, per
  the visual-loop + brainstorm-first rules.

**Doc pointers:** `Murror/docs/plans/2026-07-11-personal-note-polish-and-home-badge.md`;
memories `project_gesture_send_redesign`, `feedback_cross_session_conflict_check`,
`feedback_no_regressions_blast_radius`.

## 2026-07-13 — Round 12 device fixes → staging build 311; Codex handoff

Round 12 of the staging device-feedback loop: six tracks built (each by a dedicated
subagent with tsc/eslint/jest gates + blast-radius proof), merged to
`staging-environment-setup`, shipped as TestFlight build 311. Also produced the Codex
handoff docs as Astro moves the streak wrap-up testing + a mobile-debug lane to Codex.

**Key accomplishments:**
- Manage Account: added a Username field (reads/edits `preferredName`; First Name decoupled
  from it) and removed Time of Birth (date-only payload; partial PATCH preserves server
  birthTime). (mobile #690)
- Share/add sheets: fixed the CTA crop + hard edge above the keyboard (static backdrop,
  bottom-anchored sheet, keyboard avoidance as a content inset via `useKeyboardHeight`) and
  removed the title/date fields from add-memory. (mobile #691)
- Two-way comments on shared memories: append-only thread on the Our Memories detail sheet,
  both sides post back and forth, optimistic append, no counts. New append-only
  `shared_photo_comments` table + `POST .../memories/:pid/comments`, comments inline on the
  wall GET, notifies the other participant; heart path + Moments untouched. (mobile #693,
  murror-api #596 deployed to staging + dev.)
- Connection Reflection card body tap: root-caused as a New-Architecture touch-layering bug
  (a last-painted animated sibling stealing the tap despite zIndex), NOT the freemium lock;
  fixed by rendering the tap target as the last child so paint order wins. (mobile #694)
- Cut staging TestFlight build 311 (bump #695) carrying all six tracks; app + appex both 311,
  staging host verified (no dev leak), uploaded.

**Operating notes:**
- Archive gotcha: the first archive failed on `react-native-image-crop-picker` unresolved
  in the Bundle-RN phase. The build checkout's `node_modules` was stale after fast-forwarding
  the git tree (a new native dep had landed). Run `yarn install` before `pod install`
  whenever `package.json` changed since the last local install; re-archive verified clean.
- Codex handoff: `Murror/CODEX_HANDOFF.md` (master onboarding + section 3.1 mobile-debug
  split: Claude finishes round 12 + owns the build lane, Codex takes new/separate bugs off
  the in-flight files) and `Murror/HANDOFF-streak-wrapup-testing.md` (staging streak-voice
  testing playbook; seed pre-approved; narration from Astro's real journals). Memory
  `project_streak_wrapup_testing_handoff`.
- Cross-session: 311 is cumulative on the other session's 310 (Connection Reflection redesign
  + connections-tab re-skin); that session cut 312/313 afterward. Coordinate the next bump
  against the latest `CURRENT_PROJECT_VERSION`.

**Doc pointers:** `Murror/docs/plans/2026-07-13-round-12-build-311.md`; memories
`project_moments_presence_layer`, `project_streak_wrapup_testing_handoff`,
`feedback_cross_session_conflict_check`.

## 2026-07-14: Mobile staging review loop, builds 312 to 324

**Summary:** A two-day mobile staging loop moved through rapid TestFlight builds from
312 to 324. The work focused on visible product polish: insight persona voices,
voice input clarity, keyboard-safe share/comment flows, memory detail actions and
reporting, reflection streak visibility, guided MTC onboarding, black-card visual
direction, Polaroid memory treatments, MTC carousel bleed, and For Us card body
centering. Final build: 324, App Store Connect `VALID`.

**Key accomplishments:**
- Restored the persona/advisor voice under insight cards and added tests that keep
  the source labels wired to the intended card contrast treatment.
- Fixed share/comment and memory-detail keyboard behavior so input fields and CTAs
  stay usable above the keyboard instead of being cropped.
- Added compact memory actions plus private content reporting, backed by new
  staging `murror-api` reporting support.
- Restored Reflection connection streak visibility and added an explicit error state
  so the section no longer looks silently empty.
- Tuned shared chrome and visual direction: darker nav/FAB treatment, black-card
  surfaces, smoother tab-header gradients, softer bottom sheets, and filled white
  heart affordances.
- Added guided MTC onboarding on Home so people get a prompt-library-backed starting
  card before sharing.
- Polished memories into larger Polaroid treatments with better spacing, edge bleed,
  and non-tilted detail presentation.
- Fixed the MTC carousel so card frames remain visible while horizontal scrolling can
  bleed to the screen edge without cropping.
- Centered For Us card body copy vertically between the pill title and footer CTA,
  matching the Connection Reflection card rhythm.
- Cut and uploaded build 324. Archive verified `app.murror.mobile.stg 2.1.0 (324)`,
  notification extension `2.1.0 (324)`, staging endpoint present, dev endpoint absent,
  App Store Connect state `VALID`.

**Operating notes:**
- The July 14 Codex loop was not visible to the Claude Code token-accounting script.
  The script counted available July 13 Claude transcripts, but the Codex-internal
  build train should be treated as an accounting gap, not a zero-effort result.
- The relationship next-step prototype exists on its prototype branch, but it was
  not found on `origin/staging-environment-setup`, so it is intentionally excluded
  from the shipped TestFlight list.
- The active marketing source for the public progress page is the
  `murror-platform-progress` worktree on `feat/marketing-site`, not the stale path in
  the main `murror-platform` checkout.

**Doc pointers:** `Murror/docs/plans/2026-07-14-builds-312-324-mobile-polish.md`;
mobile PRs #704 through #709, #710, #712, #714, #717 through #728; murror-api
reporting commits `8edb972`, `918216a`, `2976e2c`.

## July 16, 2026 — Together plans (Duo/Circle) backend + the cost pipeline that had never recorded a cost

**Summary:** Two threads with one root cause. Astro asked for couples/family plans and, separately,
"what should the product cost?" Every pricing answer so far rested on an ESTIMATE of AI cost per user.
Chasing the real number found the LLM cost pipeline had been a shell since it was built, so we wired it,
measured for the first time, and then answered pricing from data instead of guesses.

**Key accomplishments:**
- **murror-api #605 MERGED (`7002678`), alpha live + seeded.** Multi-seat plans were NOT greenfield: a
  full `family-plan` module already existed (plan/seat/minor-consent schema, claim flow with auto-connect,
  webhook reconcile, entitlement union). Duo = that module with `seatCount=2` via a new
  `REVENUECAT_FAMILY_PRODUCT_SEAT_MAP`. Also fixed a real race: the invite seat-cap counted then inserted
  in two queries, so concurrent invites could both pass the cap. Now row-locks the plan and does
  lock-count-insert in one transaction. 214 targeted tests, no migrations.
- **End-to-end verified on alpha** with simulated RevenueCat webhooks (RC is not in dev/alpha): purchase
  created a `seat_count=2` plan (the map beat the default 5), cancellation preserved the period with the
  member still entitled, uncancellation restored. Astro's account holds an ACTIVE Duo plan with a dummy
  member seated.
- **murror-platform #179 OPEN, cost pipeline LIVE.** viasr always emitted a token record per LLM call;
  cost-service had ClickHouse AND RabbitMQ unconfigured, so it booted degraded and every event expired
  unread after 24h, while the reporting view summed a literal `0 AS total_cost`. Now: in-cluster
  single-node ClickHouse, real per-model pricing (env-overridable via `MODEL_PRICING_JSON`), the missing
  cost column, and the daily rollup rebuilt to sum it. 62 real events priced within minutes, queue drained
  to zero, **zero rows with zero cost**.
- **First real numbers:** claude-haiku-4-5 = **$0.0034/call**. Median prod chat user ~= **$0.01/month**;
  heaviest ~= $0.43; all production AI chat ~= $0.53/month. The $5-12/heavy-user estimate that pricing had
  been designed around was ~100x too conservative.
- **Two documents produced for Astro:** a confidential burn + pricing memo, and a team-safe version with
  infrastructure and AI costs only (no salaries, no company financials).

**Operating notes:**
- Two adversarial reviews earned their keep. murror-api: the raw invite lock hardcoded the `murror_api`
  schema but the `family_plan` migration DDL is unqualified, so the table lives wherever search_path
  pointed; and a Circle->Duo downgrade stranded over-cap members on premium forever. cost-service: **BLOCK**
  because viasr had already declared the DLQ as a quorum queue, so a bare `assertQueue` would have
  crashlooped the pod on boot. All fixed before deploy.
- **Downgrade policy decided by Astro: grace to period end**, then the organizer chooses who stays. The
  interim code detects and logs over-capacity but deliberately never auto-revokes, because yanking a
  member's access mid-period violates the locked product rails. The grace flow is a Milestone C build.
- The freemium deploy-seam repeated exactly: alpha deploys are `kubectl set image` only and never apply
  manifests, so ConfigMap keys never reach the pod. Verify the POD's resolved env with `printenv`.
- `build-dashboard-images.yml` had `ref: feat/prod-deploy-hardening` hardcoded, so every dispatch silently
  built the wrong branch, and it pushed the shared mutable `dashboard-mvp` tag that live deploys pull with
  pullPolicy Always. Feature branches now push immutable `<branch>-<sha>` tags only.
- Real spend from Mercury (90d): infrastructure **$219/mo** exactly; AI vendors $643/mo of which Anthropic
  $484/mo is mostly Claude Code dev tooling, not user serving. June burn was $13,156 with 76% people.
  Runway ~35 months against $450k in reserves held outside Mercury.
- Correction worth remembering: never state a runway conclusion from Mercury alone. It cannot see reserves
  held elsewhere, and neither can the internal dashboard's runway widget.
- The cost pipeline currently consumes STAGING viasr's vhost. Prod is additive (rows carry `environment`)
  but sits under the production freeze.

**Doc pointers:** `Murror/docs/plans/2026-07-16-together-plans-and-cost-truth.md`;
murror-api PR #605 (merged `7002678`); murror-platform PR #179 (`b5c20fc5`, `67f7e311`, `019f4f26`,
`fa72f826`, `a81666a4`); `apps/cost-service/DEPLOY.md`.

## July 18, 2026 — Galaxy: design doc to a navigable 3D Discovery on TestFlight

**Summary:** Took the Codex Galaxy handoff (approved 2026-07-09 design + 12-task plan) and built the
whole opt-in discovery layer for the Alpha app, then reworked it three times against Astro's on-device
feedback. Six specialist agents brainstormed before any code; Astro locked four decisions, then drove
five device passes that turned a working-but-raw feature into a navigable 3D star field. 21 PRs across
`murror-api` and `MurrorMobile`, 6 Alpha builds (342, 343, 344, 345, 347), everything flag-dark and
gate-dark. Prod and staging were never exposed.

**Key accomplishments:**
- **Backend complete, gate-dark (7 PRs, #609 to #615).** Isolated Galaxy domain in
  `schema.murror.prisma` (8 tables, never touching relationship or journal tables), allowlisted card
  projections, finite Field, the full decision set, and the consent state machine ending in an Orbit.
  Guard tiers: dev/alpha ON by env default, staging and production dark behind the default-off Statsig
  gate, so a staging graduation is a deliberate flip rather than a deploy.
- **Mobile complete on fixtures (14 PRs, #762 to #780).** Mock-first paid off: the entire flow was
  feelable on device before the backend was wired. Foundation, orbit view with continuous zoom-out and
  a first-crossing threshold, signal card and accessible list, composer with a mandatory preview gate,
  Resonances, guided exchange, Orbit graduation, activity feed, and a 3D Discovery galaxy with
  spherical camera, golden-spiral placement, depth fog, nebula parallax, and per-type connection lines.
- **"My Space is not a redesign" enforced structurally.** At rest the flag-on home renders the ORIGINAL
  `HomeOrbitalView` component (proven by spec: the composite module is never even constructed), so any
  future home work stays correct automatically. Only addition at rest is one small header toggle.
- **Every merge gated.** Each PR got an adversarial review plus independent verification before merge.
  Reviews caught two HIGH privacy leaks (a declined sender learning they were declined; a participant
  inferring their counterpart's continuation vote), a blocker inside a bug fix, and a wrong-person tap
  bug in the 3D field. All fixed pre-merge.

**Operating notes:**
- **The veil bug is the lesson of the session.** Two root causes, and the first fix was wrong. The real
  one: `getFromLocal` JSON-parses every read, so the stored string `'1'` returns as the number `1` and
  `value === '1'` is false forever. Read-side fix retroactively honors already-committed devices.
  Repo-wide trap for any numeric-looking string in that wrapper. The composite spec mocked the
  persistence module wholesale, so nothing crossed the real storage path.
- **Native hit-testing is invisible to jest.** Build 343's toggle rendered perfectly and was dead: the
  transparent header at `zIndex: 99` ate every tap. Same class killed the 3D gestures (`box-none` on
  the gesture detector's child). RNTL fires presses at components directly, so only a device catches
  these. Z-order contracts now have pinned constant specs.
- **Two stacked RN Modals do not present on iOS**, and anything absolutely positioned inside the
  `fixedOrbital` band gets clipped to mid-screen. The 3D scene needed a full-bleed layer at `fixedRoot`.
- **Build numbers:** memory said Alpha ran its own sequence from 178; ASC showed 341. Always query ASC.
  With a concurrent session active, `scripts/ios-next-build.sh` plus a merged bump PR before archiving
  reserves the number remotely and makes collisions impossible. Check `pgrep xcodebuild` before writing
  `/tmp/envfile`, which is a shared global.

**Doc pointers:** `Murror/docs/plans/2026-07-18-galaxy-alpha-pilot-build.md` (full writeup),
`2026-07-17-galaxy-alpha-pilot-addendum.md` (scope), `docs/contracts/galaxy-pilot-api.md` (frozen
contract), `docs/runbooks/galaxy-dev-enablement.md` (the still-gated dev enablement steps).

---

## 2026-07-28 — Connection/Duo two-sided verification, 8 shipped fixes, and production readiness

**Summary:** Two threads. A full verification sweep of the connection and Duo (Together)
surfaces on two devices with two connected staging accounts, which turned up eight shipped
bugs. And an assessment of what it takes to get staging to LIVE production, which found the
divergence is materially worse than memory described.

**Key accomplishments:**
- **Two-sided card states proven.** Drove a real directional takeaway card through
  `PENDING -> COMPLETED -> INSIGHT_READY` and diffed both users' payloads at every state:
  byte-identical throughout. The sender/receiver difference is derived client-side from the
  ids, so the server cannot emit two different cards. Reflection cards are one row with one
  shared status, so divergence is structurally impossible there too.
- **Every Duo case exercised:** re-invite (reuses the freed seat), re-claim in grace,
  organizer-remove, wrong-account 403, bogus token 409, under-13 403, 13-17 consent 409, and
  two negative guards. The grace fix was proven live on a seat genuinely in its grace window,
  flipping false -> true with the right date, then back to false on re-claim.
- **Eight mobile fixes shipped** (#867-#881) plus API (#639, #640, #641, #642) and web
  (#244/#245/#246, deployed to staging and verified at byte level in the served bundle).
- **Prod bundle-phase blocker solved and archive-proven** (#883). Build 380 cut (#882).
- **Backlog swept:** 14 stale PRs closed, 4 merged, 1 held for a rebase rather than overridden.

**Operating notes:**
- **A guard that asserts existence is not a guard.** The butterfly avatar fallback never
  painted: an `<Image>` styled with only `StyleSheet.absoluteFillObject` lays out at zero size.
  The existing spec passed the whole time because a zero-size image still EXISTS. Proved it by
  restoring the broken style: 48 tests still green while the new size guard failed. Pin the box.
- **The prod bundle-phase mystery is solved.** `with-environment.sh` ends with
  `if [ -n "$1" ]; then $1; fi` and runs ONLY `$1`. The prod phase passed `/bin/sh` as `$1`, so
  the sentry and RN scripts were discarded as `$2`/`$3`, and `/bin/sh` with no args exits 0.
  Nothing was swallowing an error; the call was never made. That is why the "redundant" bare
  line was load-bearing.
- **Only an archive proves a bundle.** `main.jsbundle` verified at 13,775,156 bytes.
- **THREE divergent states, not two.** Live production runs `deep-chat-hotfix-ba9172a`, an
  off-branch image, **148 commits behind the `production` branch**. You cannot tell what is in
  production by reading a branch. A naive promotion would delete the Stripe billing portal
  (prod-only, absent from staging) and 131 stardust artwork entries.
- **`gh pr list` defaults to 30 and truncates silently.** The first sweep undercounted. Always
  pass `--limit`.

**Doc pointers:** `Murror/docs/plans/2026-07-28-connection-duo-verification-and-prod-readiness.md`,
memory `project_production_migration_plan.md` (the goal + locked decisions),
`incident_prod_bundle_phase_node_2026_07_16.md` (root cause + the still-open Sentry question).

---

## 2026-07-30 - Production-readiness continuation handoff

**Summary:** The API staging line now has a non-Galaxy migration allowlist, private-media
hardening, cost-aware CI, and a fully green staging deployment. AI queue logging no longer
prints private payloads. Focused Connection Reflection contracts pass across mobile and API.
A detailed continuation handoff now preserves the remaining iOS, subscription, AI release-gate,
infrastructure, two-account, TestFlight, and production-promotion work.

**Completed evidence:**
- API PRs #681, #682, and #683 merged; staging deployment run `30573700416` passed build,
  deploy, smoke, and release gates.
- AI PR #595 merged and deployed to staging with private payload log redaction.
- Mobile PR #958's pushed revision passed hosted Ubuntu checks, unit coverage, and iOS build.
- Connection Reflection focused contracts passed 92 tests across the two codebases.

**Still required before production:**
- Finish the local ODE Firebase resource fix, subscription timeout/Restore lock, and AI PR #596.
- Close the iOS chat-reflection keyboard bug.
- Prove Connection Reflection and Duo flows with two real accounts, including Apple Sandbox.
- Complete staging-first Kubernetes hardening and the exact non-Galaxy promotion rehearsal.
- Rotate the exposed production database credential only with Astro's explicit approval.
- Cut and process one final TestFlight candidate, then present the complete promotion dossier.

**Doc pointer:** `docs/plans/2026-07-30-ios-production-readiness-claude-handoff.md`.

---

## 2026-07-31 - Vietnamese + Japanese localization

**Summary:** Japanese went from disabled in production (`MURROR_SUPPORTED_LANGUAGES.JA`
commented out) to supported end-to-end across mobile, murror-api, and viasr-api, with every
string natively authored rather than machine-translated. Vietnamese, already a mature live
language, got audited for parity and had two real gaps closed. TestFlight build 402 cut and
verified as the concrete review checkpoint requested mid-session.

**Completed evidence:**
- MurrorMobile PR #987 merged: 44 vi/ja strings authored natively, copy-lint infra extended
  with cross-locale rules, three real rendering bugs fixed (ASCII-space injection into
  Japanese sentences, a zero-leading severity label, iOS permission dialogs localized).
- TestFlight build 402 archived, exported, uploaded, confirmed `VALID` via direct ASC API
  query. Build-number consistency verified across the app and both `.appex` extensions before
  archiving. (Unexplained build 403 also appeared in ASC; flagged to Astro, not investigated.)
- murror-api PR #698 merged: `LanguageQueryParamsDto` widened, unblocking 21 endpoints that
  were 400ing every Japanese-locale device from first launch. Closed a live crash risk in
  `getRelationshipTypeInfo` found by adversarial review, not the original ticket.
- viasr-api PR #599 merged: enum enabled, chat language detection fixed (two structurally
  identical bugs meant Japanese text from a non-ja-default user never triggered real language
  detection), and the Japanese "is this real text or gibberish" content filter rebuilt after
  six adversarially-reviewed attempts, each catching a real bug in the last. Vietnamese short
  reply allowlist and Unicode normalization gaps closed in the same PR.
- murror-api PR #702 opened: widened the last 4 lang-gated DTOs left out of #698. Honest about
  scope, 3 of 4 have no Japanese content column yet (quote_ja/description_ja/contentJa), so
  this stops the 400 but serves English content, not real Japanese output, until that content
  is authored. One genuinely new natively-authored Japanese string pair shipped in the same PR.

**Operating notes:**
- **Six attempts on one function is what "no tokenizer for this language" costs.** Japanese
  has no space-delimited words, so the existing `\b\w+\b` dictionary-ratio check (built for
  en/vi) extracts a whole sentence as one "word" and can't evaluate it. Every threshold-based
  fix (density, absolute count, both) was broken a different way because real and adversarial
  Japanese content occupy the same range on any single density/count axis. The fix that
  finally held changed the axis entirely: mark Japanese runs as evidence (dilution), don't
  delete them, don't score density at all.
- **A test suite that only pins a wide-enough range is not a real regression guard.** One
  review round found the prior fixtures only constrained a threshold to a 17-point-wide range;
  moving it anywhere inside that range would not have failed a single test. Pin the tightest
  known real and adversarial examples directly.
- **Mutation-test every fix, not just the latest one.** Reverting to the immediately prior
  commit is not enough when a function has been rewritten five times; the final round tested
  against the union of every prior attempt's adversarial corpus, not just the last diff.
- **Vietnamese wasn't actually done just because it's old.** Auditing it after Japanese forced
  six rounds of scrutiny surfaced two real gaps a first pass would have missed: an English-only
  short-reply allowlist, and a Unicode NFC/NFD normalization gap that broke the exact word the
  first fix existed for.
- **A stale worktree gives a false read on current file state.** Two worktrees reused for
  follow-up work (`mobile-l10n`, `murror-api-ja-support`) had their branches fast-forwarded
  past their own already-merged PRs before starting anything new on them.

**Doc pointer:** `docs/plans/2026-07-31-vietnamese-japanese-localization.md`.

## 2026-07-31 — Staging production-readiness: security, performance, reliability

**Summary.** Full audit of staging for launch readiness (12 agents, 6 lenses, each
adversarially verified). 46 verified findings. 8 PRs merged and deployed. Staging and
production databases hardened and verified live.

**Key accomplishments**
- Root-caused a security control that had failed silently on every call for a month:
  `enable_rls_on_vector_table()` built a psycopg2 engine from a URL carrying Prisma's
  `?pgbouncer=true`, psycopg2 rejected the DSN, and the fail-open handler swallowed it at
  WARNING. Every per-user vector table since was anon-readable. Fixed in viasr#597 by
  reusing `_sanitize_pg_url`, asserting `pg_class.relrowsecurity` after the ALTER, and
  raising the log to ERROR.
- Production remediated with explicit authorization: anon-executable SECURITY DEFINER
  functions 8 -> 0, anon user-id enumeration via the public storage bucket 275 -> 0.
  Verified with a positive read-after test on a real avatar (byte-identical, 77,519 B).
- Staging: ERROR-level Supabase security lints 11 -> 0, vector tables 28/28 RLS-on.
- Crisis-safety gap closed: `detect_crisis_async` ran only on `/chat/stream`, so
  `/chat/text` and `/chat/voice` gave no 988 / Crisis Text Line. Shared guard now on every
  entrypoint, and crisis turns are persisted (they previously vanished from history).
- HA: replicas 1 -> 2, PDB allowed-disruptions 0 -> 1 (node drains had been blocked).
- `/api/docs` and `/api/docs-yaml` now 404 on staging; swagger gate inverted from a
  denylist to an allowlist so an unset or misspelled ENVIRONMENT fails closed.
- 33 routes were silently unthrottled: five `@Throttle` tiers keyed onto throttler names
  never registered in AppModule. Registration now derived from `ThrottlerTiers` so the two
  lists cannot drift.

**Operating notes**
- FK indexes from #692 are NOT live: the deploy's `build-migration-image` job was SKIPPED,
  so the migration never ran. Two of three perf numbers are flat as a result.
  `/api/v1/connections` did improve 0.453s -> 0.367s (-19%) from the code half.
- Staging deploys always show red: `Deployment Summary` fails because `smoke-test` and
  `release` conclude `skipped`, while the deploy itself succeeds.
- Staging GoTrue's Resend key is invalid (535): password-reset and magic-link will fail.
  Signup is fine (confirmations off, matching prod).
- `murror-backend` `format` fails on every PR in that repo, blocking #898.
- NetworkPolicies merged as files only, deliberately not applied.

**Lesson recorded.** A blanket revoke stripped `authenticated` of `user_has_role`, which
15 RLS policies call, breaking reads for every logged-in user for ~4 minutes. RLS policy
expressions evaluate with the querying role's privileges. Grep `pg_policies` before
revoking EXECUTE, and test the ROLE, not just the absence of an error.

**Docs:** `Murror/docs/plans/2026-07-31-staging-production-readiness.md`

## 2026-08-02 - Privacy release hardening

**Summary.** The API privacy and deletion safeguards are merged into `staging`. The mobile privacy safeguards are ready in PR #1006 but remain gated by a required Android build that is still queued. The marketing site's PostHog session replay now masks page text and element attributes in the live bundle.

**Key accomplishments**
- Murror API PR #713 merged with reviewed head `10d5cf7` and merge commit `8cb65b3`. Hosted validation, integration, quality, coverage, and PR summary checks passed.
- The deletion path now has durable steps, crash recovery, auth revocation retries, provider receipts, storage verification, vector cleanup, log redaction, and survivor-safe handling of shared relationship content.
- The CI cascade guard landed before the deletion schema prerequisite. It rejects new user or connection cascades without an explicit reviewed exception.
- The StepCI obfuscated dynamic-loader payload was removed and a contract test now rejects the original pattern. Mutation tests confirmed the guard fails when the payload is reintroduced.
- Mobile privacy controls cover secure credential storage, analytics filtering, crisis and reflection-event suppression, error and development-log sanitization, deletion identity cleanup, and removal of Firebase configuration.
- Marketing commit `0cef5f8c` was deployed and verified with HTTP 200 plus live bundle scans showing text masking on `murror.app` and `web.murror.app`.

**Operating notes**
- Do not merge mobile PR #1006 until Android Build run `30763605235`, job `91538386250`, completes successfully. It was still queued with no steps started at documentation time.
- Production schema parity is UNKNOWN until the read-only preflight runs against the production connection. No production write or DDL was performed.
- The rewritten privacy policy remains unpublished. Its local draft documentation still has unresolved decision and counsel markers, and deletion production evidence is not complete.
- No public progress page update was made because this session shipped internal privacy controls and release safeguards, not a new user-facing capability.

**Verification.** API local Jest passed 316 suites and 2,986 tests, with 8 suites and 84 tests skipped. Mobile local Jest passed 344 suites and 2,783 tests, with 1 suite and 3 tests skipped. Type checks, build or hosted build gates, lint, workflow contracts, and mutation tests passed where available. Android local build status is UNKNOWN because the local environment has no Java runtime; the hosted Android gate remains the release authority.

**Doc pointer:** `docs/plans/2026-08-02-privacy-release-hardening.md`.

## 2026-08-03 - Private web shared-memory parity slice

**Summary.** The isolated Murror web parity lane now matches the Android shared-memory
detail lifecycle for append-only comments and partner-only private reporting. The
investor-facing progress page remains timeline-only; the details below are internal
engineering evidence and are intentionally kept out of the public page.

**Key accomplishments**
- Added web `POST /v1/connections/:connectionId/memories/:photoId/comments` with an
  optimistic append, server reconciliation, rollback on failure, and a shared thread
  visible to both members.
- Added web `POST /v1/connections/:connectionId/memories/:photoId/report` with the
  existing API reason enum, a partner-only reason picker, and explicit confirmation.
  The report body remains private and the owner cannot report their own memory from
  this surface.
- Extended the web generated API declaration and fail-closed codegen/contract guards
  for the comment and report routes, `MemoryCommentDto`, `ReportMemoryDto`, and
  `ReportMemoryResponseDto`, using the API source DTO/controller lineage because the
  hosted staging Swagger endpoint was unavailable during this pass.
- Added EN/VI/JA copy and focused coverage for existing comment rendering, comment
  submission, report reason gating, report confirmation, and the existing Our Memories
  wall. The focused Vitest run passed 4 files and 42 tests, including the visible
  focus/return and 15-second refresh contract.

**Verification and boundaries.** Web TypeScript, Prettier, `git diff --check`, web
client contracts, web staging-source contracts, and the cross-platform workspace guard
passed. No iOS checkout was edited, no Android worktree was edited in this slice, no
staging dispatch or deployment was triggered, and no API runtime, migration, or
production operation was performed. Authenticated two-account staging, moderation
read-after behavior, and device/browser validation remain open gates.

## 2026-08-03 - Private web Home journal recovery parity slice

**Summary.** The isolated Murror web parity lane now covers the Home journal
refresh/error lifecycle that Android already exercises on screen focus. This is an
internal engineering update; the investor-facing progress page remains timeline-only.

**Key accomplishments:**
- Added a stable recent-diary query and visible-window refresh listener to web Home;
  browser focus and tab return now refetch the rail without changing the global diary
  cache policy or polling hidden tabs.
- Added separate no-data and stale-data recovery states. A failed first load no longer
  masquerades as a brand-new empty journal, while stale entries stay readable during a
  failed refresh and expose a retry action.
- Added localized EN/VI/JA recovery copy and focused coverage for focus refresh,
  initial-load failure, stale-data recovery, and existing journal rendering. The
  focused Home suite passes 10 tests.

**Verification and boundaries.** Web TypeScript, targeted ESLint, Prettier,
`git diff --check`, locale JSON parsing, and the focused Home suite passed. The
temporary dependency mirror was removed from the lane after validation and the
pre-existing web/root dependency symlinks were restored exactly. No iOS checkout,
Android worktree, API runtime, migration, staging dispatch, deployment, or public
progress page was touched. Cancel/quota/private-input recovery, authenticated staging,
and real browser/device validation remain open gates.

## 2026-08-03 - Private web deep-chat quota parity slice

**Summary.** The isolated Murror web parity lane now handles the API's first-class
`chat_quota` socket event like Android. This is an internal engineering update; the
investor-facing progress page remains timeline-only.

**Key accomplishments:**
- Added typed web socket contracts for the three existing quota codes and wired
  `chat_quota` into the live deep-chat hook and Redux state.
- Added the Android-matching warm quota notice: at-cap responses show localized copy,
  a concrete reset time when supplied, and the existing `/subscription` route; a
  temporary AI outage shows retry-safe reassurance without an upgrade CTA.
- Deduplicated the backend compatibility `message_complete` that follows
  `chat_quota`, preventing the warm server copy from appearing as a second AI bubble.
  New sends clear the old quota state so a retry can proceed.
- Added EN/VI/JA copy and coverage for reducer deduplication, live socket delivery,
  upgrade routing, temporary-unavailable behavior, and the existing writer flow. The
  focused parity set passes 8 files and 70 tests.

**Verification and boundaries.** Web TypeScript, targeted ESLint, Prettier,
`git diff --check`, and the focused parity tests passed. The temporary dependency
mirror was removed from the lane after validation and the pre-existing web/root
dependency symlinks were restored exactly. No iOS checkout, Android worktree, API
runtime, migration, staging dispatch, deployment, or public progress page was
touched. Authenticated staging quota limits, subscription purchase/return behavior,
cancellation, deep-link/resume, and real browser/device validation remain open gates.

## 2026-08-03 - Private Android Home journal recovery parity slice

**Summary.** The isolated Murror Android parity lane now keeps the Home journal
rail's request lifecycle honest: a first-load failure is no longer presented as a
new user's empty journal, and a failed refresh leaves existing reflections visible
with a retry action. This is an internal engineering update; the investor-facing
progress page remains timeline-only.

**Key accomplishments:**
- Added a localized `JournalLoadState` for initial and stale-content failures with
  scoped retry callbacks and stable test IDs.
- Added EN/VI/JA copy for the two recovery messages and retry action without changing
  the existing empty-journal onboarding card.
- Preserved the existing evening voice card when the journal request fails, and
  preserved loaded journal entries during a failed refresh.
- Added focused coverage for both recovery states; the Android Jest component suite
  passes 2 tests. Android client/staging contract checks, i18n synchronization, copy
  lint, Prettier, `git diff --check`, and targeted ESLint pass. The broader Android
  typecheck still reports the pre-existing `src/common/linking.spec.ts` strictness
  error; the new journal files introduce no type errors.

**Verification and boundaries.** The temporary dependency mirror was removed after
validation and no disposable Watchman artifact remains in the worktree. No iOS
checkout, web lane, API runtime, migration, staging dispatch, deployment, or public
progress page was touched. Authenticated Android staging, cancellation/quota/private
input behavior, and real Android device or emulator validation remain open gates.

## 2026-08-03 - Private Android parity gate expansion

**Summary.** The Android pull-request and manual-staging parity gate now includes
the Home and private-writing lifecycle tests that were already present in the
isolated Murror lane but were not previously part of the workflow command.

**Key accomplishments:**
- Added Home journal initial-load recovery, AI quota messaging, composer
  persistence, and draft-resurrection tests to the existing Android parity gate.
- Updated the YAML-aware workflow verifier to require the exact expanded command,
  preserving the existing ordering after staging/client contract checks and before
  JDK/Gradle setup.
- The expanded isolated run passes 14 suites and 65 tests. Android client and
  staging contracts, workflow contracts, Prettier, and `git diff --check` pass.

**Verification and boundaries.** This is CI/readiness coverage only: no Android
Gradle build, staging dispatch, deployment, API runtime, migration, iOS checkout,
web lane, or public progress page was touched. Authenticated staging and real
Android device or emulator validation remain open gates.

## 2026-08-03 - Private Android full typecheck repair

**Summary.** The isolated Murror Android parity lane no longer carries the
strictness error introduced by its expanded deep-link contract test.

**Key accomplishments:**
- Narrowed the optional `linking.config` access in
  `src/common/linking.spec.ts` while keeping the runtime route assertion intact.
- Full Android TypeScript now passes with the available complete dependency mirror;
  targeted ESLint and Prettier also pass.
- The expanded Android parity run remains green at 14 suites and 65 tests, with
  workflow, client, staging, i18n, copy, formatting, and diff guards passing.

**Verification and boundaries.** No production or staging runtime was changed, no
Gradle build or dispatch was run, and iOS, Uni, web, API, and the public progress
page remain untouched. Native packaging, authenticated staging, and real-device
validation remain external gates.

## 2026-08-03 - Private cross-platform gate re-verification

**Summary.** The isolated Murror web and Android lanes were rechecked after the
Android typecheck repair and parity-gate expansion.

**Key accomplishments:**
- Web client and staging contracts, TypeScript, 8 focused Vitest files with 77
  tests, production Vite build, and targeted ESLint all pass. Existing web/root
  dependency symlinks were restored exactly after validation.
- Android's 14-suite/65-test parity gate, full TypeScript, client/staging/workflow
  contracts, i18n, copy lint, Prettier, and diff checks remain green.
- The 12 MB generated web `dist` output was moved recoverably to
  `/Users/astro/.Trash/murror-web-parity-build-2026-08-03`; Android temporary
  dependencies and Watchman artifacts remain absent.

**Native-build boundary.** This workstation still has no Java runtime, Android SDK
variables, or `android/local.properties`, so no local Gradle result is claimed.
Hosted Android CI, authenticated staging, browser/device acceptance, and any
deployment remain separate human-gated steps. No iOS, Uni, API runtime, migration,
or public progress-page work was touched.

## 2026-08-03 - Private web journal storage recovery coverage

**Summary.** The web journal writer's existing best-effort localStorage wrapper now
has direct coverage for private-mode and quota failures, closing the source-level
private-input recovery gap in the parity matrix.

**Key accomplishments:**
- Added tests proving blocked `getItem`, `setItem`, and `removeItem` calls return
  safe empty/no-op results instead of breaking the writer or submit cleanup.
- The storage suite passes 12 tests; the combined storage and journal-writer check
  passes 42 tests. Web TypeScript, targeted ESLint, and Prettier pass.

**Verification and boundaries.** This is storage/recovery evidence, not proof of a
real private browser or authenticated staging session. No Android/iOS source, API
runtime, migration, deployment, or public progress page was touched. Browser
reload, authenticated staging, and device acceptance remain external gates.

## 2026-08-03 - Private web staging CSP handoff guard

**Summary.** A read-only staging audit found that the live web shell is an older
deployment whose CSP does not allow the staging API REST or WebSocket origins,
despite the parity build already targeting `staging.api.murror.app`.

**Key accomplishments:**
- Added `https://staging.api.murror.app` and
  `wss://staging.api.murror.app` to all five web nginx report-only CSP headers
  in the isolated parity lane.
- Extended `verify-web-staging-contract.mjs` so the staging handoff fails if
  either origin is removed.
- Reconfirmed `WEB_STAGING_CONTRACT_OK`, `WEB_CLIENT_CONTRACT_OK`, JavaScript
  syntax, `git diff --check`, and both isolated workspace guards.

**Current boundary.** Unauthenticated staging API live/ready health returns 200,
but hosted Swagger candidates return 404. The live web shell returns 200 and is
stamped July 28, so the source fix is not a deployment claim. No staging dispatch,
image publication, runtime, migration, iOS checkout, Uni work, or public investor
page was touched.

## 2026-08-03 - Private staging schema drift guard

**Summary.** Staging image/build workflows could previously skip OpenAPI
regeneration when `MURROR_API_OPENAPI_URL` was unset. The web and Android staging
paths now fail closed before building in that case, while PR, development, and
alpha paths retain their existing optional behavior.

**Key accomplishments:**
- Added a hosted-schema prerequisite to the web one-off image build, web staging
  deploy build, and Android manual staging workflow.
- Added workflow-contract assertions for the guard, its environment variable,
  and ordering before client generation.
- Pinned the staging API origin in both workflows: web requires
  `https://staging.api.murror.app/api`, while Android requires the bare
  `https://staging.api.murror.app` host; production/development URLs are rejected.
- Validation passes: web staging/client contracts, Android staging/client
  contracts, YAML-aware workflow contracts, i18n synchronization, copy lint,
  syntax, and diff checks.
- Mounted the Android dependency mirror only for validation and removed it again;
  no `node_modules`, `android/local.properties`, Watchman cookie, build output,
  dispatch, or deployment remains in the lane.
- Audited native-capability fallbacks: the focused web run passes 5 files and 43
  tests covering speech unsupported/prefix/error paths, Web Share/clipboard
  cancellation and failure, OneSignal gating, and notification controls.
- Confirmed the API source intentionally excludes internet-facing staging from
  its Swagger allowlist; the `404` must be resolved through a reviewed protected
  or versioned schema source, not by bypassing the privacy gate.

**Current boundary.** The live staging API health endpoints respond 200, but the
hosted Swagger candidates respond 404. This guard is therefore a deliberate
staging prerequisite, not evidence that hosted regeneration or runtime parity is
complete. No iOS checkout, Uni work, API runtime, migration, or public investor
page was touched.

## 2026-08-03 - Private Android generated-route provenance guard

**Summary.** The Android generator now protects the shared-memory comment and
private-report routes that the existing hand-written `SharedPhotosApiClient` already
uses. This closes a cross-platform contract-check gap without treating a newer dev
schema as staging truth.

**Key accomplishments:**

- Added required generator route groups for
  `/v1/connections/{id}/memories/{pid}/comments` and
  `/v1/connections/{id}/memories/{pid}/report`, matching web's generator guard.
- Extended the Android client verifier to check both generator routes and the
  existing shared-memory client call sites.
- Confirmed a temporary dev-schema generation contains
  `SharedPhotosController_addComment_v1`, `SharedPhotosController_reportMemory_v1`,
  `MemoryCommentDto`, and the report DTOs. The candidate was deleted after
  inspection and was not copied into the Android declaration.
- `ANDROID_CLIENT_CONTRACT_OK`, `ANDROID_STAGING_CONTRACT_OK`, workflow contracts,
  the shared-photos transport suite (2 tests), syntax checks, and `git diff --check`
  pass. The Android parity gate now runs 15 suites and 67 tests.

**Current boundary.** The checked-in Android generated declaration still predates
these two routes. Staging Swagger remains intentionally private and returns `404`,
so regeneration is gated on a reviewed/versioned or protected schema source. No
staging dispatch, deployment, API runtime, migration, iOS checkout, web lane, or
public investor page was touched. The temporary dependency mirror was removed and
the Android worktree has no `node_modules` artifact.

## 2026-08-03 - Read-only staging route presence probe

**Summary.** The scoped web/Android API routes were probed against live staging
without credentials. Auth guards rejected every request, including the newly aligned
shared-memory mutations, so the routes are deployed without exposing account data.

**Evidence:**

- `401`: Memory Room index/summary, Emotional Growth, voice-summary, takeaways,
  relationship reflection, Together member leave, shared-memory comments, and
  shared-memory reports.
- No scoped route returned `404`; this confirms route presence and authentication
  protection, not authenticated response shapes or client/runtime parity.
- Staging health remains `200`, while staging OpenAPI JSON remains intentionally
  unavailable at `404`. No staging data or deployment state was changed by the
  probes.

## 2026-08-04 - Private parity resume and internal tracker

**Summary.** The isolated Murror Android/web parity effort resumed after the iOS
lane pause against `origin/staging-environment-setup` at `b1fc6af0`. A private HTML tracker now records verified-local work separately from
runtime and release gates; the investor-facing page was not changed.

**Key accomplishments:**

- Ported the current staging English-only launch behavior to Android: both i18n
  initialization paths are pinned to `en-US`, the settings language row is hidden,
  and the existing catalogs/routes remain recoverable for a future relaunch.
- Added the Android true-photo-shape behavior from the refreshed mobile staging
  trunk: decoded FastImage dimensions drive a bounded aspect ratio, the square
  fallback remains safe before measurement, and the ratio resets between memories.
- Ported the refreshed Home Moments first-load fix without touching the shared
  `InsightCard`: a pure resolver supplies each card's known resting position until
  Reanimated reports a live value. Its focused resolver suite passes 3 tests;
  Android TypeScript and targeted ESLint also pass (two existing inline-style
  warnings only).
- Added focused Android coverage for landscape, portrait, square, panorama, tall,
  invalid, non-finite, reopen, and close/reopen cases. The two focused suites pass
  50 tests.
- Added a fail-closed web English-only launch flag. Web i18n, profile sync, REST
  language parameters, settings, Docker, the local build helper, one-off staging
  build, and staging deploy workflow all carry the explicit flag; staging refuses
  to build unless `WEB_CLIENT__VITE_ENGLISH_ONLY_LAUNCH=true` is present.
- `WEB_STAGING_CONTRACT_OK`, `WEB_CLIENT_CONTRACT_OK`,
  `ANDROID_STAGING_CONTRACT_OK`, `ANDROID_CLIENT_CONTRACT_OK`, and both diff checks
  pass. Temporary Android dependencies, Watchman cookies, and the failed web pnpm
  install were moved to dated recoverable Trash; the pre-existing web symlink was
  restored exactly.

**Current boundary.** A focused web language-section runtime test passes 5/5 after
using a controlled offline dependency link; the original broken symlink was restored
and the temporary tree was moved to dated Trash. This is not full browser or
authenticated staging proof. No iOS checkout, Uni folder, API runtime, migration,
staging dispatch, image publication, deployment, or public investor page was touched.
Authenticated staging, hosted schema, web browser, Android Gradle/device, and human
release gates remain open.

## 2026-08-04 - Five fixes were in the wrong file, and we finally proved it

**Summary.** The iOS lane spent the day on build 413/414 device feedback and on
two bugs that had each survived several previous attempts. In both cases the code
being changed was real and correct, and simply was not the code running. Measuring
the device, rather than reasoning about the source, is what ended both.

**Key accomplishments:**

- Proved the recurring "Moment to Care card overlap" lives in the pinned rail
  (`pinned-compact-feed-card.tsx`), not in `moment-to-care.tsx`. Five consecutive
  fixes had been written into a different rail that deliberately mirrors the first
  one, which is why unit tests and a mutation test all passed while the device never
  changed. Card height was the discriminator: 140pt measured against the screenshot
  matches the pinned rail exactly, while the other rail computes to 480pt on the
  same device.
- Established from build 414 telemetry that the overlap was never a geometry error.
  Stride, measured slot, face and gap all came back correct, so the cards were being
  painted before the carousel assigned their offsets. The rail now waits for the
  viewport to measure before mounting, and a same-height placeholder keeps Home from
  jumping.
- Found why connection prompts named the wrong person and used the wrong pronoun.
  The mobile app was sending the connection all along, and the API was discarding it
  silently: a global validation pipe configured to strip undeclared fields without
  raising an error. Reflection prompts are now scoped to the connection they are
  about, and the deletion of a user's prompt pool is scoped with them, which had been
  wide enough to wipe another connection's prompts.
- Fixed account deletion failing on shared photos the user had already soft deleted.
  The repair is on the purge side, because relaxing the verifier instead would have
  left the personal data in place.
- Split the hard paywall kill switch per environment, so staging and production can
  no longer read each other's flag value.
- Shipped build 414 to TestFlight and confirmed it on device.

**Continuation the same evening.** The "Settings shows Premium while the content is
locked" report was root caused. RevenueCat does still entitle the account, so the
stored INACTIVE status is wrong rather than correct. The writer is a second, unguarded
copy of the negative subscription self heal that is reached from the transfer webhook
path. An earlier fix had hardened the other copy of the same logic and had already
been deployed more than three hours before the bad row was written, which is why it
could not have helped. Production carries none of these rows.

**Current boundary.** No subscription fix has been written; the direction is waiting
on an explicit decision. The build 414 feedback branch is open as a pull request with
formatting repaired and is not merged, so build 415 has not been cut. The Notion
engineering log row could not be written because that connector is disconnected. The
two proposed connection insight shapes are specified only, and the production funnel
behind them shows the takeaway flow has been used four times in total, which suggests
connection formation is the more valuable question.

## 2026-08-14..16 — Launch observability sprint (Claude lane)

- MurrorMobile #1104/#1105/#1106 merged (canonical af8db1d8): crash reports made symbolicatable
  (frames+mechanism preserved, murror org destination pinned fail-closed, per-event tag scope),
  Relationship Next Steps fails closed (its API 404s everywhere), and Codex's full iOS release
  pipeline landed with android.yaml de-noised (no scripts/ci trigger, cancel-in-progress).
- murror-api #766-#769 merged to staging + #770 backported to main; alpha verified live by pod roll
  (0.129.3-alpha). notification-window 500 (every user, every cold start) degrades; Prisma 5xx reach
  Sentry with transport-proven PII scrubbing (error+transaction+breadcrumb channels); dead
  notification-window queue removed; P2003 now 400.
- Sentry org scrubbing ON (was fully off; live 1.0.19 stored real emails+UUIDs).
- Login hang root-caused BY EXECUTION: circular account fence; three terminal paths incl. plain
  logout; email-path only; hidden by a spec that mocks the fence. Fix in flight on
  fix/account-fence-resume-on-terminal-paths.
- Topology corrections: api production deploys ONLY from the `production` branch (659/52 divergence
  vs main; dispatch on main silently skips all jobs); prod=SGP1, alpha+staging=SFO2.
- Docs: docs/plans/2026-08-16-launch-observability-sprint.md; continuation prompt in
  Logs/2026-08-16-launch-continuation-prompt.md. (This section intentionally left uncommitted; file
  carries other lanes' pending hunks.)

## 2026-08-16 — Login fence closed, onboarding loop closed, build 434 (Claude lane)

- **Canonical is `efa4bc04` at build 434.** `verify-build-lane.sh` returns
  `BUILD LANE OK, safe to archive build 434`. Six PRs merged: #1106 release hardening,
  #1107 and #1108 the account fence, #1109 build 433, #1110 the onboarding loop,
  #1111 build 434.
- **Login hang: five paths, not three.** #1107 closed isolation failure, provider-bind
  rollback and plain logout. #1108 closed a bare `SIGNED_OUT` with no logout fence
  (token expiry, server revocation) and the account-deletion wipe. Two of the six
  findings across four review rounds were regressions the fixes themselves introduced:
  a fail-open sign-out (Supabase resolves with an error rather than throwing) and a
  fix that skipped itself (cleanup rethrows before the release line).
- **Simulator-verified on build 433.** An email account that previously hung signed in.
  First execution-level evidence for these paths. Still NOT device-verified; simulator
  StoreKit cannot bind RevenueCat and that binding gates sign-in.
- **Onboarding closed loop, found by running the login fix.** Email-authenticated users
  with incomplete onboarding restarted onboarding with no explanation, lost all 24
  answers, and landed on a sign-up screen offering only Google and Apple, while already
  authenticated. **634 production users are in that state**, and the login fix would have
  shipped the trap to all of them. Root cause was duplication drift: the signup gate read
  a profile where it should have read a session. Fixed in #1110; the shared helper was
  lifted to `src/common/settle-within.ts` rather than copied a third time.
- **CI cost: zero hosted macOS minutes and zero Android minutes across all eight pushes.**
- **Correction to the 08-14..16 section above:** the "659/52 divergence vs main" figure is
  wrong. Measured against the branch that matters, production is 7 ahead and 16 behind
  staging. The wrong number was also relayed twice to a peer session before being checked.
- **Correction:** the Sentry claim that ~1,008 events leak user emails was wrong.
  `has:user.email` matches events whose email is `[Filtered]`. Email IS scrubbed; `user.id`
  and city-level geo are the real exposure and need their own rules.
- **Verified this session, no action needed:** the OTA hot-fix channel is wired and
  registers against 2.0.0 (prod head is v5, disabled by design; delivery proven on staging).
  Production transactional email is fully built and wired on the production branch but
  `RESEND_API_KEY` is absent from the production GitHub environment, absent from
  `murror-api-secret`, and unset in the running pod, so it silently no-ops.
- Docs: `docs/plans/2026-08-16-login-fence-and-onboarding-recovery.md`.
  Launch board artifact `18706bde-ace5-4d13-b820-38d8dc69e0cd`.
  (This section intentionally left uncommitted; the file carries other lanes' pending hunks.)

## 2026-08-29 — First production account deletion, end to end (Claude lane)

**Summary.** Drove the first real account-deletion request through the production
pipeline (test account `vinhspiration@gmail.com`, request `4eec11a5`). Nine incident
classes surfaced; seven were code bugs, fixed and promoted across five production
deploys (rev 20 to rev 25). The destructive chain executed successfully at 11:10Z:
`purge-legacy-data` affected 64, `purge-user-data` affected 9, `deleteUser` fired.
The account is deleted.

**Key accomplishments.**
- `#843` storage purge verified via `list()` after proving in-pod that `download()` of a
  missing object returns HTTP 400 wrapped as an opaque `StorageUnknownError`, not 404.
- `#845` Mixpanel GDPR v3.0 `results` parsed as an object with `task_id`. The old spec
  mocked an array of `tracking_id` and stayed green while every production deletion threw.
- `#847` **rejected by review and closed.** Its wrapup predicate was valid SQL matching
  0 of 744 production rows, and `verifyVectorData` reuses the same predicate, so it would
  have certified a false clean. The real parent is `public.deep_chat` (744/744).
- `#848` legacy purge FK ordering: `message_reactions` and `cbt_message_reactions` were
  ordered after their message parents (NO ACTION), and `milestones` was never in the
  registry at all despite carrying its own `user_id`. Pre-delete children by parent-message
  linkage plus wrapup via `public.deep_chat`, all before the loop reaches those parents.
- `#850` diagnosability sweep: all 23 remaining plain `throw new Error(...)` on the
  deletion path became `DeletionOperationalError` or `DeletionSchemaError`, vendor polls
  wrapped with `?token=` redaction, structural spec pins zero plain throws.

**Operating notes.**
- `verify-and-receipt` is FAILED-but-retrying on the vendors' async GDPR queues
  (Mixpanel task `146b9b16`, PostHog person `90b4c425`). `processDueRequests` re-selects
  FAILED requests with no attempt cap, so it completes on its own. Not a bug.
- Every promotion verified by effect (rollout revision, image sha, `change-cause`), never
  by the workflow conclusion.
- A plan-clean EXPLAIN proves a query is valid, not that it reaches rows. Data-touching
  predicates need a measured matched-count probe with a stated denominator.
- Mutation testing needs a positive control that the mutation actually applied: a
  prettier-wrapped throw silently no-opped a single-line perl pattern and the "pass" was
  measured against unmutated code.

**Docs:** `docs/plans/2026-08-29-production-account-deletion-smoke-test.md`.

---

## 2026-09-01 — Artwork alerting, birth-time UTC, and the 2.0.0 pre-submit checks

**Summary.** Four PRs merged: the production artwork RLS policy finally has a repo
file, birth time is stored as UTC, and artwork that never finishes generating is
now both detected hourly and pollable over HTTP. Plus a full 2.0.0 pre-submit
sweep against the live App Store Connect API. Nothing was submitted.

**Key accomplishments.**
- murror-backend [#910](https://github.com/Murror/murror-backend/pull/910) (`d322b443`) records ledger version `20260829013703`, the
  users-bucket folder-read policy applied direct to production on 08-29. Named with
  the exact ledger version so `db push` skips it on prod and staging converges.
- murror-api [#866](https://github.com/Murror/murror-api/pull/866) (`d0b21e74`) stores birth time as UTC. Recovered from an
  uncommitted 2026-07-09 edit that was one `git stash` from being lost.
- murror-api [#875](https://github.com/Murror/murror-api/pull/875) (`93654c8d`) hourly job detecting COMPLETED conversations stuck
  at `statusArtworkUrl = PENDING`.
- murror-api [#876](https://github.com/Murror/murror-api/pull/876) (`39a30d46`) the same condition on `/health/monitoring`.
- App Store Connect: `en-US` subtitle patched to "AI that brings people closer",
  matching `vi` and the Night Watch brand line.

**Operating notes.**
- **Per-row beats rate-based at this volume.** Production completes ~1 conversation
  a day. A percentage alert is noise: on a three row day, one failure reads as 33%.
- **A schema DEFAULT is not a fault signal.** `statusArtworkUrl` defaults to
  PENDING, so DRAFT (780 rows) and ACTIVE (36) are legitimately PENDING forever.
  Alerting on raw PENDING would have fired on 1,330 rows and been muted day one.
- **Sentry is deliberately neutered for metrics.** `beforeSend` replaces
  `event.message` with `<redacted>`, deletes `tags`/`fingerprint`, and rebuilds
  `event.extra` from an HTTP-only allowlist. A `captureMessage` with counts arrives
  empty. Do not widen that surface for a health metric.
- **Data-quality checks must never touch the k8s probes.** `/health` and
  `/health/ready` drive liveness/readiness; a stuck-artwork signal there would
  restart pods over a problem no restart fixes. `/health/monitoring` is the home.
- **A value assertion cannot catch a timezone bug on a UTC runner.** Assert object
  IDENTITY instead. `process.env.TZ` set inside a test does not move `Date`; V8
  caches the zone at process start (measured).
- **Read the branch before trusting a checkout.** A whole "dead code pointing at a
  missing bucket" finding evaporated on inspection: it was only true on the stale
  branch the shared `murror-api` checkout is pinned to. No code was changed.
- CI's privacy log guard correctly rejected interpolating `error.message` into a
  log line; a Prisma failure quotes the failing SQL with literals inlined.

**2.0.0 status.** Build 452 attached and VALID, export compliance answered,
metadata clear. Still open: the App Privacy questionnaire (not exposed by the ASC
API, web UI only) and device testing. `PrivacyInfo.xcprivacy` declares
`NSPrivacyCollectedDataTypes` as an **empty array**, which is untrue. The app
requests no ATT at all, so earlier notes listing an "ATT prompt" to test are wrong.

**Docs:** `docs/plans/2026-09-01-artwork-alerting-birth-time-and-presubmit.md`.
