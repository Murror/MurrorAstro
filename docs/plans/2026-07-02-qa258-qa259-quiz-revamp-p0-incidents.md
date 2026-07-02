# QA258 + QA259 sprints, quiz revamp, two P0 incidents (2026-07-02)

Continuation of `2026-07-01-qa257-sprint-streak-redesign-journal-chat-parity.md` (through build 258). This doc covers Astro's build-258 QA (7 items, shipped in build 259), Astro's build-259 QA (5 items) plus a full quiz-experience revamp (shipped in build 260), and two same-day P0 incidents (LLM fallback chain collapse, staging web-auth ES256 break).

## QA258 (7 items, shipped in build 259)

Feedback on build 258: glass buttons looked bad, streak title inconsistency, unscalable persona chips, rough bottomsheet, mismatched history image, non-educational progress bar, mismatched connections + button.

1. **Glass buttons reverted** - byte-identical revert to the pre-glass `mu-button.tsx` (SHA256-verified). The glass restyle from QA257 didn't land well in practice; reverting is sometimes the right call.
2. **"Connection Streak" everywhere** - found the actually-missed title surface (`reflection.streakCardTitle`, rendered on both Home and the Reflection tab; the Vietnamese was "Chuỗi ngày hạnh phúc" / "Happy day streak" - worse than a literal miss) + added a benefit-framed subtext.
3. **Persona chips removed** from insight-detail-page card titles in both journal and chat screens (unification rule), keeping the `GroundingBlock` teaching block (separate prop, not removed).
4. **Bottomsheet reworked** - the eye-icon privacy sheet's sub-page transition changed from `SlideInRight` (horizontal slide) to `LinearTransition` (expand-in-place), matching the app's other sheets. Respects the T12 launch-sprint animation rule (not query-gated).
5. **History story-card image parity** - traced both Home and History to the same `bedtimeBackgroundForDate(createdAt)` source; History was rendering a hardcoded gradient with no image at all.
6. **Educational progress-bar description** added, accurate to the shipped grace rule (1 rest day, resets on the 2nd miss).
7. **Connections + button** restyled to match the add-memory-photo + button exactly.

Reviewed clean (3-way merge sim, zero conflicts, tsc green), merged as PRs #515-517, build 259 archived and uploaded.

## Two P0 incidents (same day, both resolved)

### LLM fallback chain collapse (viasr #555)
Beta users (Stella, Astro) hit "I'm having trouble responding" on every AI generation, plus general slowness. Root cause, a 4-rung cascade: Claude returned HTTP 200 with an empty tool_use (max_tokens=512 too small for the EmotionExtractionResponse schema, truncated mid-tool-call) -> OpenAI fallback was skipped because `check_whether_openai_operational` errored on a renamed status-page component and failed CLOSED, disabling a healthy provider -> Groq circuit was transiently open (self-healing, red herring) -> Gemini disabled by design -> dead end, canned fallback text failed JSON validation everywhere. External trigger (OpenAI renamed a status component), started ~08:41 UTC.

Fix: the status-page check is now advisory-only (fail-open on any error or unmatched component; still detects a REAL matched outage); Claude requests capture `stop_reason` and retry once at 4x token budget (clamped 2048-8192) on truncation; extractor budget 512->1024. 16 regression tests. Deployed, stale cache cleared, logs confirmed clean post-deploy.

### Staging web-auth break (murror-backend #895/#896)
Same investigation surfaced Stella's "can't upload avatar" report was actually two unrelated bugs. Root cause 1 (bigger): the rebuilt staging Supabase project (`sprkxmwrvgqgebajopwp`) signs JWTs with ES256; the platform relay (the gateway in front of every Edge Function, configured via `verify_jwt` at deploy time) rejects ES256 before requests reach our own middleware - which already validates both algorithms fine. This broke ALL web/beta auth, not just avatar upload. Fixed by deploying with `--no-verify-jwt` (audited: all 28 deployable functions self-authenticate in-code - 21 protected via middleware, 5 service via API key, 2 intentionally public - so bypassing the relay check opens no door) + persisting the flag in `reusableDeploy.yaml` so the next merge doesn't silently regress it. Root cause 2 (mobile-only): avatar upload sends the raw HEIC MIME label from iOS camera photos; the backend allowlist lacks `image/heic`. Fixed by reusing the memory-photo path's `normalizePhotoForUpload` (bytes were already re-encoded JPEG via `quality: 0.8`; only the label lied).

