# Single build lane, AI Chat memory, Challenge v1, full card audit (2026-07-01, cont.)

Continuation of `2026-07-01-card-system-hardening-and-curation.md` (which covers through build 252). This doc covers everything shipped after that: the build 253 collision fix, the single build lane rule, AI Chat cross-session memory, Challenge v1's adaptive completion CTA, a full FOR US / Moments-to-Care card flow audit with a P0 data-integrity fix, P1/P2 card hygiene, the "Smarter AI" program (thinking-status, connection-aware intelligence, care-ping safety), and a live perspective bug fix. Five TestFlight builds shipped today (252 through 257, minus a collision).

## Reflection-card min_items bug + AI text truncation (viasr #547)

Beta tester (beta@murror.app) hit an "unexpected error" reflection card and mid-word-truncated AI replies. Root-caused via a 3-agent panel (cortex/muse/iris), not one shared cause:
- **The card error**: `RelationshipQuestionsUserInfoRequest.prevQuestionAnswers` had `min_items=3`. Users with 1-2 prior answers (not 0, not 3+) got a pydantic 422 -> murror-api 500 -> the alert, and every retap re-failed (21x/24h on one connection, confirmed live). Fixed by dropping the floor (accept 0-36).
- **The truncation**: deep-chat `MAX_TOKENS=800` with no `stop_reason` check; a cap-hit ended the reply mid-word. Raised caps (800->1024, reflection-card 256->512) + `_trim_dangling_partial_word` on the stored reply.
- Mobile defense-in-depth: `onStart` shows a gentle `REFLECTION_NOT_READY` message instead of a silent no-op or the generic error (en/vi/ja).
- PR #547 merged + deployed to staging, proven live: deployed pod's pydantic schema now accepts items=1/2 (was 422), still rejects 37.

## Single build lane + build 253 collision -> build 254

**The collision**: build 253 was archived off-repo on another machine and never pushed; `origin/staging-environment-setup` was still at 251 without the challenge-card fix, so the live TestFlight 253 lacked it entirely.

**The fix**: created `build/252` off canonical, cherry-picked the challenge fix + Home-poll perf, bumped to **254** (leapfrogging the phantom 253), merged via PR #497.

**The durable cure**: `scripts/ios-next-build.sh` — computes the next build number as `max(canonical, local) + 1` across the pbxproj (24 targets) + all 4 app Info.plists, warns if the working tree isn't canonical content. Documented in `MurrorMobile/CLAUDE.md` as the "single build lane": every TestFlight build lands on `staging-environment-setup` first, one coordinated build per bump, never archive off a personal branch. Also written into the web `HANDOFF.md` as the cross-session protocol. PR #498.

## AI Chat cross-session memory + resume (build 255)

Shipped a 3-repo "pre-fetch spine" feature: murror-api reads cheap already-stored memory (summaries + salience) and hands viasr a pre-rendered, capped prose string in the request; viasr injects it and skips its own slow (200ms-timeout) inline retrieval.

- **murror-api #529**: `MemoryContext` port + repository (3 recent summaries + salient memories, capped 1200 chars), forwarded as `memory_context` form field, byte-identical when absent. New `GET /api/v1/deep-chat/conversations/latest-resumable` (metadata only).
- **viasr #548**: injects `memory_context` into the system prompt (2000-char cap enforced viasr-side), emotional-safety guardrails (present-moment override, hold-lightly, never-invent, never-announce).
- **MurrorMobile #499**: "Continue this chat" resume affordance seeded from history via the existing `useDeepChatHistory` hook; new chats still start blank (3-layer guard verified).
- **Gates**: memory_recall_quality eval 100% (21/21, incl. crisis-never-surfaces); deep_chat regression 90% (1 rate-limited fail, not a real regression). Speed gate: TTFW **1747ms -> 884ms p50** (memory pre-fetch beats the old inline lookup it replaces).
- Build 255 shipped.

## Challenge v1: adaptive completion-mode CTA (build 256)

Astro flagged that every challenge forced a "Journal" CTA even for real-world activities ("cook a meal together" got a journaling prompt). A 4-lens panel (Heart/Prism/North) converged: let the challenge's nature decide its close.

