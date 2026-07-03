# Murror Progress

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
