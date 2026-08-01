# Murror Progress

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