## QA259 (5 items + quiz revamp, shipped in build 260)

1. **CR pending-card cache fix** - the T13 relationship-detail-bundle migration left 3 mutation hooks (`use-create-takeaway-card`, `use-delete-takeaway`, `use-create-journal`) invalidating only the legacy `TAKEAWAY_CARDS_QUERY_KEY`; the bundle query has its own key with a 5-min staleTime and no refetch-on-focus. Sender submitted a Connection Reflection, saw nothing, resubmitted - DB evidence: 4 duplicate PENDING rows from one sender in 50 minutes. Fixed by invalidating both keys.
2. **Read-full quote** - the receiver's shared-reflection quote (both the visible and pending card variants) now expands in place on tap, with a "Read more/less" hint that only appears when the text actually overflows.
3. **Share confirmation** (genuinely new, never existed) - completing a reflection opened from a connection's detail screen used to fire the share signal immediately with no ask. Now a calm confirm ("Share this reflection with {name}?" / Not now) gates it; dismissing defaults to private.
4. **Quiz revamp** (the big one) - investigation found the backend always generated 3 grounded multiple-choice questions per quiz, but mobile discarded questions 2 and 3 and routed the first into the same free-text screen as a regular reflection, which is why the quiz looked and felt identical to a reflect card. Rebuilt: quiz is now its own feed card (cyan "Quiz" badge, dark glass panel, progress dots only when N>1) that opens an in-chat quiz experience - all 3 questions stacked at once, tap-to-answer chips, the free-text composer hidden entirely, one submission when all are answered. Uses the pre-existing, separate `/questions` + `/answers` endpoints, so the LOG/QUIZ streak-alternation cycle is completely untouched. A cycle-freeze bug was caught and fixed during the build: the reflect card now always opens free-text (even on QUIZ days) and must pass the connection's REAL `currentTaskType` to task-completion, not the old `journalPrompt ? LOG : QUIZ` proxy (which would have frozen the alternation at QUIZ forever).
5. **Quiz grounding** - both sides shipped. murror-api now sends each user's last-5 journal + last-5 AI-chat summaries and top-5 salient EIM memories in the generate-questions payload, gated by share level (private users: the stores aren't even queried, not just filtered) and crisis-filtered at the database query itself. viasr folds the grounding into the existing recent-summaries prompt slot rather than adding a new placeholder, so the prompt is BYTE-IDENTICAL to before when a user has no groundable content (proven via `git diff` + render tests) - grounded questions reference themes/feelings, never quote raw text.
6. **relationship_type mislabel fix** - a connection-insight payload was sending the task type ("LOG"/"QUIZ") in the field viasr's prompt expects to hold the actual relationship kind (lover/family/friend/colleague). Fixed with an additive `task_type` field so nothing else breaks.
7. **Explore-deeper voice flip** - reverses yesterday's (#553) deliberate first-person "I" choice per Astro's direction: the reader is now always addressed as "you/your"; the other person stays "them/they/your connection". All #553 safety guards preserved (no names, no relationship labels, one question set for both users).
8. **Reflection-card pronoun fix** - shared-card text was misgendering (a screenshot showed "he" used for a woman). Root cause: pronoun resolved from possibly-stale `user_profiles.gender` with no `pronoun`-field-first check, plus a latent unbound-variable crash when the profile row was missing. Fixed pronoun-first (mirrors the existing `relationship_reflection` helper), gender-when-known, they/them otherwise, crash guarded.
9. **Mobile avatar HEIC fix** - see incident section above.

## Verification

