# QA257 sprint: streak redesign, journal/AI-chat unification, build 258 (2026-07-01 evening)

Continuation of `2026-07-01-single-build-lane-ai-chat-memory-challenge-v1-card-audit.md` (through build 257). This doc covers Astro's build-257 QA feedback sprint (8 items), the streak UX redesign, the explore-deeper perspective fix deploy, and the journal/AI-chat parity cleanup mandate - all consolidated into build 258 plus staging deploys.

## Explore-deeper perspective fix (viasr #553, deployed)

Beta report: reflect-deeper questions served TO a user were written from her partner's perspective about her. Root cause: `insight_deeper` anchored perspective on profile names; both users had EMPTY names in `user_profiles`, so the LLM latched onto the only name in the insight text, and both name-based repair mechanisms no-op on empty strings. Fix: perspective-neutral reader-first-person prompt contract (reader = "I/me", other person = "them/they"/"our connection", NEVER "your partner" per Astro - connections include friends/family - and never a name copied from the insight), one generated set for both users (deleted the fragile second name-swap LLM call), plus a name-leak guard. Verified with live generations across 3 relationship types. Deployed and pod-verified.

Follow-ups flagged: murror-api discards user2's translated suggestion copy on ingest (mixed-language pairs risk); staging onboarding leaves empty profile names.

## QA257 feedback sprint (8 items from Astro's build-257 QA)