- **Contract**: `completionMode` (`reflect | do_together | do_solo | quick_gesture`) on the viasr-generated suggestion (snake_case `completion_mode`), persisted to the challenge's existing `metadata` column by murror-api, surfaced to mobile as `completionMode` (camelCase). Absent/invalid defaults to `reflect` (today's Journal behavior, zero regression).
- **viasr #549**: classifies each generated challenge's mode (3/4 real generations route away from Journal); a code-level dash sanitizer added after the prompt-only instruction proved insufficient against the model's habit of leaking em/en-dashes.
- **murror-api #530**: `completionMode` VO + metadata persistence; `do_together` challenges complete both participants' rows on a single tap (idempotent); `CHALLENGE_DAY_COMPLETED` broadcast on the Supabase Realtime channel `relationship:{legacyConnectionId}` (mobile's actual transport, not the NestJS Socket.IO gateway).
- **MurrorMobile #501**: adaptive CTA lookup (`reflect`->Journal unchanged; real-world modes -> one-tap "We did it"/"Mark as done"/"Done" with an optional post-tap note/photo, never required); softened progress dots (removed the "unchecked box" empty-dot border, "Day X of Y" -> "X moments shared"); warm copy ("Accept Challenge"->"I'm in", "Challenge Complete!"->"You two shared this").
- Build 256 shipped.

## Full FOR US / Moments-to-Care card flow audit + P0 data-integrity fix

Astro asked for a full audit of both feed surfaces and every card type's mechanics. Dispatched 3 lenses in parallel (iris: mobile tap flows: cortex: backend lifecycles/stuck-states; sentinel: live staging health).