Every mobile/backend branch went through the same discipline as prior sprints: independent build agents, a dedicated review pass (SHIP/BLOCK with file:line evidence), and a merge simulation before the real merge. Two notable review findings this round:
- The murror-api grounding privacy test asserts the private user's DB tables are **never queried**, not just filtered post-fetch (defense in depth).
- The mobile merge chain had one real conflict: `fix/qa259-cr-states` and `feat/qa259-quiz-experience` both rewrote the same block of `add-log-screen.tsx`. The review agent proved both intents could compose (the share-confirm gates WHETHER the task-completion signal fires; the quiz-experience change controls WHAT type is sent) and handed back the exact resolution, which was applied verbatim during the real merge.

Because the eval harness (`evals/runner.py`) turns out to not execute the `insight_deeper` suite at all (non-recursive fixture glob + an unhandled suite name - a pre-existing gap, now chipped as a follow-up), both AI-voice changes were validated the same way #553 was: contract-level unit tests (25/25 passing) plus live adversarial generations against the deployed staging pod post-deploy (planted names in the insight text to try to trigger the name-leak, romantic-bait phrasing to try to trigger a relationship label, an empty profile row to try to trigger the crash). All held. One fluency nit surfaced ("When them shares...", them-as-subject) that satisfies every safety rule but reads awkwardly - logged for a future prompt-polish pass, not a blocker.

## Verification summary

| What | Evidence |
|---|---|
| LLM fallback fix | Fail-open matched a live re-fetched OpenAI status payload; retry-on-truncation unit tests; 139 regression tests pass, 3 pre-existing failures proven unrelated by reverting the diff and re-running |
| ES256 auth fix | All 28 deployable edge functions traced to their own in-code auth (21 middleware, 5 API-key, 2 intentionally public); local middleware test matrix 6/6; live post-deploy: no-token still 401 (from our own middleware, proving the relay stepped aside and auth still enforced) |
| Avatar HEIC | tsc + eslint clean; reused existing normalizer, no new logic |
| CR states (pending card, read-full, share confirm) | tsc + eslint green each commit |
| Quiz mobile | Cycle-safety trace verified against the backend alternation logic directly; tsc green |
| Quiz grounding (murror-api) | 1493 tests pass; privacy short-circuit + crisis filter both proven at the query level |
| Quiz grounding (viasr) | Contract cross-checked field-for-field against the producer DTO; prompt byte-identity proven via empty git diff; 86 tests pass |
| Voice + pronoun (viasr) | 25 contract tests; live spot-check with adversarial cases (name-leak bait, romantic-bait, empty-row crash) all passed |
| Mobile merge chain | 1 real conflict (add-log-screen.tsx), resolved per the review's exact recipe, composed tree tsc green |
| Build 259 | Archived + uploaded, ~01:56 PDT |
| Build 260 | Archived + uploaded, ~11:55 PDT |

## Gotchas / lessons

- **Query-key migrations must sweep every mutation hook that invalidates the old key**, not just the screens that read the new one. T13's bundle migration missed 3 hooks; the tell was a DB fingerprint (4 duplicate submissions in 50 minutes from one user).
- **A platform-level relay/gateway auth check can reject a request before your own code ever runs.** Fixing your middleware does nothing if the infrastructure in front of it enforces a stricter, stale rule (here: `verify_jwt` accepting only HS256 while the rebuilt Supabase project signs ES256). Always check what's in front of your code, not just your code.
- **Provider status-page health checks must fail open.** A renamed component on a third-party status page should never be able to disable a healthy provider; the real API call is the only authoritative check.
- **HTTP 200 + empty structured output = token-budget truncation**, not a real empty response. Capture `stop_reason` on every structured LLM call.
- **When two branches touch the same function for different reasons, prove the two behaviors compose** (not just that the diff merges) before trusting a real merge - the share-confirm/quiz-cycle conflict here needed a semantic argument, not just conflict-marker removal.
- **An eval harness with a silent coverage gap is worse than no harness** - it looked authoritative but never actually graded these suites. Verify what a "mandatory" gate actually executes before trusting a green run (or, here, before trusting the absence of a run).