1. **Thinking-step indicator clash** - the dynamic status line now renders THROUGH the existing `GradientTextLoading` shimmer (single-element array = no cycling); one indicator, one style; byte-identical fallback when no frames arrive.
2. **Continue-this-chat button** - moved inside the chat-reflections summary card as its footer action, filled primary style (`type="solid"`; note: no `primary` type exists in MUButton's union).
3. **Challenge CTA mismatch + card disappeared** - three findings: (a) the card never left the DB (status ACTIVE); the paginated `/insights` endpoint simply never fetched challenges (only `/latest` did) - fixed by adding the challenge embed + DTO field to the list path; (b) the Journal CTA was the correct pre-deploy `reflect` fallback (card predated challenge-v1 by 26h); (c) BONUS: all four expiry crons fired at the top of the hour simultaneously and exhausted the 9-connection pool (P2024) - the challenge expiry had NEVER completed. Staggered to :05/:12/:19/:26.
4. **Onboarding profile drop-off** - benefits line on the profile step + "used for your zodiac reading with your connection. Optional." under birth time (en/vi/ja; "Optional." verified accurate against validation).
5. **Streak broken** (the big one) - see below.
6. **Bedtime story not daily** - the QA248 cohort fix was live and working; the 3:30 UTC cron simply fires before evening-PST users reflect (Astro's chats landed 19 minutes after it). Fixed event-driven: the on-demand generation (previously milestone-gated) now fires on the FIRST reflection of each day; the nightly cron gets a 30h UTC-anchored rolling window as backstop; the "reflection ready" push fires once per day (findUnique pre-check seam - VoiceSummary has no updatedAt, so create-vs-update cannot be distinguished natively).
7. **Memory-add notification** - already existed (PRs #494/#495 from a parallel session); the genuine gap was burst suppression. Built Redis `SET NX EX` suppression, 10-min window, fail-open at both layers. Review caught a direction bug: the key lacked the sender, so Alice's add suppressed Bob's opposite-direction push to Alice - fixed by keying per (connection, sender), regression-locked.
8. **Glass buttons** - primary = dark glass blur, secondary = white glass (existing BlurView pattern reused, no new deps; low-tier/Android fall back to solid translucent). Review caught that the glass repainted caller-overridden white buttons (7 sites incl. the sign-in screen) - fixed with an override-respect guard (backgroundColor prop, style backgroundColor, AND textColor deviations all opt out).

## Streak redesign (P1 fix + P2 UX, Astro-approved)

**P1 (the reported bug):** the mobile calendar bucketed streak days by raw `createdAt` converted to device-local time, ignoring the backend's canonical `streakDay`, and a lossy fallback fabricated an empty wrap-up object when a tap could not re-match its row (rendering the generic guide). Fixed across all five read paths (`getStreakDateKey`); backend already exposed `streakDay` (no change needed - verified in the deployed pod before touching).

**P2 (product, per Astro's direction + panel recs):**
- Current-run progress with a PROGRESS BAR under the section subtext ("Day 3 of 7"), no new deps.
- Two butterfly assets already existed (white = earned, gold = goal) - the bug was placement: the goal butterfly could land on "today" mid-run; now strictly-future upcoming milestone day only, earned only on wrapped days.
- **Rest-day grace** (shared contract, backend + mobile in lockstep): a run survives EXACTLY one missing day (renders as a soft "resting" cell); 2+ breaks it; rest days never increment counts. Backend grace lives in the single `countConsecutiveDaysBefore` walk.
- **Invitation-style evening nudge** extending the existing `StreakReminderScheduler`: "A quiet moment tonight keeps your {n}-day rhythm going." No loss/reset language; heavy-mood-day suppression BEFORE the once-per-day claim; quiet hours; Statsig-gated (flip for staging testing).
- Review must-fix caught by execution: a run broken as of today still displayed its old length ("Day 3 of 3" for a 10-day-old run) - zeroed; and a resting-yesterday run wrongly projected as a fresh start - aligned to the grace gate.
- Renames: streak section -> "Connection Streak" (+ keeping-streak subtext), journal section -> "History" (+ insights-space subtext), Diary page title + tab -> "History" (en/vi/ja).

## Journal/AI-chat unification (Astro mandate: "we no longer separate the two, clean this up")

A 5-lens parity audit swept all 3 repos. 8 genuine violations fixed (+ the twins unified); several asymmetries ruled LEGIT by Astro and pinned in memory (notably: a chat joins History at COMPLETION, not creation - correct by design).

- **murror-api #539**: deep-chat artwork-ready push (new `DEEP_CHAT_ARTWORK_READY` pattern, quiet-hours/retry/DLQ twin of the journal handler, additionalData `{type: 'deep_chat_artwork_generated', conversation_id}`); chat keywords -> `User.recentInterests` sync; reflection-prompt rotation on chat completion (wired, dormant until viasr generates journaling questions - see follow-up); **streak twin use-cases unified** into an abstract `RecordReflectionStreakUseCase` (-127 lines, class names/DI/call sites untouched, BOTH original spec files byte-unchanged and passing as the behavior lock).
- **viasr #554**: weekly themes ingest BOTH journals and deep_chat keywords; callback-ping eligibility counts combined reflections (7 journals + 20 chats now passes the 8-threshold; 7+0 still blocks); notification LLM reads the newest of both summaries; deep-chat completion now carries `journaling` + `language` (forwarder pattern mirroring the journal producer - which itself generates nothing).
- **MurrorMobile #513**: the QA248 grounding fallback finally applied to the chat side (`conversation-detail-screen` now uses `sectionGrounding` like `journal-detail-screen`); copy unified ("History", "Creating reflection", reflect-framed onboarding line); the `deep_chat_artwork_generated` push routing branch (mirrors `memory_callback` -> ConversationDetailScreen).

**Key follow-up (chip task_73dd67d2):** the deep-chat wrapup does not GENERATE journaling questions (its structured output is title/summary/keywords only), so chat prompt-rotation ships wired but dormant. Lighting it up = a prompt/structured-output change requiring an eval run + compassion review.

## Build 258 (single lane)

6 mobile branches merged in the review-simulated order (PRs #508-#513: ai-chat-ui -> glass-buttons -> onboarding-copy -> streak-read-path -> streak-p2-ui -> jdc-parity; zero conflicts, tsc green on the composed tree, hot files spot-verified byte-identical to branch tips), bump PR #514, archived from canonical `e969d99`, `CFBundleVersion=258`, EXPORT SUCCEEDED ~23:32 PDT.

## Verification summary

| What | Evidence |
|---|---|
| Perspective fix | Live generations pass no-name/first-person/no-label checks; deployed prompt verified in pod (no {partner_name} placeholder) |
| Bedtime timing | saveResult.created gate + 30h window specs; once-per-day push spec (3 same-day reflections = 1 push) |
| Challenge feed parity | list-path embed spec; expiry cron stagger asserts |
| Streak grace | 101/101 streak specs (backend); 17/17 contract scenarios executed directly (mobile, jest env broken); both sides verified against the shared contract independently by the reviewer |
| Twin unification | Original spec files git-diff-empty AND passing (32 tests); DI module zero-diff |
| Memory suppression | Opposite-direction regression test (Alice+Bob both fire); same-sender burst collapsed |
| Full murror-api suite | 1482 passed / 0 failed on the parity branch |
| viasr parity | 219-224 tests passing across affected suites; ruff clean; zero prompt changes (no eval trigger) |
| Mobile 6-way merge | Zero conflicts; final tree tsc exit 0; locales parse |
| Build 258 | Archived from canonical, uploaded, EXPORT SUCCEEDED |

## Gotchas / lessons

- **A daily cron that snapshots at a fixed clock time will always miss activity created after that time on the same day** - the bedtime bug survived its first "fix" because #543 fixed WHO the cron considers, not WHEN it looks. Event-driven generation + a rolling-window backstop is the durable shape.
- **Suppression keys need the full identity of what they deduplicate.** The memory burst key without the sender collapsed two DIFFERENT recipients' notifications into one window.
- **Restyle guards must respect caller overrides.** An app-wide component restyle that keys only on type/state repaints intentionally-customized call sites; the opt-out must cover every override channel (props AND style AND text color).
- **Cross-check "already fixed" claims against the OTHER surface.** The QA248 grounding fix was verified on the journal screen and silently never applied to the chat screen - exactly the class of gap the journal==AI-chat rule now treats as a bug.
- **The twins pattern is how parity debt accrues**: every streak fix this sprint had to be hand-applied to two identical files before they were unified. Unify with the original specs as a byte-unchanged behavior lock.
- Four hourly crons firing at :00 inside cluster-lock transactions exhausted a 9-connection pool - stagger cron minutes by default.