**Headline finding (P0, urgent):** the takeaway reaper shipped this morning (#527, meant to fix ~37% of takeaways "stuck") had **inverted semantics**. On `takeaway_reflections`, `PENDING` means "waiting for the human receiver to reflect back" (healthy waits run to 5.8 days), not a stuck AI job. The reaper was killing every takeaway whose partner hadn't replied within 15 minutes -> 10 staging rows destroyed, each becoming a dead, unactionable card for both users (receiver couldn't complete, sender couldn't poke, no reopen path). The original "stuck" diagnosis had misread the human-wait state.

**P0 fix, PR #531, merged + deployed + verified live:**
- Reaper inverted to scan `COMPLETED + insight_text IS NULL` (the true AI-generation-in-flight window, matching `InsightHealthCheckService`'s pattern), never `PENDING`.
- `get-takeaways` no longer presents `FAILED` as a completed card.
- A data-repair migration restored all 10 wrongly-killed rows to `PENDING` (signature-matched: `FAILED + completed_at NULL + no receiver fields`, which cannot match a genuine AI failure).
- **Proof**: the reaper's very first tick after deploy ran with the 10 restored PENDING rows present and logged "No stuck takeaway reflections found" — the old code would have re-killed them instantly.

**Mobile audit findings (D1-D6):** zero broken taps on either surface. Home is a thinner, deliberately curated subset of FOR US (care tips, reflect-questions, reflect-on-today stay detail-only by design), but two real drifts: Home didn't subscribe to the challenge-completion socket (D2, laggy echo) and rendered a FAILED takeaway as a normal reflect prompt instead of the dismissable failed-card (D5). A full "one shared card builder" unification was evaluated and **rejected** as too risky (7 substantive divergences between the two builders = a de-facto rewrite of the most fragile screen in the app); shipped the targeted D2/D5/D6 fixes plus one small shared pure helper instead.

**Backend audit findings:** every card type that waits on an async AI reply has the same latent-wedge shape, and only the CRI (ConnectionInsight) pipeline had a correct reaper. Rolled the same pattern out to reflection cards, individual reflections, and a genuine journal text-generation stall (found while verifying artwork was NOT actually wedgeable, see below).

## P1 + P2 card hygiene

**P1a (mobile, PR #503)**: Home now renders a FAILED takeaway with the same dismissable card FOR US shows (shared `buildFailedTakeawayCard` helper, byte-identical FOR US output locked by a spec); Home subscribes to `CHALLENGE_DAY_COMPLETED`; the "analyzing" overlay gets a failure exit so a FAILED generation can never strand the card on a spinner.

**P1b (backend, PR #532)**: `ReflectionCardReaperService` (GENERATING > 20min -> FAILED, reuses the existing gateway event) + a from-GENERATING guard so a late duplicate COMPLETED can't clobber a terminal FAILED; `IndividualReflectionReaperService` + a contract fix (the completable-set wrongly included FAILED, letting a duplicate COMPLETED resurrect a correctly-failed, possibly-unsafe insight); a journal text-generation healer with a two-branch fingerprint (summary present + progress=100 + processingCompletedAt set = a lost status write, heal to COMPLETED; anything else = genuinely dead, heal to FAILED) that correctly avoided fabricating 12 staging seed rows into COMPLETED. An artwork reaper was **deliberately not built** after verify-first proved artwork status is written atomically with the summary, so the specified wedge cannot occur; reaping it would have corrupted text-still-generating rows.

**P2 backend (PR #535)**: challenge PENDING-expiry cron (14 days, EXPIRED enum existed but nothing wrote it; 13 rows stuck 19+ days); `do_together` completion made atomic (was two sequential un-transacted creates); song + place invite expiry mirroring movie's pattern; `SONG_INVITE_ACCEPTED`/`CANCELLED` realtime broadcasts (song had none, movie/place did); a song takeawayId create variant for parity. Care-tip column divergence (`careTipsPaused` vs `enable_notification`) investigated and found benign (no care-tip push task exists to diverge) - zero code changed.

**P2 mobile (PR #504)**: onError handling added to 4 previously-silent mutations (quiz answer, takeaway share, task completion, challenge accept/complete) with per-call-site toast/log judgment to avoid double-firing or false alarms on a working retry; song invite creation wired (the create path never existed on any client, confirmed across 4 repos); blank question chips filtered; Home's blank-takeaway-row guard ported from FOR US; dead maps/listen taps now toast.

## Smarter AI program: thinking-status, connection-aware intelligence, care-ping safety

A separate session TDD-built and independently reviewed 7 branches; this session merged, deployed in the required order, ran the gates, and cut the consolidated TestFlight build.

- **Thinking steps** (murror-api #533, viasr #550, mobile #505): warm status lines during AI Chat compose ("Reading what you have shared before..."). Crisis turns emit zero status frames (traced: the crisis early-return precedes the first status yield in both the murror-api controller and viasr's `stream_chat.execute()`). Kill switch `DEEP_CHAT_STATUS_EVENTS_ENABLED` defaults ON. Deploy order enforced: murror-api's frame-drop guard had to be live before viasr started emitting, so an older adapter could never pass an unknown frame into visible chat text.
- **Connection-aware intelligence** (murror-api #534, viasr #551): care tips, connection insights, reflection cards, and MTC AI Chat now receive privacy-gated relationship context (viewer-owned data only; partner mood only when that partner's own shareLevel permits; crisis/deleted excluded; byte-identical when absent). **Review caught a real gap before merge**: the care-tips crisis-exclusion filter dropped negative emotions only at intensity >= 8 with null coalesced to 0, so "suicidal" at intensity <=7 or with a null intensity passed the filter. Fixed same-day: crisis-class emotion names now drop at any intensity including null; ordinary negatives drop on null intensity (unknown is not safe).
- **Care-ping safety** (viasr #552): memory pings never surface pure-heavy memories; suppressed entirely on a day the recipient logged a heavy-care mood ("one calm touch per day"); LLM ping copy hardened against urgency drift. LLM-copy feature flags stay OFF by default.
- **Gates, all passed**: crisis turns emit zero status frames (live SSE-verified) and keep their 988/crisis-resource text; evals 100% on journal_completion and memory_recall_quality, crisis_detection 119/120 (the 1 miss was an API rate-limit, not a true failure); TTFW showed high variance (1928-6418ms) consistent with live-API latency at that hour, not a code regression, with the floor matching this morning's no-regression baseline.
- **Merge-order note**: #533 and #534 both touched `deep-chat.controller.ts` with conflicting spec assertions about argument position; resolved by merging #533 first and rebasing #534 (reconciling the memory spec's `args.length - 1` -> `-2` assertions), the same fix repeated for the mobile #503/#504/#505/#506 stack via a verified conflict-free 4-way merge simulation before merging for real.
- Consolidated into **build 257** alongside all card-hygiene work (#503/#504 + #505/#506), the largest single-build payload of the day.

## Live perspective bug (viasr PR #553, in flight)

Beta tester (Khanh) reported the "Explore deeper" reflect-question sheet asked questions written from the WRONG person's perspective ("How can I show Khanh that I truly value our connection?" served TO Khanh). Root cause: `insight_deeper` service resolves partner names from legacy `user_profiles`; both users on the affected connection had empty names there, so the LLM anchored perspective on the only name visible in the source insight text (the reader's own name, mentioned in third person), and both existing repair mechanisms silently no-op on an empty name string.

**Fix**: rewrote the prompt to be perspective-neutral and reader-first-person by contract ("I/me", the other person is "them/they" / "our connection", never "your partner" per Astro's correction that connections include friends and family, never a personal name copied from the insight text even when one is available). One generated set now serves both users identically (deleted the fragile second-LLM-call name-swap rewrite entirely - also a latency/cost win). A name-leak guard swaps any generated line containing a known profile name for a warm fallback as a backstop. Verified with live model samples across 3 relationship types (lover, friend, family), all passing perspective/no-name/no-romantic-label checks. Awaiting merge/deploy sign-off.

## Verification summary

| What | Evidence |
|---|---|
| Reflection-card + truncation fix | Deployed pydantic schema accepts items=1/2 live; 0 new 422/500s since deploy |
| Single build lane | `ios-next-build.sh` `--dry-run` computed 255 (later 5x more for 256/257) correctly on canonical each time |
| AI Chat memory | memory_recall_quality 100% (21/21); TTFW 1747ms -> 884ms p50 |
| Challenge v1 | 3/4 real generations route away from Journal; dash-sanitizer 0 leaks; `do_together` atomic upsert |
| P0 reaper fix | 10/10 rows restored to PENDING; reaper's next tick left them untouched, logged clean |
| P1/P2 hygiene | murror-api full jest 1365/1365 (P2 batch), 30-38 tests per reaper PR; mobile tsc green on every PR + the 4-way merge simulation |
| Smarter AI | crisis = 0 status frames (SSE-verified); evals 100%/100%/119-120 (rate-limit); care-tips crisis-proxy gap fixed pre-merge |
| Build 257 | Archived + `EXPORT SUCCEEDED`, uploaded to TestFlight |

## Gotchas / lessons

- **Verify state semantics before writing any reaper.** The takeaway reaper inversion (P0) came from treating a human-wait state (PENDING) as a stuck-job state. The lesson was then applied prospectively twice in the same session: cortex refused to build the specified artwork reaper after proving the wedge couldn't occur (would have reaped text-still-generating rows), and refused to heal 12 seed rows into COMPLETED without a precise atomic-write fingerprint.
- **A shared builder is not always the fix for surface drift.** Evaluated unifying Home's and FOR US's card-building logic; rejected as a de-facto rewrite given 7 substantive divergences. Fixed the 2 real drifts with a minimal shared helper instead.
- **Two predicted merge conflicts both materialized exactly as expected** (deep-chat controller argument order across #533/#534; the connections module provider list across #532/#535) and resolved cleanly because the review pass had already flagged them.
- **"Your partner" is the wrong neutral term** for the general "other person in a connection" reference, in UI copy or AI prompts - connections include friends, siblings, and family. Use "your connection" as the noun, "them/they" within a sentence. Pinned as a durable copy rule.
- **Mobile's real-time transport is Supabase Realtime, not the NestJS Socket.IO gateway** - a broadcast wired only to the latter is invisible to the app; confirmed by tracing the existing movie-invite-accept precedent before wiring the challenge-completion and song-invite events.
